import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface GaugeChartProps {
  score: number;
  categoria: 'BAJO' | 'MODERADO' | 'ALTO';
  subscores: {
    actividad: number;
    social: number;
    cardio: number;
  };
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ score, categoria, subscores }) => {
  // SVG circular gauge calculations
  const radius = 68;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const colorConfig = {
    BAJO: { color: '#10B981', label: 'Riesgo Bajo (Protegido)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: ShieldCheck },
    MODERADO: { color: '#F59E0B', label: 'Riesgo Moderado', badgeClass: 'bg-amber-50 text-amber-700 border-amber-300', icon: AlertTriangle },
    ALTO: { color: '#EF4444', label: 'Riesgo Alto (Atención)', badgeClass: 'bg-rose-50 text-rose-700 border-rose-300', icon: ShieldAlert },
  }[categoria] || { color: '#10B981', label: 'Riesgo Bajo', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: ShieldCheck };

  const Icon = colorConfig.icon;

  return (
    <div className="bg-white rounded-2xl border border-health-border p-6 shadow-card flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
          <span>Puntaje de Salud Cerebral</span>
        </h3>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colorConfig.badgeClass} flex items-center gap-1`}>
          <Icon className="w-3.5 h-3.5" />
          {colorConfig.label}
        </span>
      </div>

      {/* Anillo Radial SVG */}
      <div className="relative flex items-center justify-center my-2">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#E2E8F0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={colorConfig.color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-health-dark leading-none">{score}</span>
          <span className="text-[11px] font-semibold text-slate-400 mt-0.5">de 100 pts</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center max-w-xs mt-1">
        Basado en evidencia científica multidominio para la preservación de la memoria y reserva cognitiva.
      </p>

      {/* Desglose de los 3 Pilares */}
      <div className="w-full grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Físico (35%)</span>
          <span className="text-sm font-extrabold text-health-petroleo">{subscores.actividad} pts</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Social (35%)</span>
          <span className="text-sm font-extrabold text-health-petroleo">{subscores.social} pts</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Cardio (30%)</span>
          <span className="text-sm font-extrabold text-health-petroleo">{subscores.cardio} pts</span>
        </div>
      </div>
    </div>
  );
};
