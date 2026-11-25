import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  TrendingUp,
  Bell,
  Award,
  AlertCircle,
  User,
  Users,
  FileSpreadsheet,
  Sliders,
  FolderTree,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const titularNav = [
    { id: 'dashboard', label: 'Mi Dashboard', icon: LayoutDashboard },
    { id: 'habitos', label: 'Hábitos y Metas', icon: Activity },
    { id: 'controles', label: 'Controles de Salud', icon: HeartPulse },
    { id: 'simulador', label: 'Simulador 10 y 20 Años', icon: TrendingUp },
    { id: 'recordatorios', label: 'Recordatorios', icon: Bell },
    { id: 'logros', label: 'Vitrina de Logros', icon: Award },
    { id: 'alertas', label: 'Bandeja de Alertas', icon: AlertCircle },
    { id: 'perfil', label: 'Mi Perfil y Familia', icon: User },
  ];

  const acompananteNav = [
    { id: 'dashboard', label: 'Resumen del Titular', icon: LayoutDashboard },
    { id: 'alertas', label: 'Alertas y Seguimiento', icon: AlertCircle },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard Global', icon: LayoutDashboard },
    { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users },
    { id: 'reportes', label: 'Reportes Analíticos', icon: FileSpreadsheet },
    { id: 'reglas', label: 'Motor de Reglas', icon: Sliders },
    { id: 'catalogos', label: 'Catálogos y Distritos', icon: FolderTree },
  ];

  const navItems = user?.rol === 'ADMIN' ? adminNav : user?.rol === 'ACOMPANANTE' ? acompananteNav : titularNav;

  return (
    <>
      {/* Backdrop móvil */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-health-border z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Portal Activo
            </span>
            <p className="text-sm font-bold text-health-petroleo truncate mt-0.5">
              {user?.rol === 'ADMIN' ? 'Gestión Global Piloto' : user?.rol === 'ACOMPANANTE' ? 'Acompañante Autorizado' : 'Titular del Programa'}
            </p>
            {user?.distrito && (
              <span className="text-[11px] text-slate-500 block mt-1">
                Distrito: <span className="font-semibold text-slate-700">{user.distrito}</span>
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                  isActive
                    ? 'bg-health-petroleo text-white shadow-md font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          Prevención Cognitiva G1 &copy; 2026<br />Trujillo, Perú
        </div>
      </aside>
    </>
  );
};
