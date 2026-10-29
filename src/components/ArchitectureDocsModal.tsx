import React, { useState } from 'react';
import { X, Copy, Check, FileText, Code2, Server, Layout, Sparkles } from 'lucide-react';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isJarvisMode?: boolean;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose,
  isJarvisMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'core' | 'json' | 'api'>('structure');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeSnippets = {
    structure: `Estructura del Proyecto (React + Tailwind + Framer Motion + Express/Next.js):

├── server.ts                       # Backend Express con Vite dev server y Gemini Streaming SSE
├── index.html                      # Punto de entrada HTML con fuentes Orbitron y JetBrains Mono
├── package.json                    # Dependencias (@google/genai, motion, express, lucide-react)
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx                    # Inicialización de React 19
    ├── App.tsx                     # Orquestador del Cuerpo Digital y Dashboard
    ├── index.css                   # Tailwind v4, animaciones HUD y rejilla holográfica
    ├── types/
    │   └── index.ts                # Modelos de datos (AgentState, WidgetConfig, TruckUnit, etc.)
    ├── data/
    │   └── defaultWidgets.ts       # Esquema JSON dinámico de herramientas operativas
    ├── utils/
    │   └── audioSynth.ts           # Sintetizador Web Audio API de efectos sci-fi (sin archivos externos)
    └── components/
        ├── Core.tsx                # 'Núcleo' biométrico con latido/pulso suave y giroscopios
        ├── VoiceAndTextInput.tsx   # Interfaz de voz (Web Speech) y osciloscopio de audio
        ├── JarvisHUDOverlay.tsx    # Capa de realidad aumentada HUD estilo Jarvis
        ├── WidgetCustomizerModal.tsx # Editor dinámico visual y JSON de widgets
        └── widgets/
            ├── WidgetCard.tsx      # Contenedor 'Draggable' y colapsable
            ├── TruckFleetWidget.tsx # Herramienta de 'Gestión de Gandolas y Fletes'
            ├── IdempiereAuditWidget.tsx # Herramienta de 'Auditoría iDempiere ERP'
            ├── NetworkStatusWidget.tsx # Herramienta de 'Estado de Red y Clúster'
            └── TelemetryWidget.tsx # Monitor de subprocesos y telemetría`,

    core: `// Extracto del Componente Core con Animación de Latido/Pulso (Core.tsx)
import { motion } from 'motion/react';

export const CoreHeartbeat = ({ state, bpm = 72 }) => {
  const pulseDuration = state === 'processing' ? 1.0 : state === 'idle' ? 4.5 : (60 / bpm) * 2;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* 1. Aura Bioluminiscente Respirante */}
      <motion.div
        animate={{
          scale: [0.95, 1.15, 0.95],
          opacity: state === 'idle' ? 0.2 : [0.35, 0.7, 0.35],
        }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-2 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
      />

      {/* 2. Anillos Giroscópicos Rotatorios */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-cyan-500/20"
      />

      {/* 3. Onda de Latido Expansiva (Heartbeat Wave) */}
      <motion.div
        animate={{ scale: [0.75, 1.35], opacity: [0.8, 0] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeOut' }}
        className="absolute inset-8 rounded-full border-2 border-cyan-400"
      />

      {/* 4. Esfera Central del Núcleo */}
      <motion.div
        animate={{ scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px]"
      >
        <div className="w-full h-full rounded-full bg-[#070b14] flex flex-col items-center justify-center">
          <span className="text-cyan-400 font-mono text-xs font-bold">{bpm} BPM</span>
        </div>
      </motion.div>
    </div>
  );
};`,

    json: `// Esquema JSON que define los widgets/herramientas de forma dinámica:
[
  {
    "id": "widget-gandolas",
    "title": "Gestión de Gandolas & Carga Pesada",
    "category": "logistics",
    "size": "normal",
    "status": "healthy",
    "enabled": true,
    "order": 1,
    "description": "Monitoreo satelital GPS, consumo de combustible y estatus de fletes en ruta.",
    "refreshIntervalSeconds": 15,
    "data": {
      "totalUnits": 6,
      "units": [
        {
          "code": "G-104",
          "model": "Volvo FH16 Globetrotter",
          "driver": "Carlos Mendoza",
          "origin": "Valencia Central",
          "destination": "Puerto Cabello",
          "cargo": "28 Ton Granos",
          "fuelPct": 78,
          "speedKmh": 68,
          "status": "en_ruta"
        }
      ]
    }
  },
  {
    "id": "widget-idempiere",
    "title": "Auditoría iDempiere ERP",
    "category": "finance",
    "status": "warning",
    "enabled": true,
    "order": 2,
    "data": {
      "erpStatus": "online",
      "reconciledPercentage": 94.6,
      "unreconciledItems": [
        {
          "reference": "TR-88412-BANCARIBE",
          "account": "1.1.10.02 Banco Nacional",
          "amountUsd": 4120.00,
          "anomalyType": "Diferencia Fecha de Valor"
        }
      ]
    }
  },
  {
    "id": "widget-red",
    "title": "Telemetría & Estado de Red",
    "category": "infrastructure",
    "status": "healthy",
    "enabled": true,
    "order": 3,
    "data": {
      "averageLatencyMs": 24,
      "downloadSpeedMbps": 485,
      "packetLossPct": 0.01
    }
  }
]`,

    api: `// Backend API Route para Streaming con Gemini API (@google/genai SDK)
// Compatible con Next.js (app/api/gemini/stream/route.ts) o Express (server.ts)

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({}); // Usa process.env.GEMINI_API_KEY automáticamente

export async function POST(req: Request) {
  const { message, history = [], activeWidgets = [] } = await req.json();

  // Encabezados SSE (Server-Sent Events)
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    try {
      const contents = history.map((item: any) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: \`[Dashboard: \${activeWidgets.join(', ')}]\\n\\n\${message}\` }]
      });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: 'Eres AURA, cuerpo digital y centro de operaciones de IA.',
          temperature: 0.7,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          const sseData = \`event: chunk\\ndata: \${JSON.stringify({ text: chunk.text })}\\n\\n\`;
          await writer.write(encoder.encode(sseData));
        }
      }

      await writer.write(encoder.encode('event: done\\ndata: {"completed":true}\\n\\n'));
    } catch (error) {
      console.error(error);
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}`
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isJarvisMode 
          ? 'bg-[#060b18] border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]' 
          : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-hud font-bold text-slate-100 text-base">
                Arquitectura del Proyecto & Entregables Técnicos
              </h2>
              <span className="text-xs font-mono-code text-slate-400">
                Documentación del Código Solicitado (Next.js / React + Tailwind + Gemini API)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex flex-wrap gap-2 text-xs font-mono-code bg-slate-950/30">
          {[
            { id: 'structure', label: '1. Estructura de Archivos', icon: Layout },
            { id: 'core', label: '2. Código del Núcleo (Pulse)', icon: Sparkles },
            { id: 'json', label: '3. Estructura JSON Widgets', icon: FileText },
            { id: 'api', label: '4. Gemini Streaming API Route', icon: Server },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 font-bold transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 relative bg-[#040711]">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => copyToClipboard(activeTab, codeSnippets[activeTab])}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado al Portapapeles</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          <pre className="font-mono-code text-xs text-cyan-300/90 whitespace-pre overflow-x-auto p-4 rounded-xl bg-black/60 border border-slate-800 leading-relaxed selection:bg-cyan-500 selection:text-black">
            {codeSnippets[activeTab]}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono-code text-slate-400">
          <span>AURA • Autonomous Unified Resilient Agent</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
