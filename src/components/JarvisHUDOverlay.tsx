import React, { useState, useEffect } from 'react';
import { Shield, Crosshair, Compass, Cpu, Radio, Eye, Disc } from 'lucide-react';

interface JarvisHUDOverlayProps {
  active: boolean;
}

export const JarvisHUDOverlay: React.FC<JarvisHUDOverlayProps> = ({ active }) => {
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

      // subtle variations
      setCpuTick(Math.floor(38 + Math.random() * 15));
      setRamTick(Math.floor(62 + Math.random() * 6));
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

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
          <span className="font-hud font-bold tracking-widest text-xs">AURA HUD // TACTICAL LINK</span>
        </div>
        <div className="text-[10px] text-cyan-300/70 pl-3">
          SYS.TIME: {timeStr || '00:00:00:00'} • SEC: ALPHA-9
        </div>
        <div className="text-[9px] text-slate-400 pl-3">
          COORDS: 10°14'24.8"N 67°59'48.2"W [VE-HUB]
        </div>
      </div>

      {/* Top Right Viewport Telemetry */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-[11px] text-cyan-400/90">
        <div className="flex items-center gap-2">
          <span className="font-hud font-bold text-xs">QUANTUM FLUX 99.8%</span>
          <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-cyan-300/70 pr-3">
          <span>CPU: {cpuTick}%</span>
          <span>RAM: {ramTick}%</span>
          <span>FPS: 60</span>
        </div>
        <div className="text-[9px] text-slate-400 pr-3">
          LINK: GEMINI-3.8-FLASH // NEURAL BUS
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
          <div className="text-cyan-300 font-bold">RADAR TERRESTRE ACTIVO</div>
          <div className="text-slate-400">Rango: 450 km • Gandolas: Sincronizadas</div>
        </div>
      </div>

      {/* Bottom Right Reticle Accent */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-cyan-400/70">
        <span>ESTADO: VIGILANCIA AUTÓNOMA</span>
        <div className="w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
      </div>

      {/* Screen edge glowing vignette */}
      <div className="absolute inset-0 border border-cyan-500/20 shadow-[inset_0_0_60px_rgba(6,182,212,0.15)] pointer-events-none" />
    </div>
  );
};
