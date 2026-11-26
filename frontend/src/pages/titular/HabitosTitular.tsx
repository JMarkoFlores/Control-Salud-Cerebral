import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { SesionFisica, ContactoSocial, PanelDia } from '../../types';
import { Activity, Users, Plus, CheckCircle2, XCircle, Trash2, Calendar, Target, Clock, AlertCircle, Lock } from 'lucide-react';
import { formatDateTimePE, getLocalDatetimeString } from '../../utils/formatters';

export const HabitosTitular: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'panel' | 'fisica' | 'social' | 'metas'>('panel');
  const [panelDias, setPanelDias] = useState<PanelDia[]>([]);
  const [sesiones, setSesiones] = useState<SesionFisica[]>([]);
  const [contactos, setContactos] = useState<ContactoSocial[]>([]);
  const [metasInfo, setMetasInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showModalFisica, setShowModalFisica] = useState(false);
  const [showModalSocial, setShowModalSocial] = useState(false);

  // Forms
  const [formFisica, setFormFisica] = useState({
    fecha_hora: getLocalDatetimeString(),
    tipo_actividad: 'Caminata',
    duracion_minutos: 30,
    origen: 'Autorreporte',
  });

  const [formSocial, setFormSocial] = useState({
    fecha_hora: getLocalDatetimeString(),
    modalidad: 'Conversación presencial',
    origen: 'Autorreporte',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [panelRes, sesionesRes, contactosRes, metasRes] = await Promise.all([
        api.get('/habitos/confirmacion/semana'),
        api.get('/habitos/fisica'),
        api.get('/habitos/social'),
        api.get('/habitos/metas'),
      ]);

      if (panelRes.data.success) setPanelDias(panelRes.data.data.panel || []);
      if (sesionesRes.data.success) setSesiones(sesionesRes.data.data || []);
      if (contactosRes.data.success) setContactos(contactosRes.data.data || []);
      if (metasRes.data.success) setMetasInfo(metasRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Crear Sesión Física
  const handleCrearFisica = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formFisica,
        fecha_hora: formFisica.fecha_hora.length === 16 ? `${formFisica.fecha_hora}:00` : formFisica.fecha_hora,
      };
      await api.post('/habitos/fisica', payload);
      setShowModalFisica(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al guardar');
    }
  };

  // Anular Sesión Física (Soft Delete)
  const handleAnularFisica = async (id: number) => {
    if (!window.confirm('¿Deseas anular esta sesión física? Se excluirá de los cálculos.')) return;
    try {
      await api.patch(`/habitos/fisica/${id}/anular`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al anular');
    }
  };

  // Crear Contacto Social
  const handleCrearSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formSocial,
        fecha_hora: formSocial.fecha_hora.length === 16 ? `${formSocial.fecha_hora}:00` : formSocial.fecha_hora,
      };
      await api.post('/habitos/social', payload);
      setShowModalSocial(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al guardar');
    }
  };

  // Anular Contacto Social (Soft Delete)
  const handleAnularSocial = async (id: number) => {
    if (!window.confirm('¿Deseas anular este contacto social? Se excluirá de los cálculos.')) return;
    try {
      await api.patch(`/habitos/social/${id}/anular`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al anular');
    }
  };

  // Confirmar Día sin actividad explícitamente (0% confirmado)
  const handleConfirmarSinActividad = async (fecha: string, habito: 'ACTIVIDAD_FISICA' | 'CONTACTO_SOCIAL') => {
    try {
      await api.post('/habitos/confirmacion', {
        fecha,
        habito,
        estado_confirmacion: 'CONFIRMADO_SIN_ACTIVIDAD',
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al confirmar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header y Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-health-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Hábitos Diarios y Metas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semana activa: Lunes a Domingo. Distingue entre 0% confirmado y Datos pendientes.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowModalFisica(true)}
            className="px-3.5 py-2 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Actividad Física</span>
          </button>
          <button
            onClick={() => setShowModalSocial(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Contacto Social</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('panel')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'panel'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📅 Panel Semanal (Lunes a Domingo)
        </button>
        <button
          onClick={() => setActiveTab('fisica')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'fisica'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏃 Actividad Física ({sesiones.length})
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'social'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          💬 Contacto Social ({contactos.length})
        </button>
        <button
          onClick={() => setActiveTab('metas')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'metas'
              ? 'border-b-2 border-health-petroleo text-health-petroleo bg-teal-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🎯 Mis Metas y Versiones
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 1. PANEL SEMANAL DE CONFIRMACION DIARIA */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'panel' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-health-petroleo shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800 block">Regla de Negocio: Cero Confirmado vs. Datos Pendientes</span>
              Para que tu semana se calcule formalmente sin estado <em>"Datos pendientes"</em>, debes registrar tu actividad o confirmar explícitamente los días en los que no realizaste actividad física o contacto social.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {panelDias.map((dia) => {
              const esActPendiente = dia.actividadFisica.estado === 'PENDIENTE' && !dia.esFuturo;
              const esSocPendiente = dia.contactoSocial.estado === 'PENDIENTE' && !dia.esFuturo;

              return (
                <div
                  key={dia.fecha}
                  className={`bg-white rounded-2xl border p-3.5 shadow-sm flex flex-col justify-between ${
                    dia.esHoy ? 'border-health-petroleo ring-2 ring-health-petroleo/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-800">{dia.nombreDia}</span>
                      {dia.esHoy && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-health-petroleo text-white">
                          HOY
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">{dia.fecha}</span>

                    {/* Actividad Física del día */}
                    <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-health-petroleo" /> Físico
                        </span>
                        <span className="font-bold text-health-dark">{dia.actividadFisica.minutos} min</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded block text-center ${
                        dia.actividadFisica.estado === 'CONFIRMADO_CON_REGISTRO' ? 'bg-emerald-100 text-emerald-700' :
                        dia.actividadFisica.estado === 'CONFIRMADO_SIN_ACTIVIDAD' ? 'bg-rose-100 text-rose-700' :
                        dia.esFuturo ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dia.actividadFisica.estado === 'CONFIRMADO_CON_REGISTRO' ? '✓ Con Registro' :
                         dia.actividadFisica.estado === 'CONFIRMADO_SIN_ACTIVIDAD' ? '0% Confirmado' :
                         dia.esFuturo ? 'Futuro' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Contacto Social del día */}
                    <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-600" /> Social
                        </span>
                        <span className="font-bold text-health-dark">{dia.contactoSocial.conteo} int.</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded block text-center ${
                        dia.contactoSocial.estado === 'CONFIRMADO_CON_REGISTRO' ? 'bg-emerald-100 text-emerald-700' :
                        dia.contactoSocial.estado === 'CONFIRMADO_SIN_ACTIVIDAD' ? 'bg-rose-100 text-rose-700' :
                        dia.esFuturo ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dia.contactoSocial.estado === 'CONFIRMADO_CON_REGISTRO' ? '✓ Con Registro' :
                         dia.contactoSocial.estado === 'CONFIRMADO_SIN_ACTIVIDAD' ? '0% Confirmado' :
                         dia.esFuturo ? 'Futuro' : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción rápida por día */}
                  {!dia.esFuturo && (esActPendiente || esSocPendiente) && (
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                      {esActPendiente && (
                        <button
                          onClick={() => handleConfirmarSinActividad(dia.fecha, 'ACTIVIDAD_FISICA')}
                          className="w-full text-[10px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 py-1 px-1.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          Confirmar sin ejercicio
                        </button>
                      )}
                      {esSocPendiente && (
                        <button
                          onClick={() => handleConfirmarSinActividad(dia.fecha, 'CONTACTO_SOCIAL')}
                          className="w-full text-[10px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 py-1 px-1.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          Confirmar sin contacto
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 2. LISTA SESIONES FISICAS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'fisica' && (
        <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Sesiones Físicas Registradas en la Semana</h3>
            <span className="text-xs text-slate-500">Solo sesiones válidas suman al CAF</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Actividad</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Origen</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sesiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay sesiones físicas registradas en esta semana.
                    </td>
                  </tr>
                ) : (
                  sesiones.map((s) => (
                    <tr key={s.sesion_id} className={s.estado === 'ANULADO' ? 'opacity-40 bg-slate-50 line-through' : 'hover:bg-slate-50/50'}>
                      <td className="py-3 px-4 font-mono font-medium">
                        {formatDateTimePE(s.fecha_hora)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{s.tipo_actividad}</td>
                      <td className="py-3 px-4 font-bold text-health-petroleo">{s.duracion_minutos} min</td>
                      <td className="py-3 px-4 text-slate-500">{s.origen}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.estado === 'VALIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.estado === 'VALIDO' && (
                          <button
                            onClick={() => handleAnularFisica(s.sesion_id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Anular sesión (soft-delete)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 3. LISTA CONTACTOS SOCIALES */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-2xl border border-health-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Interacciones Sociales Registradas</h3>
              <p className="text-[11px] text-slate-400">Múltiples contactos en un mismo día cuentan como 1 solo día con interacción.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Modalidad</th>
                  <th className="py-3 px-4">Origen</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contactos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No hay contactos sociales registrados en esta semana.
                    </td>
                  </tr>
                ) : (
                  contactos.map((c) => (
                    <tr key={c.contacto_id} className={c.estado === 'ANULADO' ? 'opacity-40 bg-slate-50 line-through' : 'hover:bg-slate-50/50'}>
                      <td className="py-3 px-4 font-mono font-medium">
                        {formatDateTimePE(c.fecha_hora)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.modalidad}</td>
                      <td className="py-3 px-4 text-slate-500">{c.origen}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.estado === 'VALIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.estado === 'VALIDO' && (
                          <button
                            onClick={() => handleAnularSocial(c.contacto_id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Anular contacto (soft-delete)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 4. MIS METAS Y CONTROL DE VERSIONES */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'metas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Meta Actividad Física */}
            <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Vigente</span>
                <h4 className="font-bold text-slate-800 text-base mt-1">Actividad Física Semanal</h4>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-health-dark">
                    {metasInfo?.metaFisica?.valor_meta || 150}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">minutos / semana</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <p>Origen: <span className="font-semibold text-slate-700">{metasInfo?.metaFisica?.origen_meta}</span></p>
                  <p>Versión: <span className="font-semibold text-slate-700">v{metasInfo?.metaFisica?.version_meta || 1}</span></p>
                </div>
              </div>
              <div className="mt-5 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs flex items-center justify-center gap-1.5 w-full">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Meta clínica fijada por el Especialista (Solo lectura)</span>
              </div>
            </div>

            {/* Meta Contacto Social */}
            <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Vigente</span>
                <h4 className="font-bold text-slate-800 text-base mt-1">Contacto Social Semanal</h4>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-health-dark">
                    {metasInfo?.metaSocial?.valor_meta || 3}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">días / semana</span>
                </div>
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <p>Origen: <span className="font-semibold text-slate-700">{metasInfo?.metaSocial?.origen_meta}</span></p>
                  <p>Versión: <span className="font-semibold text-slate-700">v{metasInfo?.metaSocial?.version_meta || 1}</span></p>
                </div>
              </div>
              <div className="mt-5 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs flex items-center justify-center gap-1.5 w-full">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Meta clínica fijada por el Especialista (Solo lectura)</span>
              </div>
            </div>
          </div>

          {/* Historial de Versiones */}
          <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
            <h4 className="font-bold text-slate-800 text-sm mb-3">Historial de Metas y Versiones</h4>
            <div className="divide-y divide-slate-100 text-xs">
              {(metasInfo?.historial || []).map((h: any) => (
                <div key={h.meta_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">
                      {h.habito.replace('_', ' ')}: {h.valor_meta} {h.unidad}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Semana: {h.inicio_semana} • Versión {h.version_meta} • Origen: {h.origen_meta}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    h.vigente ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {h.vigente ? 'Vigente' : 'Histórica'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL REGISTRO ACTIVIDAD FISICA */}
      {/* -------------------------------------------------------------------- */}
      {showModalFisica && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-modal border border-health-border">
            <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Sesión de Actividad Física</h3>
            <form onSubmit={handleCrearFisica} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={formFisica.fecha_hora}
                  onChange={(e) => setFormFisica({ ...formFisica, fecha_hora: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Actividad</label>
                <select
                  value={formFisica.tipo_actividad}
                  onChange={(e) => setFormFisica({ ...formFisica, tipo_actividad: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                >
                  <option value="Caminata">Caminata (Parque / Ciudad)</option>
                  <option value="Ejercicio">Ejercicio en casa / Gimnasio</option>
                  <option value="Deporte">Deporte (Fútbol, Natación, Ciclismo)</option>
                  <option value="Otro">Otro esfuerzo físico</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duración (Minutos válidos)</label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  required
                  value={formFisica.duracion_minutos}
                  onChange={(e) => setFormFisica({ ...formFisica, duracion_minutos: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalFisica(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-health-petroleo text-white font-bold hover:bg-teal-900 transition-colors shadow-md"
                >
                  Guardar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL REGISTRO CONTACTO SOCIAL */}
      {/* -------------------------------------------------------------------- */}
      {showModalSocial && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-modal border border-health-border">
            <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Contacto Social Significativo</h3>
            <form onSubmit={handleCrearSocial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={formSocial.fecha_hora}
                  onChange={(e) => setFormSocial({ ...formSocial, fecha_hora: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Modalidad de Interacción</label>
                <select
                  value={formSocial.modalidad}
                  onChange={(e) => setFormSocial({ ...formSocial, modalidad: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-health-petroleo"
                >
                  <option value="Conversación presencial">Conversación presencial (amigos, vecinos)</option>
                  <option value="Visita familiar">Visita familiar</option>
                  <option value="Llamadas">Llamada telefónica cercana</option>
                  <option value="Videollamada">Videollamada</option>
                  <option value="Otro">Otro encuentro social</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModalSocial(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
