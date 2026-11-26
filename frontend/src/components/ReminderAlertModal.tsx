import React from 'react';
import { useReminders } from '../context/ReminderContext';
import { getRecordatorioContenido } from '../utils/audioAlert';
import { Bell, ArrowRight, Clock, X, Sparkles, CheckCircle2 } from 'lucide-react';

export const ReminderAlertModal: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { activeAlarm, dismissAlarm, snoozeAlarm } = useReminders();

  if (!activeAlarm) return null;

  const { recordatorio, horaActivacion, esPrueba } = activeAlarm;
  const info = getRecordatorioContenido(recordatorio.tipo_aviso);

  const handleIrAccion = () => {
    if (onNavigate) {
      if (
        recordatorio.destino_tipo === 'REGISTRO_ACTIVIDAD' ||
        recordatorio.destino_tipo === 'REGISTRO_CONTACTO' ||
        recordatorio.destino_tipo === 'CONFIRMACION_DIARIA'
      ) {
        onNavigate('habitos');
      } else if (recordatorio.destino_tipo === 'CONTROL_PROGRAMADO') {
        onNavigate('controles');
      }
    }
    dismissAlarm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-modal border-2 border-emerald-500 overflow-hidden transform transition-all animate-scaleUp">
        {/* Barra superior con gradiente */}
        <div className="bg-gradient-to-r from-health-petroleo via-teal-700 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner animate-bounce">
              <Bell className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  {esPrueba ? 'Prueba de Sistema' : 'Aviso Programado'}
                </span>
                <span className="text-xs text-white/90 font-mono font-bold">
                  {horaActivacion} (Lima)
                </span>
              </div>
              <h3 className="text-base font-extrabold leading-tight mt-0.5">
                {esPrueba ? '¡El sistema de avisos está 100% operativo!' : '¡Hora de tu Recordatorio de Salud!'}
              </h3>
            </div>
          </div>

          <button
            onClick={dismissAlarm}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Recordatorio */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-health-petroleo flex items-center justify-center shrink-0 border border-teal-100 shadow-xs">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-extrabold text-slate-800">{info.titulo}</h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {recordatorio.hora_programada}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {info.descripcion}
              </p>
            </div>
          </div>

          {/* Caja de Consejo Científico de Prevención */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="block text-emerald-950 font-bold mb-0.5">Impacto en tu Salud Cerebral:</strong>
              {info.consejo}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              onClick={handleIrAccion}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-health-petroleo hover:bg-teal-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px]"
            >
              <span>Ir a la acción directa</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!esPrueba && (
              <button
                onClick={() => snoozeAlarm(5)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Posponer 5 min</span>
              </button>
            )}

            <button
              onClick={dismissAlarm}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
