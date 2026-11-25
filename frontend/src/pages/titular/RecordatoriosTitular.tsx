import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Recordatorio } from '../../types';
import { Bell, Plus, Trash2, Power, Clock, ArrowRight } from 'lucide-react';

export const RecordatoriosTitular: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    tipo_aviso: 'ACTIVIDAD_FISICA',
    hora_programada: '07:30',
    dias_semana: 'L,M,X,J,V',
    destino_tipo: 'REGISTRO_ACTIVIDAD',
  });

  const fetchRecordatorios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recordatorios');
      if (res.data.success) {
        setRecordatorios(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordatorios();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/recordatorios', form);
      setShowModal(false);
      fetchRecordatorios();
    } catch {
      alert('Error al programar recordatorio.');
    }
  };

  const handleToggleEstado = async (id: number, estadoActual: 'ACTIVO' | 'PAUSADO') => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    try {
      await api.patch(`/recordatorios/${id}/estado`, { estado: nuevoEstado });
      fetchRecordatorios();
    } catch {
      alert('Error al actualizar estado.');
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este recordatorio?')) return;
    try {
      await api.delete(`/recordatorios/${id}`);
      fetchRecordatorios();
    } catch {
      alert('Error al eliminar recordatorio.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-health-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Mis Recordatorios Configurables</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Avisos programables con destino directo y control de pausa.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Recordatorio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordatorios.map((r) => {
          const isActivo = r.estado === 'ACTIVO';
          return (
            <div
              key={r.recordatorio_id}
              className={`bg-white rounded-2xl border p-5 shadow-card flex flex-col justify-between transition-all ${
                isActivo ? 'border-health-border' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActivo ? 'bg-teal-50 text-health-petroleo' : 'bg-slate-200 text-slate-500'
                    }`}>
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
                  >
                    <Power className="w-3 h-3" />
                    <span>{isActivo ? 'ACTIVO' : 'PAUSADO'}</span>
                  </button>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-extrabold text-health-dark font-mono">
                      {r.hora_programada}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-1.5">
                    Días activos: <span className="font-semibold text-slate-700">{r.dias_semana}</span>
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
                      if (r.destino_tipo === 'REGISTRO_ACTIVIDAD' || r.destino_tipo === 'REGISTRO_CONTACTO' || r.destino_tipo === 'CONFIRMACION_DIARIA') {
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
                <label className="block font-bold text-slate-700 mb-1">Hora Programada</label>
                <input
                  type="time"
                  required
                  value={form.hora_programada}
                  onChange={(e) => setForm({ ...form, hora_programada: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Días de la Semana</label>
                <input
                  type="text"
                  value={form.dias_semana}
                  onChange={(e) => setForm({ ...form, dias_semana: e.target.value })}
                  placeholder="Ej. L,M,X,J,V o L,M,X,J,V,S,D"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
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
                  className="flex-1 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-md"
                >
                  Guardar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
