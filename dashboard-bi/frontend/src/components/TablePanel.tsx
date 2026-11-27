import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from 'lucide-react';
import { TableSpec } from '../types';
import { formatCell, formatPercent, stateLabel } from '../lib/format';
import { StateBadge } from './StateBadge';
import { useFilters } from '../context/FiltersContext';

const PAGE_SIZE = 8;

function cellValue(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es');
}

function exportCsv(table: TableSpec) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [table.columns.map((c) => c.label), ...table.rows.map((r) => table.columns.map((c) => r[c.key]))];
  const csv = '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${table.id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TableBody({ table, onSelect }: { table: TableSpec; onSelect: (row: Record<string, unknown>) => void }) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setSort(null);
    setPage(0);
  }, [table.id]);

  const sorted = useMemo(() => {
    if (!sort) return table.rows;
    const copy = [...table.rows];
    copy.sort((a, b) => {
      const result = compare(cellValue(a, sort.key), cellValue(b, sort.key));
      return sort.dir === 'asc' ? result : -result;
    });
    return copy;
  }, [table.rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (table.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        Sin datos para estos filtros
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-full border-collapse text-2xs">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  className="cursor-pointer whitespace-nowrap border-b border-health-border px-2 py-1.5 text-left font-bold text-slate-600 hover:text-health-petroleo"
                  onClick={() =>
                    setSort((current) =>
                      current?.key === column.key
                        ? { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                        : { key: column.key, dir: 'asc' }
                    )
                  }
                  title="Ordenar"
                >
                  {column.label}
                  {sort?.key === column.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const closed = String(row.situacion ?? '') === 'PERIODO_CERRADO';
              return (
                <tr
                  key={`${table.id}-${safePage}-${index}`}
                  onClick={() => onSelect(row)}
                  title="Clic para filtrar el informe"
                  className={`border-b border-slate-100 last:border-0 ${
                    closed
                      ? 'border-l-2 border-l-amber-400 bg-amber-50/70'
                      : 'hover:bg-teal-50/40'
                  }`}
                >
                  {table.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={column.key}
                        className="whitespace-nowrap px-2 py-1 text-slate-600"
                      >
                        {column.type === 'state' ? (
                          <StateBadge state={String(value ?? 'SIN_DATOS')} />
                        ) : column.type === 'percent' ? (
                          <span className="font-semibold text-slate-700">
                            {formatCell(value, 'percent')}
                          </span>
                        ) : column.type === 'participant' ? (
                          <span className="font-medium text-health-dark">
                            {formatCell(value, 'participant')}
                          </span>
                        ) : (
                          formatCell(value, column.type)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 px-2 py-1 text-2xs text-slate-500">
        <span>
          {sorted.length === 0
            ? '0 registros'
            : `${safePage * PAGE_SIZE + 1}–${Math.min(
                (safePage + 1) * PAGE_SIZE,
                sorted.length
              )} de ${sorted.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded border border-health-border p-0.5 disabled:opacity-40"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="rounded border border-health-border p-0.5 disabled:opacity-40"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={safePage >= pageCount - 1}
            title="Página siguiente"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export function TablePanel({ table, bare = false }: { table: TableSpec; bare?: boolean }) {
  const [open, setOpen] = useState(false);
  const { filters, setFilters } = useFilters();
  const onSelect = (row: Record<string, unknown>) => {
    if (!filters) return;
    setFilters((current) => {
      const next = { ...current };
      const district = row.distrito;
      const sex = row.sexo;
      const age = row.grupo_edad;
      const participant = Number(row.participante ?? row.key_persona);
      if (district) next.districts = next.districts.includes(String(district)) ? next.districts.filter((v) => v !== String(district)) : [String(district)];
      else if (sex) next.sexes = next.sexes.includes(String(sex)) ? next.sexes.filter((v) => v !== String(sex)) : [String(sex)];
      else if (age) next.ageGroups = next.ageGroups.includes(String(age)) ? next.ageGroups.filter((v) => v !== String(age)) : [String(age)];
      else if (Number.isFinite(participant) && participant > 0) next.participant = next.participant === participant ? undefined : participant;
      else if (row.estado_indicador) {
        const key = current.indicator === 'CCS' ? 'ccsState' : current.indicator === 'FCM' ? 'dataState' : 'cafState';
        const v = String(row.estado_indicador);
        next[key] = next[key].includes(v) ? next[key].filter((x) => x !== v) : [v];
      }
      return next;
    });
  };

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-health-border bg-white shadow-soft">
        {!bare && (
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-health-dark" title={table.title}>
                {table.title}
              </h3>
              {table.note && (
                <p className="truncate text-2xs text-slate-400">{table.note}</p>
              )}
            </div>
            <button type="button" onClick={() => exportCsv(table)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-health-petroleo" title="Exportar tabla completa a CSV" aria-label="Exportar a CSV">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-health-petroleo"
              title="Ampliar visual"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </header>
        )}
        <div className="min-h-0 flex-1">
          <TableBody table={table} onSelect={onSelect} />
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
              <h3 className="text-sm font-bold text-health-dark">{table.title}</h3>
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
              <TableBody table={table} onSelect={onSelect} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
