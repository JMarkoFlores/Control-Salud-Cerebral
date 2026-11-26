import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Alerta } from '../../types';
import { Bell, CheckCircle2 } from 'lucide-react';
import { getAlertaVisualConfig } from '../../utils/alertStyles';

export const AlertasAcompanante: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alertas/mis-alertas');
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
  }, []);

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
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Bandeja de Alertas para Acompañante</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Notificaciones recibidas sobre la adherencia y controles del titular que acompañas.
        </p>
      </div>

      <div className="space-y-3">
        {alertas.length === 0 ? (
          <div className="bg-white rounded-3xl border border-health-border p-12 text-center shadow-card">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h4 className="text-base font-bold text-slate-800">Todo al día</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No tienes alertas pendientes de revisión para tu familiar.
            </p>
          </div>
        ) : (
          alertas.map((a) => {
            const isPendiente = a.estado === 'PENDIENTE';
            const cfg = getAlertaVisualConfig(a);
            const IconComponent = cfg.Icon;
            return (
              <div
                key={a.alerta_id}
                className={`rounded-2xl border p-5 shadow-card transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isPendiente ? `${cfg.cardClass} ${cfg.borderAccentClass}` : 'bg-white border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${cfg.iconBgClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cfg.badgeClass}`}>{cfg.etiqueta}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(a.fecha_emision).toLocaleString('es-PE')}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
                      {a.mensaje || a.nombre_regla}
                    </p>
                  </div>
                </div>

                {isPendiente && (
                  <button
                    onClick={() => handleMarcarAtendida(a.alerta_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-health-petroleo text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar como vista</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
