import React from 'react';
import { Cpu, Zap, Layers, Terminal, Server } from 'lucide-react';

interface TelemetryWidgetProps {
  data: {
    neuralFluxRate: string;
    tokensSec: number;
    contextUsedTokens: number;
    maxContextTokens: number;
    subroutines: { name: string; status: string }[];
  };
  isJarvisMode?: boolean;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ data, isJarvisMode = false }) => {
  const contextPct = ((data.contextUsedTokens / data.maxContextTokens) * 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Flujo Neural</span>
          <span className="text-base font-hud font-bold text-purple-400">{data.neuralFluxRate}</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Inferencia</span>
          <span className="text-base font-hud font-bold text-cyan-400">{data.tokensSec} <span className="text-[10px]">t/s</span></span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Ventana Contexto</span>
          <span className="text-base font-hud font-bold text-emerald-400">{contextPct}%</span>
        </div>
      </div>

      {/* Subroutines List */}
      <div className="space-y-2">
        <span className="text-[11px] font-hud font-bold text-slate-400 block uppercase">
          Subprocesos Autónomos Activos
        </span>
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
          {data.subroutines.map((sub, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-mono-code text-slate-200">{sub.name}</span>
              </div>
              <span className="text-[10px] font-mono-code text-cyan-400/90 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                {sub.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
