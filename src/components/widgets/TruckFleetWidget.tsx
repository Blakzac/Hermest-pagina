import React, { useState } from 'react';
import { TruckUnit } from '../../types';
import { Truck, Navigation, Fuel, Gauge, MapPin, Send, AlertCircle, PlusCircle, Check } from 'lucide-react';
import { playBlip, playSuccessChime } from '../../utils/audioSynth';

interface TruckFleetWidgetProps {
  units: TruckUnit[];
  onAskAgent?: (prompt: string) => void;
  isJarvisMode?: boolean;
}

export const TruckFleetWidget: React.FC<TruckFleetWidgetProps> = ({
  units: initialUnits,
  onAskAgent,
  isJarvisMode = false,
}) => {
  const [units, setUnits] = useState<TruckUnit[]>(initialUnits);
  const [selectedUnit, setSelectedUnit] = useState<TruckUnit | null>(null);
  const [filter, setFilter] = useState<'all' | 'en_ruta' | 'retenido'>('all');
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  const filteredUnits = units.filter(u => {
    if (filter === 'all') return true;
    return u.status === filter;
  });

  const handleDispatchNew = () => {
    playSuccessChime();
    const newUnit: TruckUnit = {
      id: `trk-${Date.now().toString().slice(-4)}`,
      code: `G-${Math.floor(500 + Math.random() * 400)}`,
      model: 'Kenworth T680',
      driver: 'Javier Morales',
      origin: 'Planta Alimentos Polar Valencia',
      destination: 'Centro Cúmulo Caracas',
      cargo: '26 Ton Harina Precocida',
      weightTons: 26,
      fuelPct: 100,
      speedKmh: 64,
      status: 'en_ruta',
      gpsCoordinates: '10.2205° N, 67.9250° W'
    };
    setUnits([newUnit, ...units]);
    setDispatchedSuccess(true);
    setTimeout(() => setDispatchedSuccess(false), 3000);
    onAskAgent?.(`Se ha despachado la gandola ${newUnit.code} conducida por ${newUnit.driver} con 26 Ton hacia ${newUnit.destination}. ¿Monitorear ruta?`);
  };

  const statusMap = {
    en_ruta: { label: 'En Ruta', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    retenido: { label: 'Retenido en Punto', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    en_descarga: { label: 'En Descarga', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    disponible: { label: 'Disponible', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  };

  return (
    <div className="space-y-4">
      {/* Top metric overview */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Flota Total</span>
          <span className="text-lg font-hud font-bold text-slate-100">{units.length}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">En Tránsito</span>
          <span className="text-lg font-hud font-bold text-cyan-400">
            {units.filter(u => u.status === 'en_ruta').length}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Rendimiento</span>
          <span className="text-lg font-hud font-bold text-emerald-400">28.4 L</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition-all ${
              filter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({units.length})
          </button>
          <button
            onClick={() => setFilter('en_ruta')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition-all ${
              filter === 'en_ruta'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            En Ruta
          </button>
          <button
            onClick={() => setFilter('retenido')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition-all ${
              filter === 'retenido'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Retenidos
          </button>
        </div>

        <button
          onClick={handleDispatchNew}
          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-hud text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
        >
          {dispatchedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Despachado</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Despachar</span>
            </>
          )}
        </button>
      </div>

      {/* List of Gandolas */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {filteredUnits.map((truck) => {
          const statusInfo = statusMap[truck.status] || statusMap.en_ruta;
          return (
            <div
              key={truck.id}
              onClick={() => {
                playBlip(700, 0.03);
                setSelectedUnit(selectedUnit?.id === truck.id ? null : truck);
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                selectedUnit?.id === truck.id
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-hud font-bold text-sm text-slate-100">{truck.code}</span>
                      <span className="text-xs text-slate-400 font-mono-code">({truck.model})</span>
                    </div>
                    <span className="text-xs text-slate-300 font-medium block">
                      Operador: {truck.driver}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code border ${statusInfo.bg}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Route line */}
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono-code text-slate-400 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-800/50">
                <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{truck.origin}</span>
                <span className="text-cyan-400 font-bold">➔</span>
                <span className="truncate text-slate-200">{truck.destination}</span>
              </div>

              {/* Gauges bar */}
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] font-mono-code text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{truck.speedKmh} km/h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Fuel className={`w-3.5 h-3.5 ${truck.fuelPct < 30 ? 'text-rose-400' : 'text-emerald-400'}`} />
                  <span>Tanque: {truck.fuelPct}%</span>
                </div>
                <div className="text-right truncate">
                  <span className="text-slate-300">{truck.weightTons} T</span>
                </div>
              </div>

              {/* Expanded details & quick prompt to agent */}
              {selectedUnit?.id === truck.id && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-mono-code">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> GPS: {truck.gpsCoordinates}
                    </span>
                    <span className="text-slate-300 font-medium">Carga: {truck.cargo}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playBlip(900, 0.04);
                      onAskAgent?.(`AURA, dame un análisis detallado de la gandola ${truck.code} (${truck.model}). Conductor ${truck.driver}, con carga ${truck.cargo}. Ruta: ${truck.origin} hacia ${truck.destination}. ¿Hay demoras o alertas?`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-mono-code flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>Consultar estatus de {truck.code} con AURA</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
