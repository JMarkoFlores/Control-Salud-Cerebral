import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { DashboardData } from '../../types';
import { GaugeChart } from '../../components/GaugeChart';
import { KpiCard } from '../../components/KpiCard';
import { Sparkles, Bell, Award, Plus, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export const DashboardTitular: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/titular');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl md:col-span-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-health-petroleo via-teal-800 to-health-petroleo rounded-3xl p-6 lg:p-8 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/10">
              {user?.codigo_interno}
            </span>
            <span className="text-xs text-teal-200 font-medium">
              Piloto Trujillo • {user?.distrito || 'La Libertad'}
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            ¡Hola, {user?.nombres}!
          </h2>
          <p className="text-xs lg:text-sm text-slate-200 mt-1 max-w-xl leading-relaxed">
            Cada caminata, conversación y control de salud fortalece tu memoria. Aquí tienes tu estado actual de protección cognitiva.
          </p>
        </div>

        <div className="relative z-10 flex gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('habitos')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Hábito</span>
          </button>
        </div>
      </div>

      {/* Gráfico Gauge de Salud Cerebral y Tarjetas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <GaugeChart
            score={data.puntajeSaludCerebral}
            categoria={data.categoriaRiesgo}
            subscores={{
              actividad: data.desglosePilares.actividadFisica,
              social: data.desglosePilares.contactoSocial,
              cardio: data.desglosePilares.cardiometabolico,
            }}
          />
        </div>

        {/* Resumen de Avisos y Próximos Recordatorios */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Próximos Recordatorios */}
          <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-health-petroleo flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Próximos Recordatorios</h3>
                </div>
                <button
                  onClick={() => onNavigate('recordatorios')}
                  className="text-xs text-health-petroleo font-bold hover:underline"
                >
                  Gestionar
                </button>
              </div>

              <div className="divide-y divide-slate-50 mt-2 space-y-1">
                {data.proximosRecordatorios.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No tienes recordatorios activos programados.
                  </p>
                ) : (
                  data.proximosRecordatorios.map((r) => (
                    <div key={r.recordatorio_id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block">
                          {r.tipo_aviso.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">Días: {r.dias_semana}</span>
                      </div>
                      <span className="font-mono font-bold text-health-petroleo bg-slate-100 px-2 py-1 rounded-md">
                        {r.hora_programada}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('recordatorios')}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-health-petroleo hover:underline flex items-center justify-between"
            >
              <span>Ver agenda completa de avisos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Últimos Logros Obtenidos */}
          <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Medallas Recientes</h3>
                </div>
                <button
                  onClick={() => onNavigate('logros')}
                  className="text-xs text-health-petroleo font-bold hover:underline"
                >
                  Vitrina
                </button>
              </div>

              <div className="space-y-2 mt-3">
                {data.ultimosLogros.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Registra tus actividades de esta semana para desbloquear tus primeras medallas.
                  </p>
                ) : (
                  data.ultimosLogros.map((l) => (
                    <div
                      key={l.logro_id}
                      className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-start gap-2.5"
                    >
                      <Award className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs">{l.nombre}</h5>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {l.descripcion}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('logros')}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-health-petroleo hover:underline flex items-center justify-between"
            >
              <span>Ver todas mis medallas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Los 3 Indicadores Oficiales (KPIs) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Los 3 Pilares del Seguimiento Semanal</h3>
            <p className="text-xs text-slate-500">
              Cálculos unificados en backend con estado motivador y diferenciación de días pendientes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            data={data.kpis.caf}
            onActionClick={() => onNavigate('habitos')}
            actionText="Registrar caminata / actividad"
          />
          <KpiCard
            data={data.kpis.ccs}
            onActionClick={() => onNavigate('habitos')}
            actionText="Registrar contacto social"
          />
          <KpiCard
            data={data.kpis.fcm}
            onActionClick={() => onNavigate('controles')}
            actionText="Ver controles y resultados"
          />
        </div>
      </div>
    </div>
  );
};
