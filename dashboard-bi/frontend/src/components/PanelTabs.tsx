import { useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { ChartSpec, TableSpec } from '../types';
import { ChartPanel } from './ChartPanel';
import { TablePanel } from './TablePanel';

export interface VisualItem {
  id: string;
  title: string;
  label?: string;
  kind: 'chart' | 'table';
  chart?: ChartSpec;
  table?: TableSpec;
}

export function PanelTabs({ items }: { items: VisualItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!items.some((item) => item.id === activeId)) {
      setActiveId(items[0]?.id ?? '');
    }
  }, [items, activeId]);

  if (items.length === 0) {
    return (
      <section className="flex h-full items-center justify-center rounded-md border border-health-border bg-white text-xs text-slate-400 shadow-soft">
        Sin visuales para estos filtros
      </section>
    );
  }

  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-health-border bg-white shadow-soft">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-2 py-1">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`whitespace-nowrap rounded px-2 py-0.5 text-2xs font-semibold transition-colors ${
                  item.id === active.id
                    ? 'bg-health-petroleo text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.label ?? item.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-health-petroleo"
            title="Ampliar visual"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1">
          {active.kind === 'chart' && active.chart ? (
            <ChartPanel chart={active.chart} bare />
          ) : active.table ? (
            <TablePanel table={active.table} bare />
          ) : null}
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
              <h3 className="text-sm font-bold text-health-dark">{active.title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1">
              {active.kind === 'chart' && active.chart ? (
                <ChartPanel chart={active.chart} bare />
              ) : active.table ? (
                <TablePanel table={active.table} bare />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
