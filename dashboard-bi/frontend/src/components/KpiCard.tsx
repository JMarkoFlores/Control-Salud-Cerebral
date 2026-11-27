import { Info } from 'lucide-react';
import { Kpi } from '../types';
import { formatKpi, stateStyle } from '../lib/format';
import { StateBadge } from './StateBadge';

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const style = stateStyle(kpi.state);
  const hasState = kpi.state !== 'NEUTRO';

  return (
    <div className="flex h-full min-h-[82px] flex-col justify-between rounded-md border border-health-border bg-white px-2.5 py-2 shadow-soft">
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-2xs font-bold uppercase tracking-wide text-slate-500">
          {kpi.label}
        </span>
        <span title={kpi.help} className="shrink-0 cursor-help text-slate-400">
          <Info className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span
          className="truncate text-xl font-extrabold leading-tight"
          style={{ color: hasState ? style.color : '#0B2545' }}
          title={formatKpi(kpi.value, kpi.format)}
        >
          {formatKpi(kpi.value, kpi.format)}
        </span>
        {hasState && <StateBadge state={kpi.state} />}
      </div>

      <div className="truncate text-2xs text-slate-500">
        {kpi.numerator != null || kpi.denominator != null
          ? `${kpi.numerator ?? '—'} / ${kpi.denominator ?? '—'}${
              kpi.evaluables != null ? ` · ${kpi.evaluables} evaluables` : ''
            }`
          : kpi.detail ?? ' '}
      </div>
    </div>
  );
}
