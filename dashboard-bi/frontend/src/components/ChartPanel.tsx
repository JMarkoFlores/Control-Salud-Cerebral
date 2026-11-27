import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'react-google-charts';
import { Maximize2, X } from 'lucide-react';
import { ChartSpec } from '../types';

const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function hasData(chart: ChartSpec): boolean {
  return (
    Array.isArray(chart.data) &&
    chart.data.slice(1).some((row) =>
      row
        .slice(1)
        .some((value) => typeof value === 'number' && Number.isFinite(value))
    )
  );
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function ChartBody({ chart, onSelect }: { chart: ChartSpec; onSelect: (label: string) => void }) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const options = useMemo(
    () => ({
      backgroundColor: 'transparent',
      fontName: 'Plus Jakarta Sans',
      fontSize: 10,
      colors: ['#0F4C5C', '#028090', '#10B981', '#F59E0B', '#EF4444', '#64748B'],
      legend: { position: 'top', textStyle: { fontSize: 10 } },
      chartArea: { left: 46, top: 28, width: '82%', height: '66%' },
      ...chart.options
    }),
    [chart.options]
  );

  if (!hasData(chart)) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        Sin datos para estos filtros
      </div>
    );
  }

  if (chart.type === 'Map') {
    if (mapsApiKey) {
      return <div ref={ref} className="h-full w-full min-h-0 min-w-0">
        {size.width > 0 && size.height > 0 && <Chart chartType="Map" data={chart.data} options={options} mapsApiKey={mapsApiKey} width={size.width} height={size.height} />}
      </div>;
    }
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-400">
        El mapa requiere la clave de Google Maps. Se muestra el detalle por distrito en las tablas.
      </div>
    );
  }

  return (
    <div ref={ref} className="h-full w-full min-h-0 min-w-0">
      {size.width > 0 && size.height > 0 && (
        <Chart
          chartType={chart.type as never}
          data={chart.data}
          options={options}
          width={size.width}
          height={size.height}
          chartEvents={[{ eventName: 'select', callback: ({ chartWrapper }) => {
            const selected = chartWrapper.getChart().getSelection()[0];
            if (selected?.row != null) onSelect(String(chart.data[selected.row + 1]?.[0] ?? ''));
          } }]}
          loader={
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Cargando gráfico…
            </div>
          }
        />
      )}
    </div>
  );
}

export function ChartPanel({ chart, bare = false, onSelect = () => undefined }: { chart: ChartSpec; bare?: boolean; onSelect?: (label: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-health-border bg-white shadow-soft">
        {!bare && (
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-health-dark" title={chart.title}>
                {chart.title}
              </h3>
              {chart.note && (
                <p className="truncate text-2xs text-slate-400" title={chart.note}>
                  {chart.note}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-health-petroleo"
              title="Ampliar visual"
              aria-label="Ampliar visual"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </header>
        )}
        <div className="min-h-0 flex-1 p-1">
          <ChartBody chart={chart} onSelect={onSelect} />
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[86vh] w-[92vw] max-w-6xl flex-col rounded-lg bg-white shadow-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-health-border px-3 py-2">
              <h3 className="text-sm font-bold text-health-dark">{chart.title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 p-2">
              <ChartBody chart={chart} onSelect={onSelect} />
            </div>
            {chart.note && (
              <footer className="shrink-0 border-t border-slate-100 px-3 py-1.5 text-2xs text-slate-500">
                {chart.note}
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
