import type {
  ChatMessage,
  HermesHealth,
  HermesMeta,
  HermesTransport,
  InputMode,
} from '../types';

export interface StreamHermesOptions {
  message: string;
  history: ChatMessage[];
  sessionId: string;
  inputMode: InputMode;
  signal?: AbortSignal;
}

export interface HermesStreamHandlers {
  onChunk: (text: string) => void;
  onMeta?: (meta: HermesMeta) => void;
  onWarning?: (warning: { message: string; details?: string }) => void;
  onDone?: (payload: { completed?: boolean; aborted?: boolean; transport?: HermesTransport }) => void;
}

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSEBuffer(buffer: string): { events: SSEEvent[]; rest: string } {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() || '';
  const events: SSEEvent[] = [];

  for (const block of blocks) {
    let event = 'message';
    const dataLines: string[] = [];

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) continue;

      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      events.push({ event, data: dataLines.join('\n') });
    }
  }

  return { events, rest };
}

function parseJSON<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Sends one message to the Hermes bridge and consumes the SSE response stream.
 * Returns the complete text received from the agent.
 */
export async function streamHermesMessage(
  options: StreamHermesOptions,
  handlers: HermesStreamHandlers,
): Promise<string> {
  const response = await fetch('/api/hermes/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      message: options.message,
      history: options.history
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({ role: msg.role, content: msg.content })),
      sessionId: options.sessionId,
      inputMode: options.inputMode,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    let details = response.statusText;
    try {
      const body = await response.json();
      details = body?.error || details;
    } catch {
      // Keep the HTTP status text if the body is not JSON.
    }
    throw new Error(`El servidor respondió ${response.status}: ${details}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let finished = false;

  const processEvent = (sseEvent: SSEEvent) => {
    if (sseEvent.event === 'chunk') {
      const payload = parseJSON<{ text?: string }>(sseEvent.data);
      if (payload?.text) {
        accumulated += payload.text;
        handlers.onChunk(payload.text);
      }
      return;
    }

    if (sseEvent.event === 'meta') {
      const payload = parseJSON<HermesMeta>(sseEvent.data);
      if (payload) handlers.onMeta?.(payload);
      return;
    }

    if (sseEvent.event === 'warning') {
      const payload = parseJSON<{ message?: string; details?: string }>(sseEvent.data);
      if (payload) {
        handlers.onWarning?.({
          message: payload.message || 'Advertencia del servidor.',
          details: payload.details,
        });
      }
      return;
    }

    if (sseEvent.event === 'error') {
      const payload = parseJSON<{ message?: string; details?: string }>(sseEvent.data);
      throw new Error(payload?.details || payload?.message || 'Error del agente.');
    }

    if (sseEvent.event === 'done') {
      finished = true;
      const payload =
        parseJSON<{ completed?: boolean; aborted?: boolean; transport?: HermesTransport }>(
          sseEvent.data,
        ) || {};
      handlers.onDone?.(payload);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSSEBuffer(buffer);
    buffer = parsed.rest;

    for (const sseEvent of parsed.events) {
      processEvent(sseEvent);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const parsed = parseSSEBuffer(`${buffer}\n\n`);
    for (const sseEvent of parsed.events) {
      processEvent(sseEvent);
    }
  }

  if (!finished) {
    handlers.onDone?.({ completed: true });
  }

  return accumulated;
}

export async function getHermesHealth(signal?: AbortSignal): Promise<HermesHealth> {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return (await response.json()) as HermesHealth;
}
