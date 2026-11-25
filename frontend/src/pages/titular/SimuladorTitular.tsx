import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Save, History, Sparkles, CheckCircle2, ShieldCheck, Activity, Users, HeartPulse } from 'lucide-react';

export const SimuladorTitular: React.FC = () => {
  const { user } = useAuth();
  const [minutos, setMinutos] = useState(150);
  const [diasSocial, setDiasSocial] = useState(3);
  const [factores, setFactores] = useState(3);
  const [nombreEscenario, setNombreEscenario] = useState('Mi plan ideal de salud');
  const [resultado, setResultado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Calcular edad aproximada
  const edad = 50; // default o calculada

  const calcularProyeccion = async () => {
    try {
      const res = await api.post('/simulador/calcular', {
        edad,
        minutos_simulados_sem: minutos,
        dias_contacto_simulados: diasSocial,
        factores_controlados_sim: factores,
      });
      if (res.data.success) {
        setResultado(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistorial = async () => {
    try {
      const res = await api.get('/simulador/historial');
      if (res.data.success) {
        setHistorial(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    calcularProyeccion();
    fetchHistorial();
  }, [minutos, diasSocial, factores]);

  const handleGuardar = async () => {
    try {
      const res = await api.post('/simulador/guardar', {
        edad,
        minutos_simulados_sem: minutos,
        dias_contacto_simulados: diasSocial,
        factores_controlados_sim: factores,
        nombre_escenario: nombreEscenario,
      });
      if (res.data.success) {
        setGuardadoExitoso(true);
        setTimeout(() => setGuardadoExitoso(false), 3000);
        fetchHistorial();
      }
    } catch {
      alert('Error al guardar simulación.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4">
        <h2 className="text-xl font-extrabold text-health-dark">Simulador Interactivo de Riesgo a 10 y 20 Años</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Modela cómo tus hábitos diarios reducen de manera cuantificable la probabilidad de deterioro cognitivo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controles de Simulación (Sliders) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-health-border p-5 shadow-card space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Parámetros a Simular</h3>
          </div>

          {/* Slider Minutos de Actividad */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-health-petroleo" /> Minutos de Actividad / Semana
              </span>
              <span className="font-extrabold text-health-petroleo font-mono">{minutos} min</span>
            </div>
            <input
              type="range"
              min="0"
              max="450"
              step="15"
              value={minutos}
              onChange={(e) => setMinutos(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-health-petroleo"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 min</span>
              <span>150 min (Meta OMS)</span>
              <span>300+ min</span>
            </div>
          </div>

          {/* Slider Días de Contacto Social */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" /> Días de Contacto Social
              </span>
              <span className="font-extrabold text-emerald-600 font-mono">{diasSocial} días</span>
            </div>
            <input
              type="range"
              min="0"
              max="7"
              step="1"
              value={diasSocial}
              onChange={(e) => setDiasSocial(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 días</span>
              <span>3 días (Recomendado)</span>
              <span>7 días</span>
            </div>
          </div>

          {/* Slider Factores Cardiometabólicos Controlados */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Factores Controlados (0 a 4)
              </span>
              <span className="font-extrabold text-rose-600 font-mono">{factores}/4 en meta</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={factores}
              onChange={(e) => setFactores(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Ninguno</span>
              <span>2 de 4</span>
              <span>4/4 Óptimo</span>
            </div>
          </div>

          {/* Guardar Escenario */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <input
              type="text"
              value={nombreEscenario}
              onChange={(e) => setNombreEscenario(e.target.value)}
              placeholder="Nombre del escenario..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-health-petroleo"
            />
            <button
              onClick={handleGuardar}
              className="w-full py-2.5 rounded-xl bg-health-petroleo text-white font-bold text-xs hover:bg-teal-900 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en mi Historial</span>
            </button>
            {guardadoExitoso && (
              <span className="text-[11px] text-emerald-600 font-bold block text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Escenario guardado
              </span>
            )}
          </div>
        </div>

        {/* Resultados de Proyección en Tiempo Real */}
        <div className="lg:col-span-2 space-y-5">
          {resultado && (
            <div className="bg-white rounded-2xl border border-health-border p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Impacto Proyectado en tu Salud Cerebral</h3>
                  <p className="text-xs text-slate-500">Estimación basada en evidencia de factores de reserva cognitiva.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-health-dark block">{resultado.puntajeProyectado} pts</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Puntaje Cerebral Simulado</span>
                </div>
              </div>

              {/* Comparativa de Riesgo a 10 y 20 Años */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Riesgo a 10 Años */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-600 block mb-2">Riesgo a 10 Años</span>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-extrabold text-emerald-600">{resultado.riesgo10Anios}%</span>
                    <span className="text-xs text-slate-400 line-through">Basal: {resultado.riesgoBase10}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, resultado.riesgo10Anios * 3)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold block mt-2">
                    ↓ Reducción de riesgo relativo: -{resultado.reduccionRiesgo10}%
                  </span>
                </div>

                {/* Riesgo a 20 Años */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-600 block mb-2">Riesgo a 20 Años</span>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-extrabold text-teal-600">{resultado.riesgo20Anios}%</span>
                    <span className="text-xs text-slate-400 line-through">Basal: {resultado.riesgoBase20}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, resultado.riesgo20Anios * 2)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-teal-700 font-semibold block mt-2">
                    ↓ Reducción de riesgo relativo: -{resultado.reduccionRiesgo20}%
                  </span>
                </div>
              </div>

              {/* Mensaje de Explicación Médica */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-health-petroleo shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-health-dark block">¿Qué significa este resultado?</span>
                  Mantener {minutos} minutos de caminata o deporte a la semana junto con {diasSocial} días de vida social activa y tus controles médicos al día genera una potente reserva neurocognitiva que retrasa el envejecimiento celular del cerebro.
                </div>
              </div>
            </div>
          )}

          {/* Historial de Simulaciones */}
          <div className="bg-white rounded-2xl border border-health-border p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-800 text-sm">Simulaciones Guardadas Previamente</h4>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {historial.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No has guardado escenarios todavía.</p>
              ) : (
                historial.slice(0, 5).map((h) => (
                  <div key={h.simulacion_id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-700 block">{h.nombre_escenario}</span>
                      <span className="text-[10px] text-slate-400">
                        {h.minutos_simulados_sem} min/sem • {h.dias_contacto_simulados} días social • {h.factores_controlados_sim} factores en meta
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-health-petroleo block">{h.puntaje_proyectado} pts</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">10a: {h.riesgo_10_anios_pct}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
