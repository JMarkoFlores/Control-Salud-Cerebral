import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useFilters } from '../context/FiltersContext';
import { fetchView } from '../lib/api';
import { ChartSpec, DashboardResponse, TableSpec, ViewId } from '../types';
import { KpiCard } from '../components/KpiCard';
import { ChartPanel } from '../components/ChartPanel';
import { TablePanel } from '../components/TablePanel';
import { PanelTabs, VisualItem } from '../components/PanelTabs';
import { SPAN_CLASS, VIEW_LAYOUTS, ViewCell } from '../lib/layouts';

function Skeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[82px] animate-pulse rounded-md border border-health-border bg-white"
          />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-12 lg:grid-rows-2">
        <div className="min-h-[240px] animate-pulse rounded-md border border-health-border bg-white lg:col-span-8 lg:min-h-0" />
        <div className="min-h-[240px] animate-pulse rounded-md border border-health-border bg-white lg:col-span-4 lg:min-h-0" />
        <div className="min-h-[240px] animate-pulse rounded-md border border-health-border bg-white lg:col-span-4 lg:min-h-0" />
        <div className="min-h-[240px] animate-pulse rounded-md border border-health-border bg-white lg:col-span-8 lg:min-h-0" />
      </div>
    </div>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <section className="flex h-full items-center justify-center rounded-md border border-health-border bg-white px-3 text-center text-xs text-slate-400 shadow-soft">
      {title}
    </section>
  );
}

function VisualCell({
  cell,
  charts,
  tables,
  onChartSelect
}: {
  cell: ViewCell;
  charts: Map<string, ChartSpec>;
  tables: Map<string, TableSpec>;
  onChartSelect: (label: string) => void;
}) {
  if (cell.kind === 'chart') {
    const chart = charts.get(cell.id);
    return chart ? <ChartPanel chart={chart} onSelect={onChartSelect} /> : <EmptyPanel title="Visual no disponible" />;
  }

  if (cell.kind === 'table') {
    const table = tables.get(cell.id);
    return table ? <TablePanel table={table} /> : <EmptyPanel title="Visual no disponible" />;
  }

  const items: VisualItem[] = [];
  for (const tab of cell.tabs) {
    const chart = charts.get(tab.id);
    if (chart) {
      items.push({
        id: tab.id,
        title: chart.title,
        label: tab.label,
        kind: 'chart',
        chart
      });
      continue;
    }
    const table = tables.get(tab.id);
    if (table) {
      items.push({
        id: tab.id,
        title: table.title,
        label: tab.label,
        kind: 'table',
        table
      });
    }
  }

  return items.length > 0 ? (
    <PanelTabs items={items} />
  ) : (
    <EmptyPanel title="Visuales no disponibles" />
  );
}

export function ReportPage({ view }: { view: ViewId }) {
  const { filters, options, setFilters, loading: filtersLoading, error: filtersError, retry } = useFilters();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!filters) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetchView(view, filters)
      .then((response) => {
        if (!active) return;
        setData(response);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar la vista.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, view, retryKey]);

  const charts = useMemo(
    () => new Map((data?.charts ?? []).map((chart) => [chart.id, chart])),
    [data]
  );
  const tables = useMemo(
    () => new Map((data?.tables ?? []).map((table) => [table.id, table])),
    [data]
  );

  if (filtersError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">{filtersError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 inline-flex items-center gap-1 rounded bg-health-petroleo px-3 py-1.5 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (filtersLoading || !filters || (loading && data?.view !== view)) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-3 inline-flex items-center gap-1 rounded bg-health-petroleo px-3 py-1.5 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <Skeleton />;

  const onChartSelect = (label: string) => {
    if (!filters) return;
    setFilters((current) => {
      const district = options?.districts.find((value) => value === label);
      const age = options?.ageGroups.find((value) => value === label);
      const sexOption = options?.sexes.find((value) => value.label === label || value.value === label);
      if (district) return { ...current, districts: current.districts.includes(district) ? current.districts.filter((v) => v !== district) : [district] };
      if (age) return { ...current, ageGroups: current.ageGroups.includes(age) ? current.ageGroups.filter((v) => v !== age) : [age] };
      if (sexOption) return { ...current, sexes: current.sexes.includes(sexOption.value) ? current.sexes.filter((v) => v !== sexOption.value) : [sexOption.value] };
      return current;
    });
  };

  const kpiColumns = data.kpis.length <= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-6';

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p
        className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-2xs text-slate-600"
        title={data.narrative}
      >
        {data.narrative}
      </p>

      <div className={`grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 ${kpiColumns}`}>
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-12 lg:grid-rows-2">
        {VIEW_LAYOUTS[view].map((cell) => {
          const key =
            cell.kind === 'tabs'
              ? cell.tabs.map((tab) => tab.id).join('-')
              : `${cell.kind}-${cell.id}`;
          return (
            <div
              key={key}
              className={`min-h-[240px] min-w-0 lg:min-h-0 ${SPAN_CLASS[cell.span] ?? 'lg:col-span-12'}`}
            >
              <VisualCell cell={cell} charts={charts} tables={tables} onChartSelect={onChartSelect} />
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="pointer-events-none fixed bottom-12 right-3 rounded bg-health-petroleo/90 px-2 py-1 text-2xs text-white shadow">
          Actualizando…
        </div>
      )}
    </div>
  );
}
