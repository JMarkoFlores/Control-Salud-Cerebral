import { stateLabel, stateStyle } from '../lib/format';

export function StateBadge({
  state,
  className = ''
}: {
  state: string;
  className?: string;
}) {
  const style = stateStyle(state);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-semibold leading-none ${className}`}
      style={{ background: style.background, color: style.color, border: `1px solid ${style.border}` }}
    >
      {stateLabel(state)}
    </span>
  );
}
