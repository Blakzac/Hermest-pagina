/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AgentState, WidgetConfig, ChatMessage 
} from './types';
import { DEFAULT_WIDGETS } from './data/defaultWidgets';
import { Core } from './components/Core';
import { VoiceAndTextInput } from './components/VoiceAndTextInput';
import { WidgetCard } from './components/widgets/WidgetCard';
import { TruckFleetWidget } from './components/widgets/TruckFleetWidget';
import { IdempiereAuditWidget } from './components/widgets/IdempiereAuditWidget';
import { NetworkStatusWidget } from './components/widgets/NetworkStatusWidget';
import { TelemetryWidget } from './components/widgets/TelemetryWidget';
import { JarvisHUDOverlay } from './components/JarvisHUDOverlay';
import { WidgetCustomizerModal } from './components/WidgetCustomizerModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { 
  Shield, Zap, Volume2, VolumeX, Sliders, Code2, 
  Sparkles, RefreshCw, Layers, Terminal 
} from 'lucide-react';
import { 
  playBlip, playJarvisActivate, playSuccessChime, 
  setSoundEnabled, isSoundEnabled 
} from './utils/audioSynth';

export default function App() {
  // Agent core state
  const [agentState, setAgentState] = useState<AgentState>('online');
  const [audioLevel, setAudioLevel] = useState(0);

  // Jarvis HUD mode state
  const [isJarvisMode, setIsJarvisMode] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  // Modals
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Dynamic widgets configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('aura_widgets_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_WIDGETS;
      }
    }
    return DEFAULT_WIDGETS;
  });

  // Drag and drop state for widgets
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  // Chat messages history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `AURA inicializado con éxito. Todos los sistemas están en línea y enlazados a la flota de gandolas, auditoría contable de iDempiere y telemetría de red. ¿Qué instrucción deseas procesar?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'complete',
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sync widgets with localStorage
  const handleSaveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('aura_widgets_config', JSON.stringify(newWidgets));
  };

  const handleResetDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem('aura_widgets_config');
    playSuccessChime();
  };

  // Toggle Jarvis Mode
  const toggleJarvisMode = useCallback(() => {
    const next = !isJarvisMode;
    setIsJarvisMode(next);
    if (next) {
      playJarvisActivate();
    } else {
      playBlip(600, 0.05);
    }
  }, [isJarvisMode]);

  // Keyboard shortcut Ctrl+J / Cmd+J for Jarvis mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleJarvisMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleJarvisMode]);

  // Send message and stream Gemini response
  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isStreaming) return;

    // Check if user specifically requested Jarvis mode in text
    if (userPrompt.toLowerCase().includes('activar modo jarvis') || userPrompt.toLowerCase().includes('modo jarvis')) {
      if (!isJarvisMode) toggleJarvisMode();
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `ast-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'streaming',
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setAgentState('processing');
    setIsStreaming(true);

    try {
      const activeWidgetTitles = widgets.filter(w => w.enabled).map(w => w.title);

      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userPrompt,
          history: messages.slice(-8), // Keep relevant context
          activeWidgets: activeWidgetTitles,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      setAgentState('speaking');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: chunk')) {
            const dataMatch = line.match(/data:\s*(.*)/);
            if (dataMatch) {
              try {
                const parsed = JSON.parse(dataMatch[1]);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore parse errors on malformed chunks
              }
            }
          }
        }
      }

      // Mark message as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, status: 'complete' } : msg
        )
      );
      setAgentState('online');
    } catch (err: any) {
      console.error('Error fetching Gemini response:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `⚠️ Enlace con Núcleo interrumpido: ${err.message || 'Error de red'}. Modo de contingencia activo.`,
                status: 'error',
              }
            : msg
        )
      );
      setAgentState('online');
    } finally {
      setIsStreaming(false);
    }
  };

  // Drag and drop handlers for widget reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetId) return;

    const sourceIndex = widgets.findIndex((w) => w.id === draggedWidgetId);
    const targetIndex = widgets.findIndex((w) => w.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    playBlip(850, 0.04);
    const updated = [...widgets];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    handleSaveWidgets(updated);
    setDraggedWidgetId(null);
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) playBlip(1000, 0.05);
  };

  return (
    <div className={`min-h-screen text-slate-100 relative transition-colors duration-500 ${
      isJarvisMode ? 'bg-[#040813]' : 'bg-[#07090e]'
    }`}>
      {/* Tactical HUD Overlay for Jarvis Mode */}
      <JarvisHUDOverlay active={isJarvisMode} />

      {/* Top Header / Tactical Navbar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-300 ${
        isJarvisMode 
          ? 'bg-[#060c1d]/90 border-cyan-500/40 shadow-[0_4px_25px_rgba(6,182,212,0.15)]' 
          : 'bg-[#090d18]/90 border-slate-800'
      }`}>
        <div className="max-w-[1720px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Agent identity */}
          <div className="flex items-center gap-3">
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
              isJarvisMode
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border-cyan-500/40 text-cyan-400'
            }`}>
              <Zap className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-hud font-black tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span>AURA</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code font-normal px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">
                    CORE v3.8
                  </span>
                </h1>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 hidden sm:block">
                Cuerpo Digital & Centro de Control Autónomo
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="hidden md:flex items-center gap-3 font-mono-code text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${
                agentState === 'online' ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]' :
                agentState === 'processing' ? 'bg-pink-400 animate-spin' :
                agentState === 'speaking' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`} />
              <span className="uppercase text-[11px] font-semibold text-slate-200">
                {agentState}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-500">Gemini:</span>
              <span className="text-emerald-400 font-semibold">3.8 Flash</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Modo Jarvis Switch */}
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
                {isJarvisMode ? 'HUD JARVIS [ON]' : 'MODO JARVIS'}
              </span>
            </button>

            {/* Widgets Customizer */}
            <button
              onClick={() => {
                playBlip(900, 0.04);
                setIsCustomizerOpen(true);
              }}
              title="Personalizar herramientas y esquema JSON"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-mono-code bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Herramientas</span>
            </button>

            {/* Architecture Deliverables */}
            <button
              onClick={() => {
                playBlip(950, 0.04);
                setIsDocsOpen(true);
              }}
              title="Ver arquitectura del proyecto y entregables de código"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-mono-code bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Entregables</span>
            </button>

            {/* Sound Toggle */}
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

      {/* Main Workspace Layout */}
      <main className="max-w-[1720px] mx-auto p-4 lg:p-6 space-y-6">
        {/* Top Grid: Core & Nerve Center + Communication */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Central Núcleo (Core) - Biometric Digital Body */}
          <div className={`lg:col-span-5 rounded-2xl border p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
            isJarvisMode
              ? 'bg-[#060b18]/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.12)]'
              : 'bg-slate-900/60 border-slate-800 shadow-xl'
          } backdrop-blur-md`}>
            {/* Background micro grid */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Header label */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h2 className="font-hud text-xs font-bold uppercase tracking-wider text-slate-300">
                  Núcleo Biométrico del Agente (Core)
                </h2>
              </div>
              <span className="text-[10px] font-mono-code text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                PULSE: BIO-SYNC
              </span>
            </div>

            {/* The Core itself */}
            <div className="my-auto py-4">
              <Core
                state={agentState}
                onStateChange={setAgentState}
                isJarvisMode={isJarvisMode}
                audioLevel={audioLevel}
                bpm={agentState === 'processing' ? 128 : agentState === 'speaking' ? 95 : 72}
              />
            </div>

            {/* Telemetry bottom bar of the Core */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center font-mono-code text-[11px] text-slate-400 z-10">
              <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Carga Sináptica</span>
                <span className="font-bold text-slate-200">
                  {agentState === 'processing' ? '98.2%' : '14.6%'}
                </span>
              </div>
              <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Temperatura</span>
                <span className="font-bold text-cyan-400">38.4 °C</span>
              </div>
              <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Latencia Núcleo</span>
                <span className="font-bold text-emerald-400">12 ms</span>
              </div>
            </div>
          </div>

          {/* Voice & Text Interface (Dual Communication Stream) */}
          <div className="lg:col-span-7 flex flex-col">
            <VoiceAndTextInput
              messages={messages}
              onSendMessage={handleSendMessage}
              agentState={agentState}
              isStreaming={isStreaming}
              isJarvisMode={isJarvisMode}
              onAudioLevelChange={setAudioLevel}
            />
          </div>
        </div>

        {/* Section Divider & Tools Controls */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud font-bold text-sm tracking-wider uppercase text-slate-200">
              Módulos Operativos & Herramientas Especializadas
            </h2>
            <span className="text-xs font-mono-code text-slate-500 hidden sm:inline">
              (Arrastra las tarjetas para reorganizar tu estación de trabajo)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playBlip(900, 0.03);
                setIsCustomizerOpen(true);
              }}
              className="text-xs font-mono-code text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>+ Administrar Módulos</span>
            </button>
          </div>
        </div>

        {/* Modular Draggable Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets
            .filter((w) => w.enabled)
            .map((widget) => {
              return (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  isJarvisMode={isJarvisMode}
                  onRemove={(id) => {
                    handleSaveWidgets(widgets.map((w) => (w.id === id ? { ...w, enabled: false } : w)));
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {widget.id === 'widget-gandolas' && (
                    <TruckFleetWidget
                      units={widget.data.units || []}
                      onAskAgent={handleSendMessage}
                      isJarvisMode={isJarvisMode}
                    />
                  )}

                  {widget.id === 'widget-idempiere' && (
                    <IdempiereAuditWidget
                      data={widget.data as any}
                      onAskAgent={handleSendMessage}
                      isJarvisMode={isJarvisMode}
                    />
                  )}

                  {widget.id === 'widget-red' && (
                    <NetworkStatusWidget
                      data={widget.data as any}
                      onAskAgent={handleSendMessage}
                      isJarvisMode={isJarvisMode}
                    />
                  )}

                  {widget.id === 'widget-subrutinas' && (
                    <TelemetryWidget
                      data={widget.data as any}
                      isJarvisMode={isJarvisMode}
                    />
                  )}
                </WidgetCard>
              );
            })}
        </div>
      </main>

      {/* Modals */}
      <WidgetCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        widgets={widgets}
        onSaveWidgets={handleSaveWidgets}
        onResetDefaults={handleResetDefaults}
        isJarvisMode={isJarvisMode}
      />

      <ArchitectureDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        isJarvisMode={isJarvisMode}
      />
    </div>
  );
}
