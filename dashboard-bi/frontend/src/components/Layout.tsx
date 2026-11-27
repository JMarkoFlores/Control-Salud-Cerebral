import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FiltersContext';
import { buildChips, VIEW_IDS, VIEW_LABELS, VIEW_PATHS } from '../lib/filters';
import { filtersToSearch } from '../lib/api';
import { formatDate } from '../lib/format';
import { FilterPanel } from './FilterPanel';
import { ViewId } from '../types';

const VIEW_ICONS: Record<ViewId, typeof LayoutDashboard> = {
  resumen: LayoutDashboard,
  actividad: Activity,
  contacto: Users,
  cardiometabolicos: HeartPulse,
  pendientes: ClipboardList,
  evolucion: TrendingUp
};

const selectClass =
  'rounded border border-health-border bg-white px-1.5 py-1 text-2xs text-slate-700 focus:border-health-teal focus:outline-none';

function Header({
  onToggleFilters,
  filterCount
}: {
  onToggleFilters: () => void;
  filterCount: number;
}) {
  const { meta, filters, options, view, setFilters } = useFilters();
  const { user, logout } = useAuth();
  const chips = filters ? buildChips(filters, options, view) : [];
  const visible = chips.slice(0, 3);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-health-border bg-white px-2.5">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-health-petroleo text-emerald-300">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-extrabold leading-tight text-health-dark">
            {VIEW_LABELS[view]}
          </h1>
          <p className="truncate text-2xs leading-tight text-slate-500">
            Salud Cerebral · Corte {formatDate(meta?.fechaCorte)}
            {meta?.source === 'mock' && (
              <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-700">
                Datos de prueba
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {visible.map((chip) => (
          <span
            key={chip.id}
            className="flex max-w-[180px] shrink-0 items-center gap-1 rounded border border-health-border bg-slate-50 px-1.5 py-0.5 text-2xs text-slate-600"
          >
            <span className="truncate" title={chip.label}>
              {chip.label}
            </span>
            <button
              type="button"
              onClick={() => filters && setFilters(chip.remove(filters))}
              className="shrink-0 text-slate-400 hover:text-health-coral"
              title="Quitar filtro"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {chips.length > visible.length && (
          <span className="shrink-0 text-2xs font-semibold text-slate-400">
            +{chips.length - visible.length}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleFilters}
          className="flex items-center gap-1 rounded border border-health-border bg-white px-2 py-1 text-2xs font-semibold text-slate-600 hover:bg-slate-50"
          title="Mostrar u ocultar filtros"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {filterCount > 0 && (
            <span className="rounded-full bg-health-petroleo px-1.5 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
        <span className="hidden max-w-[90px] truncate text-2xs text-slate-500 sm:block">
          {user}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-health-coral"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function SlicerBar() {
  const { filters, options, setFilters, view } = useFilters();
  if (!filters) return null;

  if (view === 'evolucion') {
    return (
      <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-health-border bg-white/80 px-2.5">
        <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
          Desde
          <input
            type="date"
            className={`${selectClass} w-[128px]`}
            value={filters.from ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                from: event.target.value || undefined
              }))
            }
          />
        </label>

        <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
          Hasta
          <input
            type="date"
            className={`${selectClass} w-[128px]`}
            value={filters.to ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                to: event.target.value || undefined
              }))
            }
          />
        </label>

        <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
          Distrito
          <select
            className={`${selectClass} max-w-[160px]`}
            value={filters.districts[0] ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                districts: event.target.value ? [event.target.value] : []
              }))
            }
          >
            <option value="">Todos</option>
            {(options?.districts ?? []).map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-health-border bg-white/80 px-2.5">
      <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
        Año
        <select
          className={selectClass}
          value={filters.years[0] ? String(filters.years[0]) : ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              years: event.target.value ? [Number(event.target.value)] : [],
              months: [],
              weeks: []
            }))
          }
        >
          <option value="">Todos</option>
          {(options?.years ?? []).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
        Mes
        <select
          className={selectClass}
          value={filters.months[0] ? String(filters.months[0]) : ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              months: event.target.value ? [Number(event.target.value)] : [],
              weeks: []
            }))
          }
        >
          <option value="">Todos</option>
          {(options?.months ?? []).map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>

      {view !== 'cardiometabolicos' && (
        <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
          Semana
          <select
            className={`${selectClass} max-w-[170px]`}
            value={filters.weeks[0] ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                weeks: event.target.value ? [event.target.value] : []
              }))
            }
          >
            <option value="">Todas</option>
            {(options?.weeks ?? []).map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex shrink-0 items-center gap-1 text-2xs text-slate-500">
        Distrito
        <select
          className={`${selectClass} max-w-[160px]`}
          value={filters.districts[0] ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              districts: event.target.value ? [event.target.value] : []
            }))
          }
        >
          <option value="">Todos</option>
          {(options?.districts ?? []).map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function IconRail({
  expanded,
  onToggle
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const { filters } = useFilters();
  const query = filters ? filtersToSearch(filters) : '';

  return (
    <nav
      className={`flex shrink-0 flex-col border-r border-health-border bg-health-petroleo text-white transition-[width] duration-150 ${
        expanded ? 'w-44' : 'w-14'
      }`}
    >
      <div className="flex h-10 items-center justify-center border-b border-white/10">
        <Brain className="h-5 w-5 text-emerald-300" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 py-1">
        {VIEW_IDS.map((id) => {
          const Icon = VIEW_ICONS[id];
          return (
            <NavLink
              key={id}
              to={`${VIEW_PATHS[id]}${query ? `?${query}` : ''}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-2 text-2xs font-semibold transition-colors ${
                  isActive
                    ? 'border-l-2 border-emerald-300 bg-white/15 text-white'
                    : 'border-l-2 border-transparent text-teal-100 hover:bg-white/10'
                }`
              }
              title={VIEW_LABELS[id]}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {expanded && <span className="truncate">{VIEW_LABELS[id]}</span>}
            </NavLink>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 items-center justify-center border-t border-white/10 text-teal-200 hover:bg-white/10"
        title={expanded ? 'Contraer menú' : 'Expandir menú'}
      >
        {expanded ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </button>
    </nav>
  );
}

function FooterTabs() {
  const { view, filters } = useFilters();
  const navigate = useNavigate();
  const index = VIEW_IDS.indexOf(view);
  const query = filters ? filtersToSearch(filters) : '';
  const go = (target: ViewId) =>
    navigate(`${VIEW_PATHS[target]}${query ? `?${query}` : ''}`);

  return (
    <footer className="flex h-9 shrink-0 items-center justify-center gap-1 border-t border-health-border bg-white px-2">
      {index > 0 && (
        <button
          type="button"
          onClick={() => go(VIEW_IDS[index - 1])}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          title="Vista anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {VIEW_IDS.map((id, position) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            className={`whitespace-nowrap rounded-t border-b-2 px-2 py-1 text-2xs font-semibold transition-colors ${
              id === view
                ? 'border-health-teal text-health-petroleo'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-health-teal'
            }`}
            title={`${position + 1} de ${VIEW_IDS.length} · ${VIEW_LABELS[id]}`}
          >
            {VIEW_LABELS[id]}
          </button>
        ))}
      </div>
      {index < VIEW_IDS.length - 1 && (
        <button
          type="button"
          onClick={() => go(VIEW_IDS[index + 1])}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          title="Vista siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <span className="ml-1 shrink-0 text-2xs font-semibold text-slate-400">
        {index + 1} de {VIEW_IDS.length}
      </span>
    </footer>
  );
}

export function Layout() {
  const { filters, view } = useFilters();
  const [panelOpen, setPanelOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const filterCount = useMemo(
    () => (filters ? buildChips(filters, null, view).length : 0),
    [filters, view]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) ||
          target.isContentEditable ||
          target.closest('table') ||
          target.closest('[role="dialog"]'))
      ) {
        return;
      }

      const path = Object.entries(VIEW_PATHS).find(([, value]) => value === location.pathname)?.[0] as
        | ViewId
        | undefined;
      const current = path ?? 'resumen';
      const index = VIEW_IDS.indexOf(current);
      const nextIndex =
        event.key === 'ArrowLeft'
          ? Math.max(0, index - 1)
          : Math.min(VIEW_IDS.length - 1, index + 1);
      if (nextIndex === index) return;

      const query = filters ? filtersToSearch(filters) : '';
      navigate(`${VIEW_PATHS[VIEW_IDS[nextIndex]]}${query ? `?${query}` : ''}`);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filters, location.pathname, navigate]);

  return (
    <div className="report-shell flex flex-col bg-health-bg">
      <Header onToggleFilters={() => setPanelOpen((open) => !open)} filterCount={filterCount} />
      <div className="flex min-h-0 flex-1">
        <IconRail expanded={railExpanded} onToggle={() => setRailExpanded((value) => !value)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <SlicerBar />
          <main className="min-h-0 flex-1 overflow-auto p-2 lg:overflow-hidden">
            <Outlet />
          </main>
        </div>
        {panelOpen && <FilterPanel onClose={() => setPanelOpen(false)} />}
      </div>
      <FooterTabs />
    </div>
  );
}
