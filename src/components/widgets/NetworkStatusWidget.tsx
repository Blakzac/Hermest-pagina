import React, { useState, useEffect } from 'react';
import { NetworkNode } from '../../types';
import { 
  Wifi, ShieldCheck, Activity, Globe, Server, 
  ArrowDownUp, RefreshCw, Radio, HardDrive 
} from 'lucide-react';
import { playBlip } from '../../utils/audioSynth';

interface NetworkStatusWidgetProps {
  data: {
    averageLatencyMs: number;
    downloadSpeedMbps: number;
    uploadSpeedMbps: number;
    packetLossPct: number;
    firewallEventsBlocked: number;
    nodes: NetworkNode[];
  };
  onAskAgent?: (prompt: string) => void;
  isJarvisMode?: boolean;
}

export const NetworkStatusWidget: React.FC<NetworkStatusWidgetProps> = ({
  data: initialData,
  onAskAgent,
  isJarvisMode = false,
}) => {
  const [data, setData] = useState(initialData);
  const [isTesting, setIsTesting] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([22, 24, 25, 23, 28, 24, 22, 26, 24]);

  const handleRunPingTest = () => {
    setIsTesting(true);
    playBlip(1200, 0.05);

    setTimeout(() => {
      const newLatency = Math.floor(18 + Math.random() * 12);
      setData(prev => ({
        ...prev,
        averageLatencyMs: newLatency,
        downloadSpeedMbps: Math.floor(450 + Math.random() * 80),
        firewallEventsBlocked: prev.firewallEventsBlocked + Math.floor(Math.random() * 3),
        nodes: prev.nodes.map(node => ({
          ...node,
          pingMs: Math.max(4, Math.floor(node.pingMs + (Math.random() * 6 - 3)))
        }))
      }));
      setLatencyHistory(prev => [...prev.slice(1), newLatency]);
      setIsTesting(false);
      onAskAgent?.(`Se completó el diagnóstico de red. Latencia promedio: ${newLatency}ms. Pérdida de paquetes: 0.01%. Todos los nodos del clúster están en estado óptimo.`);
    }, 900);
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Latencia</span>
          <span className="text-base font-hud font-bold text-cyan-400">
            {data.averageLatencyMs} <span className="text-[10px]">ms</span>
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Bajada</span>
          <span className="text-base font-hud font-bold text-emerald-400">
            {data.downloadSpeedMbps} <span className="text-[10px]">M</span>
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Pérdida</span>
          <span className="text-base font-hud font-bold text-slate-100">
            {data.packetLossPct}%
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block">Firewall</span>
          <span className="text-base font-hud font-bold text-indigo-400">
            {data.firewallEventsBlocked}
          </span>
        </div>
      </div>

      {/* Latency Wave Chart (SVG Sparkline) */}
      <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 mb-1.5">
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Historial de Latencia (RTT)
          </span>
          <button
            onClick={handleRunPingTest}
            disabled={isTesting}
            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Midiendo...' : 'Test Ping'}</span>
          </button>
        </div>

        {/* SVG Sparkline */}
        <div className="h-10 w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,${30 - (latencyHistory[0] - 15) * 1.5} ${latencyHistory.map((val, idx) => `L ${(idx / (latencyHistory.length - 1)) * 100},${30 - (val - 15) * 1.5}`).join(' ')} L 100,30 L 0,30 Z`}
              fill="url(#latencyGrad)"
            />
            <path
              d={`M 0,${30 - (latencyHistory[0] - 15) * 1.5} ${latencyHistory.map((val, idx) => `L ${(idx / (latencyHistory.length - 1)) * 100},${30 - (val - 15) * 1.5}`).join(' ')}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Nodes List */}
      <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
        <span className="text-[11px] font-hud font-bold text-slate-400 block uppercase">
          Nodos del Clúster de Operaciones
        </span>
        {data.nodes.map((node) => (
          <div
            key={node.id}
            className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block leading-tight">{node.name}</span>
                <span className="text-[10px] font-mono-code text-slate-500">{node.region} • {node.ip}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono-code text-xs font-bold text-emerald-400 block">{node.pingMs}ms</span>
              <span className="text-[10px] font-mono-code text-slate-400">{node.uptimePct}% Up</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
