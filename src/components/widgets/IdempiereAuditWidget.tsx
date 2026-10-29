import React, { useState } from 'react';
import { IdempiereAuditData } from '../../types';
import { 
  Building2, CheckCircle, AlertTriangle, ArrowRight, Play, 
  RotateCcw, ShieldCheck, Database, FileSpreadsheet, Sparkles 
} from 'lucide-react';
import { playBlip, playSuccessChime } from '../../utils/audioSynth';

interface IdempiereAuditWidgetProps {
  data: IdempiereAuditData;
  onAskAgent?: (prompt: string) => void;
  isJarvisMode?: boolean;
}

export const IdempiereAuditWidget: React.FC<IdempiereAuditWidgetProps> = ({
  data: initialData,
  onAskAgent,
  isJarvisMode = false,
}) => {
  const [auditData, setAuditData] = useState<IdempiereAuditData>(initialData);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciledCount, setReconciledCount] = useState(0);

  const handleExecuteReconciliation = () => {
    setIsReconciling(true);
    playBlip(1000, 0.06);

    setTimeout(() => {
      setIsReconciling(false);
      playSuccessChime();
      setAuditData(prev => ({
        ...prev,
        reconciledPercentage: 99.4,
        unreconciledItems: prev.unreconciledItems.filter(item => item.severity === 'high'), // clears minor items
        lastSync: 'Recién sincronizado'
      }));
      setReconciledCount(c => c + 1);
      onAskAgent?.('Se ejecutó la macro de conciliación automática en iDempiere ERP. El nivel de coincidencia bancaria aumentó a 99.4%. ¿Generar asiento de ajuste para las retenciones restantes?');
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* ERP Status Banner */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-hud text-xs font-bold text-slate-200">iDempiere Enterprise ERP</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[11px] font-mono-code text-slate-400">
              Periodo: {auditData.activePeriod} • {auditData.lastSync}
            </span>
          </div>
        </div>

        <button
          onClick={handleExecuteReconciliation}
          disabled={isReconciling}
          className={`px-3 py-1.5 rounded-lg text-xs font-hud font-bold tracking-wider transition-all flex items-center gap-1.5 ${
            isReconciling
              ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 animate-pulse'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
          }`}
        >
          {isReconciling ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Conciliando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Conciliar</span>
            </>
          )}
        </button>
      </div>

      {/* Progress & Metrics */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono-code">
          <span className="text-slate-400">Progreso de Conciliación Bancaria</span>
          <span className="font-bold text-cyan-400">{auditData.reconciledPercentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[1px]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            style={{ width: `${auditData.reconciledPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
          <span>{auditData.totalJournalsToday} asientos contables hoy</span>
          <span>Tolerancia de desvío: &lt; 0.1%</span>
        </div>
      </div>

      {/* Discrepancies and Unreconciled Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-hud font-bold text-slate-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Discrepancias para Auditoría ({auditData.unreconciledItems.length})
          </span>
          <span className="text-[10px] font-mono-code text-slate-500">PostgreSQL Sync</span>
        </div>

        {auditData.unreconciledItems.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs font-mono-code text-emerald-300">Todas las transacciones de iDempiere han sido conciliadas con éxito.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {auditData.unreconciledItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950/40 border border-amber-500/30 hover:border-amber-400/60 transition-all text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono-code font-bold text-amber-300 block">
                      Ref: {item.reference}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono-code block">
                      {item.account}
                    </span>
                  </div>
                  <span className="font-hud font-bold text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    ${item.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                  <span className="text-amber-400/90 flex items-center gap-1 truncate max-w-[200px]">
                    ⚠️ {item.anomalyType}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playBlip(800, 0.03);
                      onAskAgent?.(`AURA, revisa la discrepancia en iDempiere para el comprobante ${item.reference} en la cuenta "${item.account}" por $${item.amountUsd}. Causa: ${item.anomalyType}. ¿Cómo debemos conciliarlo?`);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 shrink-0"
                  >
                    Auditar con AURA ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
