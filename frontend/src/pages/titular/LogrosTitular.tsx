import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Logro } from '../../types';
import { Award, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const LogrosTitular: React.FC = () => {
  const [logros, setLogros] = useState<Logro[]>([]);
  const [totalDesbloqueados, setTotalDesbloqueados] = useState(0);
  const [totalCatalogo, setTotalCatalogo] = useState(0);
  const [porcentajeColeccion, setPorcentajeColeccion] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogros = async () => {
    try {
      setLoading(true);
      const res = await api.get('/logros/mis-logros');
      if (res.data.success) {
        setLogros(res.data.data.logros);
        setTotalDesbloqueados(res.data.data.totalDesbloqueados);
        setTotalCatalogo(res.data.data.totalCatalogo);
        setPorcentajeColeccion(res.data.data.porcentajeColeccion);

        if (res.data.data.totalDesbloqueados > 0) {
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogros();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-health-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-health-dark">Vitrina de Medallas y Logros</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Otorgados automáticamente por el backend al cumplir metas y mantener tu disciplina.
          </p>
        </div>

        {/* Barra de Colección */}
        <div className="bg-white rounded-2xl border border-health-border px-4 py-2.5 shadow-sm flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Colección</span>
            <span className="text-sm font-extrabold text-health-dark">
              {totalDesbloqueados} de {totalCatalogo} medallas
            </span>
          </div>
          <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${porcentajeColeccion}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {logros.map((l) => {
          const isUnlocked = l.desbloqueado === 1;
          return (
            <div
              key={l.logro_id}
              className={`rounded-3xl border p-6 shadow-card transition-all flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-200'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                      isUnlocked
                        ? 'bg-amber-400 text-white shadow-amber-200'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? <Award className="w-7 h-7" /> : <Lock className="w-6 h-6" />}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isUnlocked
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isUnlocked ? 'Desbloqueado' : 'Por Desbloquear'}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">
                  {l.codigo_logro}
                </span>
                <h4 className="text-base font-extrabold text-slate-800 mb-2 leading-snug">
                  {l.nombre}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {l.descripcion}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100/80 text-[11px]">
                {isUnlocked ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Obtenido: {l.fecha_obtencion ? new Date(l.fecha_obtencion).toLocaleDateString('es-PE') : 'Activo'}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">
                    Cumple el criterio en tu semana activa para recibir esta medalla.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
