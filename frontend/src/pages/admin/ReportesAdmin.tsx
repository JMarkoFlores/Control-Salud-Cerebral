import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { FileSpreadsheet, Download, Printer, Filter, CheckCircle2, AlertCircle, Database, RefreshCw } from 'lucide-react';

// Colores oficiales del informe: Óptimo/Bueno, Regular, Malo, pendiente y sin meta.
const badgeEstado = (estado: string) => {
  if (estado === 'Óptimo' || estado === 'Bueno') return 'bg-emerald-100 text-emerald-800';
  if (estado === 'Regular') return 'bg-amber-100 text-amber-800';
  if (estado === 'Malo') return 'bg-rose-100 text-rose-800';
  if (estado === 'Sin meta') return 'bg-gray-100 text-gray-500';
  return 'bg-slate-200 text-slate-600';
};

export const ReportesAdmin: React.FC = () => {  const [tipoReporte, setTipoReporte] = useState<'actividad' | 'social' | 'cardio'>('actividad');
  const [reporteData, setReporteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refrescandoMart, setRefrescandoMart] = useState(false);
  const [mensajeMart, setMensajeMart] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const actualizarDataMart = async () => {
    try {
      setRefrescandoMart(true);
      setMensajeMart(null);
      const res = await api.post('/admin/datamart/refresh');
      const data = res.data.data;
      setMensajeMart({
        tipo: 'ok',
        texto: `Data Mart actualizado: ${data.filas.habitos} filas de hábitos y ${data.filas.controles} de controles (${(data.duracionMs / 1000).toFixed(1)} s). Corte: ${data.fechaCorte || 'sin datos'}.`,
      });
      fetchReporte();
    } catch (e: any) {
      setMensajeMart({
        tipo: 'error',
        texto: e?.response?.data?.error?.message || 'No se pudo actualizar el Data Mart.',
      });
    } finally {
      setRefrescandoMart(false);
    }
  };

  const fetchReporte = async () => {
    try {
      setLoading(true);
      let endpoint = '/admin/reportes/actividad';
      if (tipoReporte === 'social') endpoint = '/admin/reportes/social';
      else if (tipoReporte === 'cardio') endpoint = '/admin/reportes/cardio';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setReporteData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, [tipoReporte]);

  // Función para exportar a CSV
  const exportarCSV = () => {
    if (!reporteData || !reporteData.filas || reporteData.filas.length === 0) return;

    let headers = '';
    let rows: string[] = [];

    if (tipoReporte === 'actividad') {
      headers = 'Codigo_Interno,Edad,Distrito,Semana_Inicio,Meta_Minutos,Minutos_Logrados,Porcentaje_CAF,Estado,Es_Evaluable';
      rows = reporteData.filas.map((f: any) =>
        `"${f.codigo_interno}",${f.edad},"${f.distrito}","${f.inicio_semana}",${f.meta_minutos},${f.minutos_logrados},"${f.porcentajeTexto}","${f.estado}",${f.esEvaluable ? 'SI' : 'NO'}`
      );
    } else if (tipoReporte === 'social') {
      headers = 'Codigo_Interno,Edad,Distrito,Semana_Inicio,Meta_Dias,Dias_Con_Contacto,Porcentaje_CCS,Estado,Es_Evaluable';
      rows = reporteData.filas.map((f: any) =>
        `"${f.codigo_interno}",${f.edad},"${f.distrito}","${f.inicio_semana}",${f.meta_dias},${f.dias_con_contacto},"${f.porcentajeTexto}","${f.estado}",${f.esEvaluable ? 'SI' : 'NO'}`
      );
    } else {
      headers = 'Codigo_Interno,Edad,Distrito,Mes_Periodo,Total_Programados,Controles_En_Meta,Porcentaje_FCM,Estado,Es_Evaluable';
      rows = reporteData.filas.map((f: any) =>
        `"${f.codigo_interno}",${f.edad},"${f.distrito}","${f.mes_periodo}",${f.total_programados},${f.controles_en_meta},"${f.porcentajeTexto}","${f.estado}",${f.esEvaluable ? 'SI' : 'NO'}`
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_${tipoReporte}_piloto_trujillo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Reportes Analíticos Oficiales</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas oficiales del piloto con subtotales evaluables y anonimización mediante código P-00X.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={actualizarDataMart}
            disabled={refrescandoMart}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Ejecuta el ETL 03 y 04 para actualizar la base dimensional"
          >
            {refrescandoMart ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span>{refrescandoMart ? 'Actualizando...' : 'Actualizar Data Mart'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-health-petroleo" />
            <span>Imprimir / PDF</span>
          </button>
          <button
            onClick={exportarCSV}
            className="px-3.5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {mensajeMart && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            mensajeMart.tipo === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {mensajeMart.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{mensajeMart.texto}</span>
        </div>
      )}

      {/* Selector de Tipo de Reporte */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTipoReporte('actividad')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            tipoReporte === 'actividad'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Semanal Actividad Física (CAF)
        </button>
        <button
          onClick={() => setTipoReporte('social')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            tipoReporte === 'social'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Semanal Contacto Social (CCS)
        </button>
        <button
          onClick={() => setTipoReporte('cardio')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            tipoReporte === 'cardio'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Mensual Cardiometabólico (FCM)
        </button>
      </div>

      {/* Subtotales Evaluables (Regla de Negocio Crítica) */}
      {reporteData && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Participantes</span>
            <span className="text-xl font-extrabold text-health-dark">{reporteData.totalRegistros}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Semanas Evaluables</span>
            <span className="text-xl font-extrabold text-emerald-600">{reporteData.totalEvaluables}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Con Datos Pendientes</span>
            <span className="text-xl font-extrabold text-amber-600">{reporteData.totalPendientes || 0}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-health-petroleo uppercase block">Subtotal Evaluable Oficial</span>
            <span className="text-xl font-extrabold text-health-dark">
              {reporteData.subtotalEvaluable?.promedioTexto}
            </span>
          </div>
        </div>
      )}

      {/* Tabla del Reporte */}
      <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código Titular</th>
                <th className="py-3 px-4">Edad</th>
                <th className="py-3 px-4">Distrito</th>
                <th className="py-3 px-4">{tipoReporte === 'cardio' ? 'Mes Periodo' : 'Semana Inicio'}</th>
                {tipoReporte === 'actividad' && (
                  <>
                    <th className="py-3 px-4">Meta Minutos</th>
                    <th className="py-3 px-4">Minutos Logrados</th>
                    <th className="py-3 px-4">Cumplimiento CAF</th>
                  </>
                )}
                {tipoReporte === 'social' && (
                  <>
                    <th className="py-3 px-4">Meta Días</th>
                    <th className="py-3 px-4">Días con Contacto</th>
                    <th className="py-3 px-4">Cumplimiento CCS</th>
                  </>
                )}
                {tipoReporte === 'cardio' && (
                  <>
                    <th className="py-3 px-4">Total Programados</th>
                    <th className="py-3 px-4">En Meta</th>
                    <th className="py-3 px-4">Cumplimiento FCM</th>
                  </>
                )}
                <th className="py-3 px-4">Estado Oficial</th>
                <th className="py-3 px-4">Evaluable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reporteData?.filas?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No hay registros para este periodo.
                  </td>
                </tr>
              ) : (
                reporteData?.filas?.map((f: any, idx: number) => (
                  <tr key={idx} className={!f.esEvaluable ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/50'}>
                    <td className="py-3 px-4 font-mono font-bold text-health-petroleo">{f.codigo_interno}</td>
                    <td className="py-3 px-4 text-slate-600">{f.edad} a</td>
                    <td className="py-3 px-4 text-slate-600">{f.distrito}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {f.inicio_semana || f.mes_periodo}
                    </td>

                    {tipoReporte === 'actividad' && (
                      <>
                        <td className="py-3 px-4 font-semibold text-slate-700">{f.meta_minutos} min</td>
                        <td className="py-3 px-4 font-bold text-health-petroleo">{f.minutos_logrados} min</td>
                        <td className="py-3 px-4 font-extrabold text-health-dark">{f.porcentajeTexto}</td>
                      </>
                    )}

                    {tipoReporte === 'social' && (
                      <>
                        <td className="py-3 px-4 font-semibold text-slate-700">{f.meta_dias} días</td>
                        <td className="py-3 px-4 font-bold text-health-petroleo">{f.dias_con_contacto} días</td>
                        <td className="py-3 px-4 font-extrabold text-health-dark">{f.porcentajeTexto}</td>
                      </>
                    )}

                    {tipoReporte === 'cardio' && (
                      <>
                        <td className="py-3 px-4 font-semibold text-slate-700">{f.total_programados}</td>
                        <td className="py-3 px-4 font-bold text-health-petroleo">{f.controles_en_meta}</td>
                        <td className="py-3 px-4 font-extrabold text-health-dark">{f.porcentajeTexto}</td>
                      </>
                    )}

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeEstado(f.estado)}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[11px]">
                      {f.esEvaluable ? (
                        <span className="text-emerald-600">✓ Sí</span>
                      ) : (
                        <span className="text-slate-400">✗ No</span>
                      )}
                    </td>
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
