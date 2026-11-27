import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode
} from 'react';
import { useLocation } from 'react-router-dom';
import { fetchFilterOptions, fetchMeta, filtersToSearch } from '../lib/api';
import {
  defaultsForView,
  emptyFilters,
  parseFilters,
  VIEW_PATHS
} from '../lib/filters';
import { FilterOptions, Filters, MetaInfo, ViewId } from '../types';

interface FiltersState {
  meta: MetaInfo | null;
  options: FilterOptions | null;
  filters: Filters | null;
  view: ViewId;
  loading: boolean;
  optionsLoading: boolean;
  error: string | null;
  setFilters: (next: Filters | ((current: Filters) => Filters)) => void;
  clearFilters: () => void;
  retry: () => void;
}

const FiltersContext = createContext<FiltersState | null>(null);

function viewFromPath(pathname: string): ViewId {
  const entry = (Object.entries(VIEW_PATHS) as Array<[ViewId, string]>).find(
    ([, path]) => path === pathname
  );
  return entry?.[0] ?? 'resumen';
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const view = viewFromPath(location.pathname);

  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filters, setFiltersState] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchMeta()
      .then((response) => {
        if (!active) return;
        setMeta(response);
        const params = new URLSearchParams(window.location.search);
        const initial = parseFilters(params, response, viewFromPath(window.location.pathname));
        setFiltersState(initial);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el dashboard.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!filters) return;
    const query = filtersToSearch(filters);
    const path = window.location.pathname;
    window.history.replaceState(null, '', `${path}${query ? `?${query}` : ''}`);
  }, [filters]);

  useEffect(() => {
    if (!filters) return;
    let active = true;
    setOptionsLoading(true);
    const timer = window.setTimeout(() => {
      fetchFilterOptions(filters, view)
        .then((response) => {
          if (!active) return;
          setOptions(response);
          setOptionsLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setOptionsLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filters, view]);

  const setFilters = useCallback(
    (next: Filters | ((current: Filters) => Filters)) => {
      setFiltersState((current) => {
        if (!current) return current;
        return typeof next === 'function' ? next(current) : next;
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFiltersState(emptyFilters());
  }, []);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({
      meta,
      options,
      filters,
      view,
      loading,
      optionsLoading,
      error,
      setFilters,
      clearFilters,
      retry
    }),
    [meta, options, filters, view, loading, optionsLoading, error, setFilters, clearFilters, retry]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersState {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters debe usarse dentro de FiltersProvider');
  return context;
}

export { defaultsForView };
