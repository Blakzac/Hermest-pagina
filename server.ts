import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ChatRole = 'user' | 'assistant' | 'system';
type HermesTransport = 'http' | 'process' | 'gemini' | 'local';
type InputMode = 'text' | 'voice';
type SSESender = (event: string, data: Record<string, unknown>) => void;

interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

interface HermesRequestBody {
  message?: unknown;
  history?: unknown;
  sessionId?: unknown;
  inputMode?: unknown;
}

const HERMES_AGENT_URL = process.env.HERMES_AGENT_URL?.trim();
const HERMES_AGENT_API_KEY = process.env.HERMES_AGENT_API_KEY?.trim();
const HERMES_AGENT_COMMAND = process.env.HERMES_AGENT_COMMAND?.trim();
const HERMES_AGENT_TIMEOUT_MS = Math.max(
  5_000,
  Number.parseInt(process.env.HERMES_AGENT_TIMEOUT_MS || '120000', 10) || 120_000,
);
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '');
}

/**
 * Extracts the useful text from the many response shapes Hermes Agent or an
 * OpenAI-compatible upstream may return.
 */
function extractUpstreamText(value: unknown, depth = 0): string {
  if (depth > 5 || value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => extractUpstreamText(item, depth + 1)).join('');
  }
  if (typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const priorityKeys = [
    'text',
    'token',
    'delta',
    'content',
    'response',
    'reply',
    'answer',
    'output',
    'result',
    'message',
    'data',
    'choices',
  ];

  for (const key of priorityKeys) {
    if (key in record) {
      const extracted = extractUpstreamText(record[key], depth + 1);
      if (extracted) return extracted;
    }
  }

  return '';
}

function parseUpstreamSSEBlock(block: string): string {
  const dataLines: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return '';

  const payload = dataLines.join('\n');
  if (payload === '[DONE]') return '';

  try {
    return extractUpstreamText(JSON.parse(payload));
  } catch {
    return payload;
  }
}

async function streamFromHermesHttp(
  message: string,
  history: ChatHistoryItem[],
  sessionId: string,
  inputMode: InputMode,
  sendSSE: SSESender,
  signal: AbortSignal,
): Promise<boolean> {
  if (!HERMES_AGENT_URL) return false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream, application/json, text/plain',
  };

  if (HERMES_AGENT_API_KEY) {
    headers.Authorization = `Bearer ${HERMES_AGENT_API_KEY}`;
  }

  if (process.env.HERMES_AGENT_HEADERS) {
    try {
      const extraHeaders = JSON.parse(process.env.HERMES_AGENT_HEADERS);
      if (extraHeaders && typeof extraHeaders === 'object' && !Array.isArray(extraHeaders)) {
        Object.assign(headers, extraHeaders);
      }
    } catch (error) {
      console.warn('HERMES_AGENT_HEADERS no es un JSON válido:', error);
    }
  }

  const upstream = await fetch(HERMES_AGENT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history,
      sessionId,
      inputMode,
      source: 'hermes-command-center',
    }),
    signal,
  });

  if (!upstream.ok) {
    const details = (await upstream.text().catch(() => '')).slice(0, 600);
    sendSSE('warning', {
      message: `Hermes Agent respondió con estado HTTP ${upstream.status}.`,
      details: details || upstream.statusText,
    });
    return false;
  }

  if (!upstream.body) {
    sendSSE('warning', {
      message: 'Hermes Agent devolvió una respuesta vacía.',
    });
    return false;
  }

  const contentType = upstream.headers.get('content-type') || '';
  let emitted = false;

  const emit = (text: string) => {
    const clean = stripAnsi(text);
    if (!clean) return;
    emitted = true;
    sendSSE('chunk', { text: clean });
  };

  if (contentType.includes('application/json')) {
    const raw = await upstream.text();
    try {
      const parsed = JSON.parse(raw);
      emit(extractUpstreamText(parsed) || raw);
    } catch {
      emit(raw);
    }
    return emitted;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  if (contentType.includes('text/event-stream')) {
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        emit(parseUpstreamSSEBlock(block));
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      emit(parseUpstreamSSEBlock(buffer));
    }
  } else {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      emit(decoder.decode(value, { stream: true }));
    }
    emit(decoder.decode());
  }

  return emitted;
}

function streamFromHermesProcess(
  message: string,
  sessionId: string,
  inputMode: InputMode,
  sendSSE: SSESender,
  signal: AbortSignal,
): Promise<boolean> {
  if (!HERMES_AGENT_COMMAND) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let emitted = false;
    let stderrBuffer = '';

    const child = spawn(HERMES_AGENT_COMMAND, {
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        HERMES_MESSAGE: message,
        HERMES_SESSION_ID: sessionId,
        HERMES_INPUT_MODE: inputMode,
      },
    });

    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', handleAbort);
      resolve(success && emitted);
    };

    const handleAbort = () => {
      if (settled) return;
      child.kill();
      finish(false);
    };

    const timeout = setTimeout(() => {
      if (settled) return;
      if (!emitted) {
        sendSSE('warning', {
          message: 'El proceso de Hermes Agent excedió el tiempo máximo de respuesta.',
        });
      }
      child.kill();
      finish(false);
    }, HERMES_AGENT_TIMEOUT_MS);

    signal.addEventListener('abort', handleAbort, { once: true });

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    child.stdout?.on('data', (chunk: string) => {
      const text = stripAnsi(chunk);
      if (!text) return;
      emitted = true;
      sendSSE('chunk', { text });
    });

    child.stderr?.on('data', (chunk: string) => {
      stderrBuffer = (stderrBuffer + chunk).slice(-4_000);
    });

    child.on('error', (error) => {
      sendSSE('warning', {
        message: 'No se pudo iniciar el proceso de Hermes Agent.',
        details: error.message,
      });
      finish(false);
    });

    child.on('close', (code) => {
      if (code !== 0 && code !== null && !emitted) {
        sendSSE('warning', {
          message: `El proceso de Hermes Agent finalizó con código ${code}.`,
          details: stderrBuffer.trim() || undefined,
        });
      }
      finish(code === 0);
    });

    child.stdin?.on('error', () => {
      // The process may not read stdin. The message is still available through
      // HERMES_MESSAGE, so this error is safe to ignore.
    });
    child.stdin?.write(`${message}\n`);
    child.stdin?.end();
  });
}

async function streamFromGemini(
  message: string,
  history: ChatHistoryItem[],
  sendSSE: SSESender,
  ai: GoogleGenAI | null,
): Promise<boolean> {
  if (!ai) return false;

  try {
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const item of history) {
      if ((item.role === 'user' || item.role === 'assistant') && item.content.trim()) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction:
          'Eres Hermes Agent, el agente operativo del centro de mando. Responde de forma directa, técnica y concisa en el idioma del operador. No inventes datos operativos ni afirmes tener acceso a sistemas que no estén conectados.',
        temperature: 0.6,
        maxOutputTokens: 2048,
      },
    });

    let emitted = false;

    for await (const chunk of responseStream) {
      if (chunk.text) {
        emitted = true;
        sendSSE('chunk', { text: chunk.text });
      }
    }

    return emitted;
  } catch (error: any) {
    console.error('Error in Gemini fallback:', error);
    sendSSE('warning', {
      message: 'El fallback Gemini no está disponible.',
      details: error?.message || 'Gemini error',
    });
    return false;
  }
}

function buildLocalReply(message: string, transport: HermesTransport): string {
  const normalized = message.toLowerCase();
  const configHint =
    'Para enlazar el proceso real configura `HERMES_AGENT_URL` (API/SSE) o `HERMES_AGENT_COMMAND` (CLI) en el servidor.';

  if (normalized.includes('ayuda') || normalized.includes('help') || normalized.includes('comando')) {
    return [
      '**Hermes Agent · Centro de mando**',
      '',
      'Puedes enviarme texto o dictar instrucciones con el micrófono. Las respuestas se transmiten en vivo por SSE.',
      '',
      '**Integraciones disponibles**',
      `- Transporte activo: \`${transport}\``,
      '- API/SSE: define `HERMES_AGENT_URL`.',
      '- Proceso local: define `HERMES_AGENT_COMMAND` (recibe el mensaje por stdin y `HERMES_MESSAGE`).',
      '- Fallback opcional: `GEMINI_API_KEY`.',
      '',
      configHint,
    ].join('\n');
  }

  if (normalized.includes('estado') || normalized.includes('status') || normalized.includes('salud')) {
    return [
      '**Estado del enlace**',
      '',
      `- Transporte activo: \`${transport}\``,
      `- Hora del servidor: ${new Date().toLocaleString('es-VE')}`,
      '- Interfaz de voz: Web Speech API del navegador.',
      '- Canal de respuesta: Server-Sent Events (SSE).',
      '',
      configHint,
    ].join('\n');
  }

  if (normalized.includes('jarvis') || normalized.includes('hud')) {
    return [
      '**Modo HUD**',
      '',
      'El protocolo HUD está disponible desde el botón superior o con `Ctrl+J`. En ese modo la capa táctica muestra la última respuesta del agente y la telemetría del enlace.',
      '',
      'El centro de mando permanece activo en ambos modos.',
    ].join('\n');
  }

  if (normalized.includes('hola') || normalized.includes('quién eres') || normalized.includes('quien eres')) {
    return [
      '**Hermes Agent en línea**',
      '',
      'Soy tu agente operativo. Este centro de mando está preparado para enviar instrucciones por texto o voz a un proceso Hermes externo y mostrar su respuesta en tiempo real.',
      '',
      configHint,
    ].join('\n');
  }

  return [
    '**Hermes Agent · modo local**',
    '',
    `Recibí tu mensaje: *"${message}"*`,
    '',
    `El servidor está operando sin un proceso Hermes conectado (transporte: \`${transport}\`). La interfaz, el canal de voz y el streaming ya están funcionando.`,
    '',
    configHint,
  ].join('\n');
}

async function streamLocalFallback(
  message: string,
  transport: HermesTransport,
  sendSSE: SSESender,
) {
  const response = buildLocalReply(message, transport);
  const parts = response.split(/(\s+)/);

  for (const part of parts) {
    if (!part) continue;
    sendSSE('chunk', { text: part });
    await delay(12);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4000;

  app.use(express.json({ limit: '1mb' }));

  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (error) {
      console.warn('Error initializing GoogleGenAI:', error);
    }
  }

      const resolveTransport = (): HermesTransport => {
    // Si tienes Gemini configurado, lo usamos como opción principal para hablar
    if (ai) return 'gemini';
    // Si no, caemos a local
    return 'local';
  };



  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'operational',
      service: 'hermes-command-center',
      transport: resolveTransport(),
      hermes: {
        configured: Boolean(HERMES_AGENT_URL || HERMES_AGENT_COMMAND),
        httpConfigured: Boolean(HERMES_AGENT_URL),
        processConfigured: Boolean(HERMES_AGENT_COMMAND),
      },
      geminiConfigured: Boolean(ai),
      model: GEMINI_MODEL,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  const handleHermesStream = async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as HermesRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : randomUUID();
    const inputMode: InputMode = body.inputMode === 'voice' ? 'voice' : 'text';

    if (!message) {
      res.status(400).json({ error: 'El campo message es requerido.' });
      return;
    }

    if (message.length > 8_000) {
      res.status(413).json({ error: 'El mensaje excede el límite de 8000 caracteres.' });
      return;
    }

    const history: ChatHistoryItem[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is ChatHistoryItem =>
              Boolean(item) &&
              typeof item === 'object' &&
              ['user', 'assistant', 'system'].includes((item as ChatHistoryItem).role) &&
              typeof (item as ChatHistoryItem).content === 'string' &&
              Boolean((item as ChatHistoryItem).content.trim()),
          )
          .slice(-24)
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 8_000),
          }))
      : [];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendSSE: SSESender = (event, data) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abortController.abort();
    });

    const transport = resolveTransport();
    sendSSE('meta', {
      sessionId,
      transport,
      inputMode,
      timestamp: new Date().toISOString(),
    });

    try {
      let hadOutput = false;

      if (transport === 'http') {
        try {
          hadOutput = await streamFromHermesHttp(
            message,
            history,
            sessionId,
            inputMode,
            sendSSE,
            abortController.signal,
          );
        } catch (error: any) {
          if (abortController.signal.aborted) {
            sendSSE('done', { completed: false, aborted: true });
            res.end();
            return;
          }
          console.error('Hermes HTTP bridge error:', error);
          sendSSE('warning', {
            message: 'No se pudo contactar el endpoint HTTP de Hermes Agent.',
            details: error?.message || 'Error de red',
          });
        }
      } else if (transport === 'process') {
        hadOutput = await streamFromHermesProcess(
          message,
          sessionId,
          inputMode,
          sendSSE,
          abortController.signal,
        );
      } else if (transport === 'gemini') {
        hadOutput = await streamFromGemini(message, history, sendSSE, ai);
      }

      if (!hadOutput && !abortController.signal.aborted) {
        await streamLocalFallback(message, transport, sendSSE);
      }

      sendSSE('done', {
        completed: true,
        transport,
        aborted: abortController.signal.aborted,
      });
    } catch (error: any) {
      console.error('Hermes stream error:', error);
      sendSSE('error', {
        message: 'El enlace con Hermes Agent se interrumpió.',
        details: error?.message || 'Error interno',
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  };

  app.post('/api/hermes/stream', handleHermesStream);

  // Alias legacy: mantiene compatibilidad con clientes anteriores.
  app.post('/api/gemini/stream', handleHermesStream);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hermes Command Center running on http://0.0.0.0:${PORT}`);
    console.log(`Hermes transport: ${resolveTransport()}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});
