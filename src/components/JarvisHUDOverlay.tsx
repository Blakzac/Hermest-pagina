import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import type { AgentState, ChatMessage, ConnectionState, HermesTransport } from '../types';

interface JarvisHUDOverlayProps {
  active: boolean;
  messages?: ChatMessage[];
  agentState?: AgentState;
  connectionState?: ConnectionState;
  transport?: HermesTransport;
  sessionId?: string;
}

export const JarvisHUDOverlay: React.FC<JarvisHUDOverlayProps> = ({
  active,
  messages = [],
  agentState = 'online',
  connectionState = 'checking',
  transport = 'unknown',
  sessionId = '',
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [cpuTick, setCpuTick] = useState(42);
  const [ramTick, setRamTick] = useState(64);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}:${ms}`);

      setCpuTick(Math.floor(38 + Math.random() * 15));
      setRamTick(Math.floor(62 + Math.random() * 6));
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const latestUser = [...messages].reverse().find((msg) => msg.role === 'user' && msg.content.trim());
  const latestAssistant = [...messages]
    .reverse()
    .find((msg) => msg.role === 'assistant' && msg.content.trim());

  const stateLabel =
    agentState === 'processing'
      ? 'PROCESANDO'
      : agentState === 'speaking'
        ? 'TRANSMITIENDO'
        : agentState === 'alert'
          ? 'ALERTA'
          : agentState === 'idle'
            ? 'EN ESPERA'
            : 'EN LÍNEA';

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden font-mono-code select-none">
      {/* Background Holographic Cyber Grid */}
      <div className="absolute inset-0 jarvis-grid-bg opacity-30" />

      {/* Scanline texture */}
      <div className="absolute inset-0 jarvis-scanline opacity-20" />

      {/* Vertical Sweep Beam */}
      <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-hud-sweep pointer-events-none" />

      {/* Top Left Viewport HUD Bracket */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 text-[11px] text-cyan-400/90 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <span className="font-hud font-bold tracking-widest text-xs">HERMES HUD // DIRECT LINK</span>
        </div>
        <div className="text-[10px] text-cyan-300/70 pl-3">
          SYS.TIME: {timeStr || '00:00:00:00'} • MODE: TACTICAL
        </div>
        <div className="text-[9px] text-slate-400 pl-3">
          SESSION: {sessionId ? sessionId.slice(0, 8).toUpperCase() : 'UNLINKED'} • TRANSPORT: {transport.toUpperCase()}
        </div>
      </div>

      {/* Top Right Viewport Telemetry */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-[11px] text-cyan-400/90">
        <div className="flex items-center gap-2">
          <span className="font-hud font-bold text-xs">AGENT BUS 99.8%</span>
          <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-cyan-300/70 pr-3">
          <span>CPU: {cpuTick}%</span>
          <span>RAM: {ramTick}%</span>
          <span>FPS: 60</span>
        </div>
        <div className="text-[9px] text-slate-400 pr-3">
          LINK: HERMES AGENT // SSE CHANNEL
        </div>
      </div>

      {/* Live conversation panel */}
      <div className="absolute top-24 left-4 right-4 md:left-auto md:right-4 md:w-[380px] flex flex-col gap-2">
        <div className="rounded-xl border border-cyan-500/35 bg-[#030812]/80 backdrop-blur-md p-3 shadow-[0_0_25px_rgba(6,182,212,0.12)]">
          <div className="flex items-center justify-between gap-3 text-[10px] text-cyan-300/80 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-widest">
              <Cpu className="w-3.5 h-3.5" />
              HERMES // LIVE TRANSCRIPT
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border ${
                connectionState === 'online'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                  : connectionState === 'offline'
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-300'
                    : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
              }`}
            >
              {stateLabel}
            </span>
          </div>

          {latestUser ? (
            <div className="mb-2">
              <div className="text-[9px] uppercase tracking-widest text-amber-300/80 mb-0.5">OPERADOR</div>
              <p className="text-[11px] leading-relaxed text-amber-100/90 line-clamp-3">
                {latestUser.content}
              </p>
            </div>
          ) : null}

          <div className="border-t border-cyan-500/15 pt-2">
            <div className="text-[9px] uppercase tracking-widest text-cyan-300/80 mb-0.5">HERMES AGENT</div>
            <p className="text-[11px] leading-relaxed text-cyan-100/90 line-clamp-8 whitespace-pre-wrap">
              {latestAssistant?.content || 'Sin transmisiones todavía. Inicia el enlace desde el canal de mando.'}
            </p>
            {latestAssistant?.status === 'streaming' && (
              <span className="inline-block w-2 h-3 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Left Radar & Gyroscope */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-cyan-400/80">
        <div className="relative w-16 h-16 border border-cyan-500/40 rounded-full flex items-center justify-center">
          <div className="w-10 h-10 border border-dashed border-cyan-400/30 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
          <div className="absolute top-1 text-[8px] font-bold">N</div>
          <div className="absolute bottom-1 text-[8px]">S</div>
          <div className="absolute left-1 text-[8px]">W</div>
          <div className="absolute right-1 text-[8px]">E</div>
        </div>
        <div className="text-[10px] space-y-0.5">
          <div className="text-cyan-300 font-bold">CANAL NEURAL ACTIVO</div>
          <div className="text-slate-400">Transporte: {transport.toUpperCase()} • Sesión directa</div>
        </div>
      </div>

      {/* Bottom Right Reticle Accent */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-cyan-400/70">
        <span>ESTADO: {stateLabel} • ENLACE {connectionState.toUpperCase()}</span>
        <div className="w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
      </div>

      {/* Screen edge glowing vignette */}
      <div className="absolute inset-0 border border-cyan-500/20 shadow-[inset_0_0_60px_rgba(6,182,212,0.15)] pointer-events-none" />
    </div>
  );
};
