import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentState } from '../types';
import { Activity, Cpu, Zap, Radio, AlertTriangle, Sparkles } from 'lucide-react';
import { playBlip, playHeartbeatPulse } from '../utils/audioSynth';

interface CoreProps {
  state: AgentState;
  onStateChange?: (newState: AgentState) => void;
  isJarvisMode?: boolean;
  audioLevel?: number; // 0 to 1 for reactive voice animation
  bpm?: number;
}

export const Core: React.FC<CoreProps> = ({
  state,
  onStateChange,
  isJarvisMode = false,
  audioLevel = 0,
  bpm = 72,
}) => {
  // Color configuration depending on state
  const stateTheme = useMemo(() => {
    switch (state) {
      case 'processing':
        return {
          label: 'PROCESANDO',
          subLabel: 'Inferencia Neural Activa',
          color: 'from-amber-400 via-purple-500 to-pink-500',
          glow: 'rgba(236, 72, 153, 0.45)',
          border: 'border-pink-500/60',
          textColor: 'text-pink-400',
          bgBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
          speed: 1.5,
          icon: Zap,
        };
      case 'speaking':
        return {
          label: 'TRANSMITIENDO',
          subLabel: 'Síntesis Vocal Resonante',
          color: 'from-cyan-400 via-teal-300 to-blue-500',
          glow: 'rgba(6, 182, 212, 0.55)',
          border: 'border-cyan-400/80',
          textColor: 'text-cyan-300',
          bgBadge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50',
          speed: 2.2,
          icon: Radio,
        };
      case 'idle':
        return {
          label: 'INACTIVO / ESPERA',
          subLabel: 'Modo Reposo de Bajo Consumo',
          color: 'from-slate-500 via-indigo-900 to-slate-700',
          glow: 'rgba(99, 102, 241, 0.2)',
          border: 'border-slate-600/40',
          textColor: 'text-slate-400',
          bgBadge: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
          speed: 4.5,
          icon: Activity,
        };
      case 'alert':
        return {
          label: 'ALERTA TÁCTICA',
          subLabel: 'Discrepancia Crítica Detectada',
          color: 'from-rose-500 via-red-500 to-amber-500',
          glow: 'rgba(239, 68, 68, 0.55)',
          border: 'border-red-500/80',
          textColor: 'text-red-400',
          bgBadge: 'bg-red-500/20 text-red-300 border-red-500/50',
          speed: 1.2,
          icon: AlertTriangle,
        };
      case 'online':
      default:
        return {
          label: 'ONLINE / SINCRONIZADO',
          subLabel: 'Núcleo Biométrico Estable',
          color: 'from-cyan-400 via-blue-500 to-indigo-600',
          glow: 'rgba(6, 182, 212, 0.4)',
          border: 'border-cyan-500/50',
          textColor: 'text-cyan-400',
          bgBadge: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
          speed: 3.0,
          icon: Sparkles,
        };
    }
  }, [state]);

  const Icon = stateTheme.icon;

  // Pulse animation duration calculated from BPM or processing intensity
  const pulseDuration = state === 'processing' ? 1.0 : state === 'idle' ? 4.5 : (60 / bpm) * 2;

  const handleCoreClick = () => {
    playBlip(1200, 0.08);
    playHeartbeatPulse();
    if (onStateChange) {
      const order: AgentState[] = ['online', 'processing', 'speaking', 'idle'];
      const next = order[(order.indexOf(state) + 1) % order.length];
      onStateChange(next);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* HUD Reticle Overlay for Jarvis Mode */}
      {isJarvisMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[340px] h-[340px] border border-cyan-500/20 rounded-full border-dashed animate-spin" style={{ animationDuration: '60s' }} />
          <div className="absolute w-[380px] h-[380px] border border-cyan-500/10 rounded-full" />
          {/* Crosshairs */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/70" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/70" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/70" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/70" />
        </div>
      )}

      {/* Main Interactive Core Container */}
      <div 
        onClick={handleCoreClick}
        title="Haz clic para alternar el estado del Núcleo"
        className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center cursor-pointer select-none group"
      >
        {/* Outer Glow Aura */}
        <motion.div
          animate={{
            scale: state === 'speaking' ? [1, 1.25 + audioLevel * 0.4, 1] : [0.95, 1.15, 0.95],
            opacity: state === 'idle' ? 0.2 : [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-2 rounded-full blur-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${stateTheme.glow} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Concentric Rotating Cybernetic Gyro Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 32 / stateTheme.speed, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-cyan-500/20"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
        </motion.div>

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 24 / stateTheme.speed, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-5 rounded-full border border-dashed border-cyan-400/30"
        >
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
        </motion.div>

        {/* Third Segmented Inner Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16 / stateTheme.speed, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-10 rounded-full border border-slate-700/60"
        >
          <div className="w-full h-full rounded-full border-t border-r border-cyan-400/60" />
        </motion.div>

        {/* Heartbeat Pulse Wave Ring (Scales outwards) */}
        <motion.div
          animate={{
            scale: [0.75, 1.35],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          className={`absolute inset-8 rounded-full border-2 ${stateTheme.border} pointer-events-none`}
        />

        {/* Core Inner Sphere (The "Biometric Heart") */}
        <motion.div
          animate={{
            scale: state === 'speaking' 
              ? [1, 1.08 + audioLevel * 0.15, 1] 
              : state === 'processing'
              ? [0.96, 1.08, 0.96]
              : [0.98, 1.04, 0.98],
            boxShadow: [
              `0 0 25px ${stateTheme.glow}`,
              `0 0 50px ${stateTheme.glow}`,
              `0 0 25px ${stateTheme.glow}`,
            ],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br ${stateTheme.color} p-[2px] transition-colors duration-500`}
        >
          {/* Inner dark refraction chamber */}
          <div className="w-full h-full rounded-full bg-[#070b14] flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
            {/* Shimmer light reflection */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-cyan-400/10 to-white/10 pointer-events-none" />

            {/* Micro circuit pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:8px_8px]" />

            {/* Central icon */}
            <motion.div
              animate={{
                scale: state === 'processing' ? [1, 1.2, 1] : [1, 1.05, 1],
                rotate: state === 'processing' ? [0, 180, 360] : 0,
              }}
              transition={{
                duration: state === 'processing' ? 2 : 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="z-10"
            >
              <Icon className={`w-8 h-8 md:w-9 md:h-9 ${stateTheme.textColor} drop-shadow-[0_0_12px_currentColor]`} />
            </motion.div>

            {/* Heartbeat pulse label */}
            <div className="z-10 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className={`text-[10px] font-mono-code tracking-widest font-bold ${stateTheme.textColor}`}>
                {state === 'processing' ? 'BUSY' : `${bpm} BPM`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hover Hint */}
        <div className="absolute -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-cyan-400/80 font-mono-code uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/30">
          Clic: Probar Estado
        </div>
      </div>

      {/* State Badge & Details */}
      <div className="mt-3 text-center flex flex-col items-center gap-1 z-20">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 text-xs font-hud font-bold rounded-full border ${stateTheme.bgBadge} tracking-wider shadow-sm flex items-center gap-1.5`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {stateTheme.label}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono-code">
          {stateTheme.subLabel}
        </p>

        {/* Quick State Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
          {(['online', 'processing', 'speaking', 'idle'] as AgentState[]).map((st) => (
            <button
              key={st}
              onClick={(e) => {
                e.stopPropagation();
                playBlip(950, 0.04);
                onStateChange?.(st);
              }}
              className={`text-[11px] font-mono-code uppercase px-2 py-1 rounded transition-all ${
                state === st
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {st === 'online' ? '● Online' : st === 'processing' ? '⚡ Procesando' : st === 'speaking' ? '🔊 Habla' : '💤 Reposo'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
