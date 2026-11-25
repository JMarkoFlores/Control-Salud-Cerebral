import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { GaugeChart } from '../../components/GaugeChart';
import { KpiCard } from '../../components/KpiCard';
import { Shield, Eye, Bell, CheckCircle2, User } from 'lucide-react';

export const DashboardAcompanante: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/acompanante');
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
    return <div className="h-64 bg-slate-200 animate-pulse rounded-3xl" />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Banner Modo Solo Lectura */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 lg:p-8 text-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> MODO SOLO LECTURA
            </span>
            <span className="text-xs text-blue-200 font-mono">
              Titular: {data.titular.codigo_interno}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Seguimiento de {data.titular.nombres} {data.titular.apellidos}
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Como acompañante autorizado, puedes monitorear el avance preventivo y motivar a tu familiar para que cumpla sus metas semanales.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center sm:text-right">
          <span className="text-[10px] text-blue-200 uppercase font-bold block">Puntaje Cerebral</span>
          <span className="text-3xl font-extrabold text-white">{data.puntajeSaludCerebral}/100</span>
          <span className="text-xs font-semibold text-emerald-300 block mt-0.5">{data.categoriaDetalle.label}</span>
        </div>
      </div>

      {/* Puntaje Gauge y Tarjetas KPI del Titular */}
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

        {/* Las 3 Tarjetas KPI en Solo Lectura */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard data={data.kpis.caf} />
          <KpiCard data={data.kpis.ccs} />
          <KpiCard data={data.kpis.fcm} />
        </div>
      </div>

      {/* Alertas Recibidas para este Titular */}
      <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-health-petroleo" />
            <h3 className="font-bold text-slate-800 text-sm">Alertas y Notificaciones de Apoyo</h3>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('alertas')}
              className="text-xs font-bold text-health-petroleo hover:underline"
            >
              Ver bandeja completa
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 mt-2 text-xs">
          {data.alertasTitular.length === 0 ? (
            <p className="py-6 text-center text-slate-400">
              No hay alertas pendientes para tu titular en este momento.
            </p>
          ) : (
            data.alertasTitular.map((a: any) => (
              <div key={a.alerta_id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <span className="font-bold text-health-petroleo">{a.motivo}</span>
                  <p className="text-slate-600 mt-0.5">{a.mensaje || a.nombre_regla}</p>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {new Date(a.fecha_emision).toLocaleString('es-PE')}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  a.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {a.estado}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
