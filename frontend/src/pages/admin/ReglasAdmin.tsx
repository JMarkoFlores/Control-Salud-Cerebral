import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Sliders, Play, CheckCircle2, AlertTriangle, Power, History } from 'lucide-react';

export const ReglasAdmin: React.FC = () => {
  const [reglas, setReglas] = useState<any[]>([]);
  const [ejecuciones, setEjecuciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [mensajeEjecucion, setMensajeEjecucion] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reglasRes, ejecRes] = await Promise.all([
        api.get('/admin/reglas'),
        api.get('/admin/ejecuciones'),
      ]);
      if (reglasRes.data.success) setReglas(reglasRes.data.data);
      if (ejecRes.data.success) setEjecuciones(ejecRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRegla = async (id: number, activa: boolean) => {
    try {
      await api.patch(`/admin/reglas/${id}/toggle`, { activa: !activa });
      fetchData();
    } catch {
      alert('Error al modificar regla.');
    }
  };

  const handleEjecutarMotor = async () => {
    try {
      setEjecutando(true);
      setMensajeEjecucion(null);
      const res = await api.post('/alertas/ejecutar-motor');
      if (res.data.success) {
        setMensajeEjecucion(`Motor ejecutado: ${res.data.data.totalGeneradas} alertas nuevas generadas.`);
        fetchData();
      }
    } catch (err: any) {
      setMensajeEjecucion('Error al ejecutar el motor.');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Motor de Reglas y Auditoría de Alertas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatización de avisos preventivos, prevención de duplicados y registro histórico de ejecuciones.
          </p>
        </div>

        <button
          onClick={handleEjecutarMotor}
          disabled={ejecutando}
          className="px-4 py-2.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${ejecutando ? 'animate-spin' : ''}`} />
          <span>{ejecutando ? 'Evaluando Reglas...' : 'Ejecutar Motor Ahora'}</span>
        </button>
      </div>

      {mensajeEjecucion && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{mensajeEjecucion}</span>
        </div>
      )}

      {/* Catálogo de Reglas */}
      <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Reglas Automáticas Configuradas</h3>
          <span className="text-xs text-slate-400">Total: {reglas.length} reglas activas en el piloto</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nombre de la Regla</th>
                <th className="py-3 px-4">Frecuencia</th>
                <th className="py-3 px-4">Tipo Activación</th>
                <th className="py-3 px-4">Versión</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reglas.map((r) => (
                <tr key={r.regla_id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-health-petroleo">{r.codigo_regla}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{r.nombre_regla}</td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">{r.frecuencia}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{r.tipo_activacion}</td>
                  <td className="py-3 px-4 text-slate-500">v{r.version_regla}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {r.activa ? 'Activa' : 'Desactivada'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleRegla(r.regla_id, r.activa)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                      title={r.activa ? 'Desactivar regla' : 'Activar regla'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditoría de Ejecuciones */}
      <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm">Historial de Auditoría de Ejecuciones</h3>
          </div>
          <span className="text-xs text-slate-400">Tabla: ejecucion_regla</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Regla Evaluada</th>
                <th className="py-3 px-4">Resultado</th>
                <th className="py-3 px-4">Alertas Generadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ejecuciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No se registran ejecuciones todavía.
                  </td>
                </tr>
              ) : (
                ejecuciones.map((e) => (
                  <tr key={e.ejecucion_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">#{e.ejecucion_id}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {new Date(e.fecha_ejecucion).toLocaleString('es-PE')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{e.codigo_regla}: {e.nombre_regla}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        e.resultado_estado === 'EXITOSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {e.resultado_estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-health-petroleo">{e.alertas_generadas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
