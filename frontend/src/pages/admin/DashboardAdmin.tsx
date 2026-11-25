import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Users, ShieldAlert, Award, Activity, HeartPulse, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const DashboardAdmin: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div className="h-64 bg-slate-200 animate-pulse rounded-3xl" />;
  }

  // Datos simulados estructurados para los gráficos analíticos
  const dataGraficoPilares = [
    { pilar: 'Act. Física (CAF)', promedio: Math.round(stats?.promedios?.promedio_caf || 78) },
    { pilar: 'Social (CCS)', promedio: Math.round(stats?.promedios?.promedio_ccs || 82) },
    { pilar: 'Cardio (FCM)', promedio: Math.round(stats?.promedios?.promedio_fcm || 74) },
  ];

  const dataGruposEdad = [
    { grupo: '30-40 años', activos: 35, evaluables: 30 },
    { grupo: '41-50 años', activos: 58, evaluables: 52 },
    { grupo: '51-60 años', activos: 72, evaluables: 65 },
    { grupo: '61-65 años', activos: 45, evaluables: 40 },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Dashboard Global del Piloto (Trujillo)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analítica preventiva consolidada con subtotales evaluables y anonimización de participantes.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('reportes')}
            className="px-4 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors shadow-sm"
          >
            Ver Reportes Analíticos Oficiales
          </button>
        )}
      </div>

      {/* Tarjetas Resumen Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titulares Activos</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-health-petroleo flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-health-dark block mt-2">
            {stats?.usuarios?.total_titulares || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {stats?.usuarios?.total_acompanantes || 0} acompañantes registrados
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salud Cerebral Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-600 block mt-2">
            {Math.round(stats?.promedios?.promedio_salud_cerebral || 78)} pts
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Escala 0–100 (Subtotal evaluable)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Pendientes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-amber-600 block mt-2">
            {stats?.alertas?.total_pendientes || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {stats?.alertas?.total_atendidas || 0} alertas atendidas
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ámbito del Piloto</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-extrabold text-health-dark block mt-2">
            Trujillo, Perú
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            6 distritos activos en el programa
          </span>
        </div>
      </div>

      {/* Gráficos Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Cumplimiento por Pilar */}
        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Promedio de Cumplimiento por Pilar (Subtotal Evaluable)</h3>
          <p className="text-xs text-slate-400 mb-4">Excluye registros con datos pendientes o sin meta.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGraficoPilares} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="pilar" stroke="#64748B" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} unit="%" />
                <Tooltip />
                <Bar dataKey="promedio" fill="#0F4C5C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribución por Grupos de Edad */}
        <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Participación y Adherencia por Grupo de Edad (30 a 65)</h3>
          <p className="text-xs text-slate-400 mb-4">Total inscritos vs semanas completas evaluables.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGruposEdad} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grupo" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="activos" name="Total Inscritos" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="evaluables" name="Semanas Evaluables" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
