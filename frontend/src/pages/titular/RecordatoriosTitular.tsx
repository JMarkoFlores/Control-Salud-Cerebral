import React, { useState } from 'react';
import api from '../../api/client';
import { useReminders } from '../../context/ReminderContext';
import { Recordatorio } from '../../types';
import { Bell, Plus, Trash2, Power, Clock, ArrowRight, Volume2, ShieldCheck, Laptop } from 'lucide-react';

export const RecordatoriosTitular: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    recordatorios,
    loading,
    horaLimaActual,
    desktopPermission,
    reloadRecordatorios,
    triggerTestAlarm,
    requestPermission,
  } = useReminders();

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    tipo_aviso: 'ACTIVIDAD_FISICA',
    hora_programada: '07:30',
    dias_semana: 'L,M,X,J,V',
    destino_tipo: 'REGISTRO_ACTIVIDAD',
  });

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/recordatorios', form);
      setShowModal(false);
      await reloadRecordatorios();
    } catch {
      alert('Error al programar recordatorio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (id: number, estadoActual: 'ACTIVO' | 'PAUSADO') => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    try {
      await api.patch(`/recordatorios/${id}/estado`, { estado: nuevoEstado });
      await reloadRecordatorios();
    } catch {
      alert('Error al actualizar estado.');
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este recordatorio?')) return;
    try {
      await api.delete(`/recordatorios/${id}`);
      await reloadRecordatorios();
    } catch {
      alert('Error al eliminar recordatorio.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-health-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Mis Recordatorios Configurables</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Avisos programables con destino directo, sonido de campana y notificaciones en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerTestAlarm()}
            className="px-3 py-2 rounded-xl border border-emerald-500/60 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Probar sonido y modal de aviso"
          >
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <span>Probar Alerta Ahora</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Barra de Estado del Motor de Notificaciones en Vivo */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white border border-teal-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-health-petroleo text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-health-dark">Motor de Avisos Activo</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sincronizado
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Hora oficial en Perú: <strong className="text-health-petroleo font-mono">{horaLimaActual}</strong>. Las alarmas sonarán automáticamente al llegar la hora elegida.
            </p>
          </div>
        </div>

        {desktopPermission !== 'granted' && desktopPermission !== 'unsupported' && (
          <button
            onClick={requestPermission}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            title="Activar notificaciones del sistema operativo"
          >
            <Laptop className="w-4 h-4 text-health-petroleo" />
            <span>Activar Avisos de Escritorio</span>
          </button>
        )}

        {desktopPermission === 'granted' && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Notificaciones de escritorio permitidas</span>
          </div>
        )}
      </div>

      {/* Grid de Recordatorios */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Cargando tus recordatorios...
        </div>
      ) : recordatorios.length === 0 ? (
        <div className="bg-white rounded-3xl border border-health-border p-12 text-center shadow-card">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">No tienes recordatorios configurados</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Programa recordatorios a tu medida para asegurarte de realizar tu caminata, contactar a un familiar o confirmar tus hábitos diarios.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primer recordatorio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordatorios.map((r) => {
            const isActivo = r.estado === 'ACTIVO';
            return (
              <div
                key={r.recordatorio_id}
                className={`bg-white rounded-2xl border p-5 shadow-card flex flex-col justify-between transition-all ${
                  isActivo ? 'border-health-border hover:shadow-md' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isActivo ? 'bg-teal-50 text-health-petroleo' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-800">
                        {r.tipo_aviso.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleEstado(r.recordatorio_id, r.estado)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                        isActivo
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={isActivo ? 'Hacer clic para pausar este recordatorio' : 'Hacer clic para activar'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isActivo ? 'ACTIVO' : 'PAUSADO'}</span>
                    </button>
                  </div>

                  <div className="my-4">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-2xl font-extrabold text-health-dark font-mono">
                          {r.hora_programada}
                        </span>
                      </div>

                      <button
                        onClick={() => triggerTestAlarm(r)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1"
                        title="Probar sonido y aviso de este recordatorio"
                      >
                        <Volume2 className="w-3 h-3 text-teal-600" />
                        <span>Probar aviso</span>
                      </button>
                    </div>

                    <span className="text-xs text-slate-500 block mt-1.5">
                      Días activos: <strong className="text-slate-700">{r.dias_semana}</strong>
                    </span>
                    <span className="text-[11px] text-teal-700 font-medium block mt-1">
                      Destino: {r.destino_tipo.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {onNavigate && (
                    <button
                      onClick={() => {
                        if (
                          r.destino_tipo === 'REGISTRO_ACTIVIDAD' ||
                          r.destino_tipo === 'REGISTRO_CONTACTO' ||
                          r.destino_tipo === 'CONFIRMACION_DIARIA'
                        ) {
                          onNavigate('habitos');
                        } else if (r.destino_tipo === 'CONTROL_PROGRAMADO') {
                          onNavigate('controles');
                        }
                      }}
                      className="text-xs font-bold text-health-petroleo hover:underline flex items-center gap-1"
                    >
                      <span>Ir a la acción</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEliminar(r.recordatorio_id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
                    title="Eliminar recordatorio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear Recordatorio */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-modal border border-health-border">
            <h3 className="text-base font-bold text-slate-800 mb-4">Programar Nuevo Recordatorio</h3>
            <form onSubmit={handleCrear} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Aviso</label>
                <select
                  value={form.tipo_aviso}
                  onChange={(e) => {
                    const t = e.target.value;
                    let dest = 'REGISTRO_ACTIVIDAD';
                    if (t === 'CONTACTO_SOCIAL') dest = 'REGISTRO_CONTACTO';
                    else if (t === 'CONFIRMACION_DIARIA') dest = 'CONFIRMACION_DIARIA';
                    else if (t === 'CONTROL_SALUD') dest = 'CONTROL_PROGRAMADO';
                    setForm({ ...form, tipo_aviso: t, destino_tipo: dest });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                >
                  <option value="ACTIVIDAD_FISICA">Actividad Física (Caminata/Deporte)</option>
                  <option value="CONTACTO_SOCIAL">Contacto Social</option>
                  <option value="CONFIRMACION_DIARIA">Confirmación Diaria Nocturna</option>
                  <option value="CONTROL_SALUD">Control de Salud Cardiometabólico</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Hora Programada (Horario Lima)</label>
                  <span className="text-[10px] text-teal-700 font-mono font-bold">
                    Hora actual: {horaLimaActual}
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={form.hora_programada}
                  onChange={(e) => setForm({ ...form, hora_programada: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Días de la Semana</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, dias_semana: 'L,M,X,J,V' })}
                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Lun a Vie
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, dias_semana: 'L,M,X,J,V,S,D' })}
                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Todos los días
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, dias_semana: 'M,J,S' })}
                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Mar, Jue, Sáb
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, dias_semana: 'S,D' })}
                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Fines de sem.
                  </button>
                </div>
                <input
                  type="text"
                  value={form.dias_semana}
                  onChange={(e) => setForm({ ...form, dias_semana: e.target.value.toUpperCase() })}
                  placeholder="Ej. L,M,X,J,V o L,M,X,J,V,S,D"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo font-mono"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Aviso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
