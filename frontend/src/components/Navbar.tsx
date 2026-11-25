import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, LogOut, CheckCircle2, ChevronRight, Menu, X, ShieldAlert, Sparkles } from 'lucide-react';
import api from '../api/client';
import { Alerta } from '../types';

export const Navbar: React.FC<{ onToggleSidebar: () => void; isMobileOpen: boolean }> = ({
  onToggleSidebar,
  isMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [conteoPendientes, setConteoPendientes] = useState(0);

  const fetchAlertas = async () => {
    try {
      const res = await api.get('/alertas/mis-alertas?estado=PENDIENTE');
      if (res.data.success) {
        setAlertas(res.data.data.slice(0, 6));
        setConteoPendientes(res.data.data.length);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    fetchAlertas();
    const interval = setInterval(fetchAlertas, 30000); // Polling cada 30s
    return () => clearInterval(interval);
  }, []);

  const atenderAlerta = async (id: number) => {
    try {
      await api.patch(`/alertas/${id}/atendida`);
      fetchAlertas();
    } catch {
      // Error
    }
  };

  return (
    <header className="h-16 bg-white border-b border-health-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Menú"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-health-petroleo flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-base font-bold text-health-dark leading-tight">Salud Cerebral</h1>
            <p className="text-xs text-slate-500 font-medium">Piloto Trujillo (G1) • 30 a 65 años</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Buzón de Alertas y Motivación */}
        <div className="relative">
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            className="p-2.5 rounded-full text-slate-600 hover:bg-slate-100 relative transition-colors focus:outline-none"
            title="Buzón de Alertas y Motivación"
          >
            <Bell className="w-5 h-5" />
            {conteoPendientes > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-health-coral text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
                {conteoPendientes > 9 ? '9+' : conteoPendientes}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-modal border border-health-border p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-health-petroleo" />
                  <h3 className="font-bold text-slate-800 text-sm">Buzón de Avisos y Motivación</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {conteoPendientes} pendientes
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 mt-2">
                {alertas.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    ¡Excelente! No tienes avisos ni alertas pendientes por atender.
                  </div>
                ) : (
                  alertas.map((a) => (
                    <div key={a.alerta_id} className="py-3 px-1 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-health-petroleo bg-teal-50 px-2 py-0.5 rounded-md">
                          {a.motivo}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(a.fecha_emision).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-medium">
                        {a.mensaje || a.nombre_regla}
                      </p>
                      <div className="mt-2.5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => atenderAlerta(a.alerta_id)}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marcar como leído
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Perfil del Usuario */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-800 leading-tight">
              {user?.nombres} {user?.apellidos}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                user?.rol === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user?.rol}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {user?.codigo_interno}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
