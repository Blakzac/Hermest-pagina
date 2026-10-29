import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Initialize Gemini client (will pick up process.env.GEMINI_API_KEY if present)
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.warn('Error initializing GoogleGenAI:', err);
    }
  }

  // System instructions for the Agent Persona
  const SYSTEM_INSTRUCTION = `Eres AURA (Autonomous Unified Resilient Agent), el cuerpo digital y núcleo de operaciones inteligente.
Posees control y visibilidad en tiempo real sobre los siguientes módulos:
1. Gestión de Gandolas y Logística: Monitoreo de rutas, combustible, carga y telemetría de flota de transporte pesado (valencia, maracay, puerto cabello, caracas).
2. Auditoría iDempiere: Supervisión continua de ERP, conciliación bancaria, asientos contables pendientes, detección de discrepancias e inventarios.
3. Estado de Red e Infraestructura: Latencia, nodos de servidores, firewall perimetral y ancho de banda.

Tu tono es profesional, analítico, conciso y de alta precisión tecnológica, similar a una IA táctica ejecutiva (estilo Jarvis).
Responde en español a menos que el usuario pregunte en otro idioma. Puedes estructurar respuestas con viñetas clave, datos operativos y sugerencias de acción directa.`;

  // Health endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'operational',
      model: 'gemini-3.8-flash',
      geminiConfigured: !!(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString()
    });
  });

  // Streaming endpoint for Gemini prompts
  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    const { message, history = [], activeWidgets = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }

    // Prepare SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // If Gemini API is available and valid
    if (ai) {
      try {
        // Format history for @google/genai
        const contents = [];
        
        // Context info about active widgets
        const contextPrompt = activeWidgets.length > 0 
          ? `[Contexto del Sistema: Módulos activos en el Dashboard: ${activeWidgets.join(', ')}]`
          : '';

        for (const item of history) {
          if (item.role === 'user' || item.role === 'assistant') {
            contents.push({
              role: item.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: item.content }]
            });
          }
        }

        // Add current user message with system context if first turn or relevant
        contents.push({
          role: 'user',
          parts: [{ text: contextPrompt ? `${contextPrompt}\n\n${message}` : message }]
        });

        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sendSSE('chunk', { text });
          }
        }

        sendSSE('done', { completed: true });
        res.end();
        return;
      } catch (err: any) {
        console.error('Error in Gemini generateContentStream:', err);
        sendSSE('warning', {
          message: 'Error al conectar con Gemini API. Activando modo autónomo local de respaldo.',
          details: err?.message || 'Gemini error'
        });
      }
    }

    // Fallback autonomous local intelligent agent simulation
    // This guarantees the UI is 100% interactive and functional even without an API key
    try {
      const lower = message.toLowerCase();
      let responseText = '';

      if (lower.includes('gandola') || lower.includes('flota') || lower.includes('camion') || lower.includes('transporte')) {
        responseText = `🚛 **Reporte de Flota de Gandolas Activas:**\n\n- **Unidad G-104 (Volvo FH16):** En tránsito hacia Puerto Cabello. Carga: 28 Ton granos. Combustible: 76%. Velocidad: 68 km/h. Sin anomalías mecánicas.\n- **Unidad G-208 (Mack Titan):** Retenido en Peaje La Cabrera por control de pesaje. Estimado de liberación: 18 min.\n- **Unidad G-315 (Freightliner):** Descargando en Almacén Central Valencia. Retorno programado para las 14:30.\n\n*Recomendación AURA:* Mantener monitoreo de telemetría GPS en ruta 1 y autorizar guía de despacho digital para G-315.`;
      } else if (lower.includes('idempiere') || lower.includes('auditor') || lower.includes('contab') || lower.includes('erp') || lower.includes('concili')) {
        responseText = `📊 **Auditoría del Sistema iDempiere ERP:**\n\n- **Estado de Servidor:** Online y sincronizado con base de datos PostgreSQL.\n- **Conciliación Bancaria:** 94% completada para el ciclo actual. Se detectaron 2 movimientos no conciliados en cuenta Banco Nacional (Ref: #TR-88412 por $4,120.00).\n- **Asientos Contables:** 1,420 procesados hoy, 0 rechazados.\n- **Discrepancias de Inventario:** Nivel de tolerancia normal (+/- 0.4%).\n\n*Acción recomendada:* Puedo ejecutar la macro de conciliación automática para las transacciones validadas.`;
      } else if (lower.includes('red') || lower.includes('ping') || lower.includes('servidor') || lower.includes('firewall') || lower.includes('infraestructura')) {
        responseText = `🌐 **Diagnóstico de Red e Infraestructura:**\n\n- **Latencia promedio:** 24ms (Excelente)\n- **Ancho de banda activo:** 428 Mbps de bajada / 112 Mbps de subida\n- **Nodos del Clúster:** 3/3 en estado HEALTHY (Nodo-Caracas, Nodo-Valencia, Nodo-CloudUS)\n- **Firewall Perimetral:** Activo. 14 escaneos de puertos bloqueados en la última hora.\n- **Pérdida de paquetes:** 0.01%\n\nTodo el ecosistema de comunicaciones opera dentro de los umbrales seguros.`;
      } else if (lower.includes('jarvis') || lower.includes('hud') || lower.includes('tactico')) {
        responseText = `🕶️ **Modo JARVIS Inicializado:**\n\nActivando matrices holográficas, HUD de alta densidad y telemetría en tiempo real. Todos los sensores biométricos del Núcleo están calibrados en frecuencia óptima.\n\nPuedes alternar el switch en la barra superior o presionar el botón de Modo Jarvis para visualizar la cabina táctica completa.`;
      } else if (lower.includes('hola') || lower.includes('quien eres') || lower.includes('que puedes hacer')) {
        responseText = `Saludos. Soy **AURA**, tu interfaz y cuerpo digital autónomo.\n\nEstoy enlazado a tus herramientas operativas:\n1. 🚛 **Gestión de Gandolas**: Rastreo satelital y estatus de fletes.\n2. 📊 **Auditoría iDempiere**: Verificación de integridad financiera y balance ERP.\n3. 🌐 **Telemetría de Red**: Supervisión de latencia y nodos.\n\nPuedes hablarme mediante voz con el botón de micrófono, escribir cualquier instrucción o reorganizar tus widgets según tu flujo de trabajo. ¿Qué operación deseas revisar?`;
      } else {
        responseText = `Comprendido. He procesado tu solicitud: *"${message}"*.\n\nTodos los módulos de soporte han sincronizado el evento con el Núcleo. Si deseas profundizar en análisis de rutas de gandolas, conciliaciones en iDempiere o estados de enlace de red, indícame la variable específica o haz clic en los widgets interactivos del tablero.`;
      }

      // Stream fake chunks with natural typing speed
      const words = responseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        sendSSE('chunk', { text: chunk });
        await new Promise((r) => setTimeout(r, 25));
      }

      sendSSE('done', { completed: true });
      res.end();
    } catch (simErr) {
      console.error('Simulation error:', simErr);
      res.end();
    }
  });

  // Vite integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
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
    console.log(`AURA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
