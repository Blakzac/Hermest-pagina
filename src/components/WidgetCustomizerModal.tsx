import React, { useState } from 'react';
import { WidgetConfig } from '../types';
import { 
  X, Check, Copy, Code, Sliders, RotateCcw, 
  Eye, EyeOff, Plus, FileJson, AlertCircle 
} from 'lucide-react';
import { playBlip, playSuccessChime } from '../utils/audioSynth';

interface WidgetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onSaveWidgets: (updated: WidgetConfig[]) => void;
  onResetDefaults: () => void;
  isJarvisMode?: boolean;
}

export const WidgetCustomizerModal: React.FC<WidgetCustomizerModalProps> = ({
  isOpen,
  onClose,
  widgets,
  onSaveWidgets,
  onResetDefaults,
  isJarvisMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState(JSON.stringify(widgets, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleToggleWidget = (id: string) => {
    playBlip(900, 0.04);
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    onSaveWidgets(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un arreglo de widgets [WidgetConfig].');
      }
      playSuccessChime();
      onSaveWidgets(parsed);
      setJsonError(null);
      onClose();
    } catch (err: any) {
      setJsonError(err.message || 'Error en formato JSON');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isJarvisMode 
          ? 'bg-[#080d1c] border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]' 
          : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud font-bold text-slate-100 text-base tracking-wide">
              Configurador Dinámico de Herramientas y Widgets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-6 pt-3 border-b border-slate-800 flex gap-4 text-xs font-mono-code bg-slate-950/30">
          <button
            onClick={() => {
              playBlip(800, 0.03);
              setActiveTab('visual');
            }}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 font-bold transition-all ${
              activeTab === 'visual'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Gestor Visual de Módulos</span>
          </button>
          <button
            onClick={() => {
              playBlip(800, 0.03);
              setJsonText(JSON.stringify(widgets, null, 2));
              setActiveTab('json');
            }}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 font-bold transition-all ${
              activeTab === 'json'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Estructura JSON Dinámica</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'visual' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Activa o desactiva las herramientas que se proyectan en el dashboard del cuerpo digital. Puedes reordenarlas arrastrándolas directamente en el tablero.
              </p>

              <div className="space-y-2">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-200">{widget.title}</span>
                        <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {widget.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{widget.description}</p>
                    </div>

                    <button
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition-all flex items-center gap-1.5 ${
                        widget.enabled
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {widget.enabled ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Oculto</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span>Esquema JSON editable del sistema de herramientas:</span>
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                rows={14}
                className="w-full bg-[#050811] text-cyan-300 font-mono-code text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500 selection:text-black resize-y"
                spellCheck={false}
              />

              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              playBlip(700, 0.05);
              onResetDefaults();
            }}
            className="text-xs font-mono-code text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Valores por Defecto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
            {activeTab === 'json' && (
              <button
                onClick={handleApplyJson}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-hud text-xs font-bold transition-all shadow-md"
              >
                Aplicar Cambios JSON
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
