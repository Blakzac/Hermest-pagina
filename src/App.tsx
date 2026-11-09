/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentState,
  ChatMessage,
  ConnectionState,
  HermesHealth,
  HermesTransport,
  InputMode,
} from './types';
import { Core } from './components/Core';
import { VoiceAndTextInput } from './components/VoiceAndTextInput';
import { JarvisHUDOverlay } from './components/JarvisHUDOverlay';
import { getHermesHealth, streamHermesMessage } from './lib/hermesClient';
import { Zap, Volume2, VolumeX, Sparkles, Radio, Cpu } from 'lucide-react';
import {
  playBlip,
  playJarvisActivate,
  playSuccessChime,
  setSoundEnabled,
} from './utils/audioSynth';

const createInitialMessages = (): ChatMessage[] => [
  {
    id: `init-${Date.now()}`,
    role: 'assistant',
    content:
      'Enlace directo con Hermes Agent establecido. Puedes escribir una instrucción o dictarla con el micrófono. Las respuestas se transmitirán en tiempo real por SSE.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'complete',
  },
];

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `hermes-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const stateLabel: Record<AgentState, string> = {
  online: 'En línea',
  processing: 'Procesando',
  speaking: 'Transmitiendo',
  idle: 'En espera',
  alert: 'Alerta',
};

const connectionLabel: Record<ConnectionState, string> = {
  checking: 'Conectando',
  online: 'Enlazado',
  offline: 'Sin enlace',
};

export default function App() {
  const [agentState, setAgentState] = useState<AgentState>('online');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isJarvisMode, setIsJarvisMode] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [transport, setTransport] = useState<HermesTransport>('unknown');
  const [health, setHealth] = useState<HermesHealth | null>(null);

  const sessionIdRef = useRef<string>(createSessionId());
  const abortRef = useRef<AbortController | null>(null);

  // Keep the link status in sync with the server.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const checkHealth = async () => {
      try {
        const nextHealth = await getHermesHealth(controller.signal);
        if (cancelled) return;
        setHealth(nextHealth);
        setTransport(nextHealth.transport || 'unknown');
        setConnectionState('online');
      } catch {
        if (cancelled) return;
        setConnectionState('offline');
        setTransport('unknown');
      }
    };

    checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const toggleJarvisMode = useCallback(() => {
    setIsJarvisMode((current) => {
      const next = !current;
      if (next) {
        playJarvisActivate();
      } else {
        playBlip(600, 0.05);
      }
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+J / Cmd+J for Jarvis mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        toggleJarvisMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleJarvisMode]);

  const handleSendMessage = useCallback(
    async (userPrompt: string, mode: InputMode = 'text') => {
      const prompt = userPrompt.trim();
      if (!prompt || isStreaming) return;

      if (prompt.toLowerCase().includes('modo jarvis')) {
        if (!isJarvisMode) toggleJarvisMode();
      }

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const userMessage: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp,
        status: 'complete',
        mode,
      };
      const assistantMessageId = `ast-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp,
        status: 'streaming',
      };

      const history = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .filter((message) => message.content.trim())
        .slice(-20);

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setAgentState('processing');
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let accumulated = '';

      try {
        await streamHermesMessage(
          {
            message: prompt,
            history,
            sessionId: sessionIdRef.current,
            inputMode: mode,
            signal: controller.signal,
          },
          {
            onMeta: (meta) => {
              if (meta.transport) setTransport(meta.transport);
              setConnectionState('online');
            },
            onWarning: (warning) => {
              console.warn('Hermes bridge warning:', warning.message, warning.details || '');
            },
            onChunk: (text) => {
              accumulated += text;
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: accumulated }
                    : message,
                ),
              );
              setAgentState('speaking');
            },
            onDone: (payload) => {
              if (payload.transport) setTransport(payload.transport);
            },
          },
        );

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content:
                    accumulated ||
                    message.content ||
                    'Hermes Agent no devolvió contenido para esta instrucción.',
                  status: 'complete',
                }
              : message,
          ),
        );
        setConnectionState('online');
      } catch (error: any) {
        const aborted = controller.signal.aborted || error?.name === 'AbortError';

        setMessages((current) =>
          current.map((message) => {
            if (message.id !== assistantMessageId) return message;

            if (aborted) {
              return {
                ...message,
                content: accumulated
                  ? `${accumulated}\n\n[Transmisión detenida por el operador]`
                  : '⏹️ Transmisión detenida por el operador.',
                status: 'complete',
              };
            }

            return {
              ...message,
              content: `⚠️ No se pudo completar el enlace con Hermes Agent: ${
                error?.message || 'Error de red'
              }`,
              status: 'error',
            };
          }),
        );

        if (!aborted) setConnectionState('offline');
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        setAgentState('online');
      }
    },
    [isStreaming, isJarvisMode, messages, toggleJarvisMode],
  );

  const handleStopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClearConversation = useCallback(() => {
    abortRef.current?.abort();
    sessionIdRef.current = createSessionId();
    setMessages(createInitialMessages());
    setAgentState('online');
    playSuccessChime();
  }, []);

  const handleToggleSound = () => {
    setSoundActive((current) => {
      const next = !current;
      setSoundEnabled(next);
      if (next) playBlip(1000, 0.05);
      return next;
    });
  };

  return (
    <div
      className={`h-dvh overflow-hidden text-slate-100 relative transition-colors duration-500 ${
        isJarvisMode ? 'bg-[#040813]' : 'bg-[#07090e]'
      }`}
    >
      <JarvisHUDOverlay
        active={isJarvisMode}
        messages={messages}
        agentState={agentState}
        connectionState={connectionState}
        transport={transport}
        sessionId={sessionIdRef.current}
      />

      {/* Top Header / Tactical Navbar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-300 ${
          isJarvisMode
            ? 'bg-[#060c1d]/90 border-cyan-500/40 shadow-[0_4px_25px_rgba(6,182,212,0.15)]'
            : 'bg-[#090d18]/90 border-slate-800'
        }`}
      >
        <div className="max-w-[1480px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Agent identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                isJarvisMode
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Zap className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-ping" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-hud font-black tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span>HERMES</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code font-normal px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">
                    AGENT CORE
                  </span>
                </h1>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 hidden sm:block truncate">
                Centro de mando conversacional directo
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="hidden md:flex items-center gap-3 font-mono-code text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : connectionState === 'offline'
                      ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
                      : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="uppercase text-[11px] font-semibold text-slate-200">
                {connectionLabel[connectionState]}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px]">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-500">Enlace:</span>
              <span className="text-cyan-300 font-semibold uppercase">{transport}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleJarvisMode}
              title="Alternar Modo HUD Jarvis (Atajo: Ctrl+J)"
              className={`px-3 py-2 rounded-xl text-xs font-hud font-bold tracking-wider transition-all flex items-center gap-2 border select-none ${
                isJarvisMode
                  ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isJarvisMode ? 'HUD [ON]' : 'MODO HUD'}
              </span>
            </button>

            <button
              onClick={handleToggleSound}
              title={soundActive ? 'Efectos de sonido activados' : 'Efectos de sonido silenciados'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors"
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main command center */}
      <main className="max-w-[1480px] mx-auto w-full h-[calc(100dvh-4rem)] p-3 lg:p-5 flex flex-col gap-3">
        {/* HUD status strip */}
        <section
          className={`shrink-0 rounded-2xl border px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-all duration-300 ${
            isJarvisMode
              ? 'bg-[#060b18]/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.12)]'
              : 'bg-slate-900/60 border-slate-800 shadow-lg'
          } backdrop-blur-md relative overflow-hidden`}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="flex items-center gap-3 min-w-0 z-10">
            <Core
              compact
              state={agentState}
              onStateChange={setAgentState}
              isJarvisMode={isJarvisMode}
              audioLevel={audioLevel}
              bpm={agentState === 'processing' ? 128 : agentState === 'speaking' ? 95 : 72}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-mono-code text-cyan-400/80 uppercase tracking-widest">
                <Cpu className="w-3.5 h-3.5" />
                <span>Enlace directo Hermes</span>
              </div>
              <p className="text-sm font-hud font-bold text-slate-100 truncate">
                {stateLabel[agentState]}
              </p>
              <p className="text-[11px] font-mono-code text-slate-500 truncate">
                {health?.hermes?.configured
                  ? `Proceso configurado • ${transport}`
                  : `Modo ${transport} • configura HERMES_AGENT_URL o HERMES_AGENT_COMMAND`}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono-code text-slate-500 z-10">
            <div className="flex flex-col items-end">
              <span className="uppercase tracking-widest">Transporte</span>
              <span className="text-cyan-300 font-bold uppercase">{transport}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="uppercase tracking-widest">Sesión</span>
              <span className="text-slate-200 font-bold">
                {sessionIdRef.current.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="uppercase tracking-widest">Operador</span>
              <span className="text-emerald-400 font-bold">LOCAL</span>
            </div>
          </div>
        </section>

        {/* Conversational terminal */}
        <section className="flex-1 min-h-0">
          <VoiceAndTextInput
            messages={messages}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onClearConversation={handleClearConversation}
            agentState={agentState}
            isStreaming={isStreaming}
            isJarvisMode={isJarvisMode}
            connectionState={connectionState}
            transport={transport}
            onAudioLevelChange={setAudioLevel}
          />
        </section>
      </main>
    </div>
  );
}
