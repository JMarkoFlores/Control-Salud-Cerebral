import React from 'react';
import { KpiData } from '../types';
import { Activity, Users, HeartPulse, ArrowRight, AlertCircle } from 'lucide-react';

interface KpiCardProps {
  data: KpiData;
  onActionClick?: () => void;
  actionText?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ data, onActionClick, actionText = 'Ver registros' }) => {
  const iconMap = {
    CAF: Activity,
    CCS: Users,
    FCM: HeartPulse,
  };

  const Icon = iconMap[data.codigoKpi] || Activity;
  const pctNumber = data.porcentaje !== null ? Math.min(100, Math.max(0, data.porcentaje)) : 0;

  return (
    <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card flex flex-col justify-between hover:shadow-lg transition-shadow">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-health-petroleo">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                {data.codigoKpi}
              </span>
              <h4 className="font-bold text-slate-800 text-sm">{data.titulo}</h4>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${data.estado.badgeClass}`}>
            {data.estado.label}
          </span>
        </div>

        {/* Porcentaje y Numerador */}
        <div className="flex items-baseline justify-between mt-2 mb-1">
          <span className="text-3xl font-extrabold text-health-dark">
            {data.porcentajeTexto}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {data.numerador} de {data.denominador} {data.unidad}
          </span>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden my-2">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: data.porcentaje !== null ? `${pctNumber}%` : '0%',
              backgroundColor: data.estado.color || '#10B981',
            }}
          />
        </div>

        {/* Frase Motivadora Dinámica */}
        <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-medium bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
          {data.mensajeMotivador}
        </p>

        {data.diasPendientes && data.diasPendientes > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200 mt-2 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Tienes {data.diasPendientes} día(s) por confirmar.</span>
          </div>
        ) : null}
      </div>

      {onActionClick && (
        <button
          onClick={onActionClick}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-health-petroleo hover:text-teal-700 transition-colors w-full group"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
};
