import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Alerta } from '../../types';
import { Bell, CheckCircle2, ShieldAlert, ArrowRight, Filter } from 'lucide-react';

export const AlertasTitular: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [filtro, setFiltro] = useState<'PENDIENTE' | 'ATENDIDA' | ''>('PENDIENTE');
  const [loading, setLoading] = useState(true);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const url = filtro ? `/alertas/mis-alertas?estado=${filtro}` : '/alertas/mis-alertas';
      const res = await api.get(url);
      if (res.data.success) {
        setAlertas(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, [filtro]);

  const handleMarcarAtendida = async (id: number) => {
    try {
      await api.patch(`/alertas/${id}/atendida`);
      fetchAlertas();
    } catch {
      alert('Error al marcar alerta.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-health-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Bandeja de Alertas y Motivación Diaria</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mensajes del motor automático para cuidar la constancia de tus hábitos.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFiltro('PENDIENTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro === 'PENDIENTE' ? 'bg-white text-health-petroleo shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltro('ATENDIDA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro === 'ATENDIDA' ? 'bg-white text-health-petroleo shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Atendidas
          </button>
          <button
            onClick={() => setFiltro('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro === '' ? 'bg-white text-health-petroleo shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {alertas.length === 0 ? (
          <div className="bg-white rounded-3xl border border-health-border p-12 text-center shadow-card">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h4 className="text-base font-bold text-slate-800">No hay alertas en esta bandeja</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              ¡Estás al día con tus confirmaciones y controles!
            </p>
          </div>
        ) : (
          alertas.map((a) => {
            const isPendiente = a.estado === 'PENDIENTE';
            return (
              <div
                key={a.alerta_id}
                className={`bg-white rounded-2xl border p-5 shadow-card transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isPendiente ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      a.motivo === 'Motivación diaria'
                        ? 'bg-teal-100 text-health-petroleo'
                        : isPendiente
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-health-petroleo">
                        {a.motivo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(a.fecha_emision).toLocaleString('es-PE')}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed max-w-2xl">
                      {a.mensaje || a.nombre_regla}
                    </p>

                    <span className="text-[10px] text-slate-400 block mt-1.5">
                      Regla: {a.nombre_regla} • Seguimiento: {a.tipo_seguimiento.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('habitos')}
                      className="px-3 py-1.5 rounded-xl border border-health-petroleo text-health-petroleo text-xs font-bold hover:bg-teal-50 transition-colors flex items-center gap-1"
                    >
                      <span>Ir al hábito</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isPendiente && (
                    <button
                      onClick={() => handleMarcarAtendida(a.alerta_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-health-petroleo text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marcar atendida</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
