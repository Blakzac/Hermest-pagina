import React, { useState } from 'react';
import { WidgetConfig } from '../../types';
import { 
  GripVertical, Minimize2, Maximize2, X, RefreshCw, 
  CheckCircle2, AlertTriangle, AlertCircle, Clock
} from 'lucide-react';
import { playBlip } from '../../utils/audioSynth';

interface WidgetCardProps {
  widget: WidgetConfig;
  isJarvisMode?: boolean;
  onRemove?: (id: string) => void;
  onRefresh?: (id: string) => void;
  children: React.ReactNode;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  widget,
  isJarvisMode = false,
  onRemove,
  onRefresh,
  children,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const statusConfig = {
    healthy: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      icon: CheckCircle2,
      label: 'NORMAL',
    },
    warning: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      icon: AlertTriangle,
      label: 'ATENCIÓN',
    },
    alert: {
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      icon: AlertCircle,
      label: 'ALERTA',
    },
    standby: {
      color: 'text-slate-400',
      bg: 'bg-slate-800 border-slate-700',
      icon: Clock,
      label: 'STANDBY',
    },
  }[widget.status || 'healthy'];

  const StatusIcon = statusConfig.icon;

  const handleRefresh = () => {
    setIsRotating(true);
    playBlip(1100, 0.05);
    onRefresh?.(widget.id);
    setTimeout(() => setIsRotating(false), 800);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, widget.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, widget.id)}
      className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
        isJarvisMode
          ? 'bg-[#080e1d]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
          : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 shadow-xl'
      } backdrop-blur-md overflow-hidden group`}
    >
      {/* Jarvis HUD corner bracket accents */}
      {isJarvisMode && (
        <>
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
        </>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag handle */}
          <div 
            title="Arrastrar para reorganizar widget"
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 transition-colors p-0.5 rounded"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Title and Category */}
          <div className="truncate">
            <h3 className={`text-sm font-semibold truncate ${isJarvisMode ? 'text-cyan-200 font-hud tracking-wide' : 'text-slate-100'}`}>
              {widget.title}
            </h3>
            <span className="text-[10px] uppercase font-mono-code text-slate-400">
              {widget.category}
            </span>
          </div>
        </div>

        {/* Right side status & action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <div className={`px-2 py-0.5 rounded-full border text-[10px] font-mono-code font-bold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{statusConfig.label}</span>
          </div>

          {/* Refresh action */}
          <button
            onClick={handleRefresh}
            title="Sincronizar datos"
            className={`p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors ${
              isRotating ? 'animate-spin text-cyan-400' : ''
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Minimize toggle */}
          <button
            onClick={() => {
              playBlip(850, 0.03);
              setIsMinimized(!isMinimized);
            }}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Hide/Remove */}
          {onRemove && (
            <button
              onClick={() => {
                playBlip(600, 0.04);
                onRemove(widget.id);
              }}
              title="Ocultar herramienta"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body content */}
      {!isMinimized && (
        <div className="p-4 flex-1">
          {children}
        </div>
      )}
    </div>
  );
};
