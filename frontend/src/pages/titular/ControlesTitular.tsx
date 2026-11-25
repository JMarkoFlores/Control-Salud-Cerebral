import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ControlProgramado } from '../../types';
import { HeartPulse, Plus, Printer, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { formatDateTimePE, getLocalDatetimeString } from '../../utils/formatters';

export const ControlesTitular: React.FC = () => {
  const [controles, setControles] = useState<ControlProgramado[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalResultado, setShowModalResultado] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const [formResultado, setFormResultado] = useState({
    control_id: '' as string | number,
    tipo_control: 'Presión arterial',
    fecha_medicion: getLocalDatetimeString(),
    valor_sistolica: 118,
    valor_diastolica: 78,
    valor_numerico: 90,
    unidad: 'mmHg',
    origen: 'Autorreporte',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mesRes, histRes] = await Promise.all([
        api.get('/controles/mes'),
        api.get('/controles/historial'),
      ]);

      if (mesRes.data.success) setControles(mesRes.data.data.controles || []);
      if (histRes.data.success) setHistorial(histRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrearResultado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        control_id: formResultado.control_id ? parseInt(String(formResultado.control_id), 10) : null,
        tipo_control: formResultado.tipo_control,
        fecha_medicion: formResultado.fecha_medicion.length === 16 ? `${formResultado.fecha_medicion}:00` : formResultado.fecha_medicion,
        unidad: formResultado.unidad,
        origen: formResultado.origen,
      };

      if (formResultado.tipo_control === 'Presión arterial') {
        payload.valor_sistolica = parseFloat(String(formResultado.valor_sistolica));
        payload.valor_diastolica = parseFloat(String(formResultado.valor_diastolica));
      } else {
        payload.valor_numerico = parseFloat(String(formResultado.valor_numerico));
      }

      await api.post('/controles/resultado', payload);
      setShowModalResultado(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al guardar resultado');
    }
  };

  const handleDescargarResumen = async () => {
    try {
      const res = await api.get('/controles/resumen-consulta');
      if (res.data.success) {
        setPrintData(res.data.data);
        setShowPrintView(true);
      }
    } catch {
      alert('Error al generar resumen para consulta.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-health-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Controles Cardiometabólicos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Presión arterial, glucosa, colesterol LDL e IMC. Protección cerebrovascular activa.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDescargarResumen}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4 text-health-petroleo" />
            <span>Descargar Resumen Médico</span>
          </button>
          <button
            onClick={() => {
              setFormResultado({
                control_id: '',
                tipo_control: 'Presión arterial',
                fecha_medicion: getLocalDatetimeString(),
                valor_sistolica: 120,
                valor_diastolica: 80,
                valor_numerico: 90,
                unidad: 'mmHg',
                origen: 'Autorreporte',
              });
              setShowModalResultado(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Medición</span>
          </button>
        </div>
      </div>

      {/* Agenda de Controles del Mes */}
      <div>
        <h3 className="font-bold text-slate-800 text-sm mb-3">Agenda Mensual de Factores de Riesgo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {controles.map((c) => {
            const tieneResultado = c.resultado_id !== null && c.resultado_id !== undefined;
            const enMeta = Boolean(c.dentro_de_meta);

            return (
              <div
                key={c.control_id}
                className="bg-white rounded-2xl border border-health-border p-4 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">{c.tipo_control}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !tieneResultado ? 'bg-amber-100 text-amber-800' :
                      enMeta ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {!tieneResultado ? 'Pendiente' : enMeta ? '✓ En Meta' : 'Fuera de Meta'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-slate-400 block uppercase">Criterio Clínico</span>
                    <span className="text-xs font-semibold text-slate-700">{c.criterio_meta_texto}</span>
                  </div>

                  <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Última Lectura de Referencia</span>
                    {tieneResultado ? (
                      <span className="text-base font-extrabold text-health-dark block mt-0.5">
                        {c.tipo_control === 'Presión arterial'
                          ? `${c.valor_sistolica}/${c.valor_diastolica} ${c.unidad}`
                          : `${c.valor_numerico} ${c.unidad}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin medición registrada</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFormResultado({
                      control_id: c.control_id,
                      tipo_control: c.tipo_control,
                      fecha_medicion: getLocalDatetimeString(),
                      valor_sistolica: 118,
                      valor_diastolica: 78,
                      valor_numerico: c.tipo_control === 'Glucosa' ? 90 : c.tipo_control === 'Colesterol LDL' ? 95 : 23.5,
                      unidad: c.unidad,
                      origen: 'Autorreporte',
                    });
                    setShowModalResultado(true);
                  }}
                  className="mt-4 py-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-health-petroleo text-slate-700 font-bold text-xs transition-colors w-full"
                >
                  {tieneResultado ? 'Actualizar Medición' : 'Registrar Resultado'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial Clínico de Mediciones */}
      <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Historial de Mediciones Clínicas</h3>
          <span className="text-xs text-slate-400">Incluye mediciones con meta y libres sin meta</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Fecha Medición</th>
                <th className="py-3 px-4">Factor</th>
                <th className="py-3 px-4">Valor Obtenido</th>
                <th className="py-3 px-4">Meta Asociada</th>
                <th className="py-3 px-4">Estado Meta</th>
                <th className="py-3 px-4">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay mediciones registradas en el historial.
                  </td>
                </tr>
              ) : (
                historial.map((h) => (
                  <tr key={h.resultado_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium">
                      {formatDateTimePE(h.fecha_medicion)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{h.tipo_control}</td>
                    <td className="py-3 px-4 font-bold text-health-petroleo">
                      {h.tipo_control === 'Presión arterial'
                        ? `${h.valor_sistolica}/${h.valor_diastolica} ${h.unidad}`
                        : `${h.valor_numerico} ${h.unidad}`}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{h.criterio_meta_texto || 'Libre (Sin meta)'}</td>
                    <td className="py-3 px-4">
                      {h.dentro_de_meta === null || h.dentro_de_meta === undefined ? (
                        <span className="text-[10px] font-semibold text-slate-400">Sin meta</span>
                      ) : Boolean(h.dentro_de_meta) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          En meta
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Fuera de meta
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{h.origen}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* MODAL REGISTRO RESULTADO */}
      {/* -------------------------------------------------------------------- */}
      {showModalResultado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-modal border border-health-border">
            <h3 className="text-base font-bold text-slate-800 mb-1">Registrar Medición Cardiometabólica</h3>
            <p className="text-xs text-slate-500 mb-4">
              Puedes asociarla a un control programado o guardarla libremente sin meta.
            </p>

            <form onSubmit={handleCrearResultado} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vincular a Meta del Mes (Agenda Médica)
                </label>
                <select
                  value={formResultado.control_id || ''}
                  onChange={(e) => {
                    const cid = e.target.value;
                    if (!cid) {
                      setFormResultado({ ...formResultado, control_id: '' });
                    } else {
                      const found = controles.find(c => String(c.control_id) === cid);
                      if (found) {
                        setFormResultado({
                          ...formResultado,
                          control_id: found.control_id,
                          tipo_control: found.tipo_control,
                          unidad: found.unidad,
                        });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo font-semibold text-slate-700 bg-slate-50"
                >
                  <option value="">Medición libre (sin meta mensual)</option>
                  {controles.map((c) => (
                    <option key={c.control_id} value={c.control_id}>
                      {c.tipo_control} • Meta: {c.criterio_meta_texto}
                    </option>
                  ))}
                </select>
                {formResultado.control_id ? (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 mt-2 font-medium">
                    ✓ Vinculado a meta: <strong>{controles.find(c => String(c.control_id) === String(formResultado.control_id))?.criterio_meta_texto}</strong>. Al guardar, se evaluará automáticamente si está En Meta y actualizará tu indicador <strong>FCM</strong>.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded-xl p-2 mt-1.5">
                    ℹ Medición libre: se guardará en tu historial clínico sin calificar meta mensual.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Factor</label>
                <select
                  value={formResultado.tipo_control}
                  disabled={Boolean(formResultado.control_id)}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    let u = 'mmHg';
                    if (tipo === 'Glucosa') u = 'mg/dL';
                    else if (tipo === 'Colesterol LDL') u = 'mg/dL';
                    else if (tipo === 'IMC') u = 'kg/m²';
                    setFormResultado({ ...formResultado, tipo_control: tipo, unidad: u });
                  }}
                  className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo ${
                    formResultado.control_id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="Presión arterial">Presión arterial</option>
                  <option value="Glucosa">Glucosa</option>
                  <option value="Colesterol LDL">Colesterol LDL</option>
                  <option value="IMC">IMC (Índice de Masa Corporal)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de la Toma</label>
                <input
                  type="datetime-local"
                  required
                  value={formResultado.fecha_medicion}
                  onChange={(e) => setFormResultado({ ...formResultado, fecha_medicion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              {/* Par Sistólica / Diastólica si es Presión Arterial */}
              {formResultado.tipo_control === 'Presión arterial' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sistólica (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formResultado.valor_sistolica}
                      onChange={(e) => setFormResultado({ ...formResultado, valor_sistolica: parseFloat(e.target.value) })}
                      placeholder="Ej. 120"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Diastólica (mmHg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formResultado.valor_diastolica}
                      onChange={(e) => setFormResultado({ ...formResultado, valor_diastolica: parseFloat(e.target.value) })}
                      placeholder="Ej. 80"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor Medido ({formResultado.unidad})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formResultado.valor_numerico}
                    onChange={(e) => setFormResultado({ ...formResultado, valor_numerico: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Origen de la Medición</label>
                <select
                  value={formResultado.origen}
                  onChange={(e) => setFormResultado({ ...formResultado, origen: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                >
                  <option value="Autorreporte">Tensiómetro / Glucómetro en Casa</option>
                  <option value="Laboratorio">Examen de Laboratorio Clínico</option>
                  <option value="Dispositivo">Farmacia / Posta Médica</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalResultado(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-md"
                >
                  Guardar Medición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* VISTA IMPRIMIBLE / RESUMEN MEDICO */}
      {/* -------------------------------------------------------------------- */}
      {showPrintView && printData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-modal border border-health-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-health-dark">Resumen de Controles para Consulta Médica</h3>
                <p className="text-xs text-slate-500">Programa de Prevención Cognitiva (G1) • Trujillo</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs grid grid-cols-2 gap-2">
              <p><span className="font-bold text-slate-700">Paciente:</span> {printData.paciente.nombres} {printData.paciente.apellidos}</p>
              <p><span className="font-bold text-slate-700">Código Anonimizado:</span> {printData.paciente.codigo_interno}</p>
              <p><span className="font-bold text-slate-700">Fecha de Emisión:</span> {printData.fechaEmision}</p>
              <p><span className="font-bold text-slate-700">Total Mediciones:</span> {printData.totalMediciones}</p>
            </div>

            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Últimos Registros Clínicos</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Parámetro</th>
                      <th className="py-2.5 px-3">Valor</th>
                      <th className="py-2.5 px-3">Meta Sugerida</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printData.mediciones.map((m: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-mono">{m.fecha}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.tipo}</td>
                        <td className="py-2 px-3 font-bold text-health-petroleo">{m.valorTexto}</td>
                        <td className="py-2 px-3 text-slate-500">{m.criterioMeta}</td>
                        <td className="py-2 px-3 font-bold text-[11px]">{m.enMeta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => setShowPrintView(false)}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-xs"
            >
              Cerrar Vista de Impresión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
