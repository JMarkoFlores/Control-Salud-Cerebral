import { ReactNode } from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';
import { useFilters } from '../context/FiltersContext';
import { FilterOption } from '../types';

function toOptions(items: Array<string | FilterOption> | undefined): FilterOption[] {
  if (!items) return [];
  return items.map((item) =>
    typeof item === 'string' ? { value: item, label: item } : item
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 pb-2 last:border-0">
      <h4 className="mb-1 text-2xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-2xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'w-full rounded border border-health-border bg-white px-1.5 py-1 text-2xs text-slate-700 focus:border-health-teal focus:outline-none';

function SingleSelect({
  value,
  onChange,
  options,
  placeholder = 'Todos'
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
}) {
  return (
    <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CheckList({
  options,
  selected,
  onToggle
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <p className="text-2xs text-slate-400">Sin opciones</p>;
  }
  return (
    <div className="grid max-h-24 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={active}
            className={`truncate rounded border px-1.5 py-0.5 text-left text-2xs transition-colors ${
              active
                ? 'border-health-teal bg-teal-50 font-semibold text-health-petroleo'
                : 'border-health-border bg-white text-slate-600 hover:bg-slate-50'
            }`}
            title={option.label}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const { filters, options, view, setFilters, clearFilters } = useFilters();

  if (!filters) return null;

  const toggle = (key: keyof typeof filters, value: string) => {
    setFilters((current) => {
      const values = current[key] as string[];
      return {
        ...current,
        [key]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value]
      };
    });
  };

  const indicatorOptions = toOptions(options?.indicators);
  const dataStateOptions = toOptions(options?.dataStates);
  const metaOriginOptions = toOptions(options?.metaOrigins);
  const controlTypeOptions = toOptions(options?.controlTypes);
  const resultOriginOptions = toOptions(options?.resultOrigins);
  const validationOptions = toOptions(options?.validations);
  const pendingReasonOptions = toOptions(options?.pendingReasons);
  const periodSituationOptions = toOptions(options?.periodSituations);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-health-border bg-white">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-health-border px-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-health-dark">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
          title="Cerrar filtros"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        <Section title="Periodo">
          {view === 'evolucion' ? (
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Desde">
                <input
                  type="date"
                  className={selectClass}
                  value={filters.from ?? ''}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      from: event.target.value || undefined
                    }))
                  }
                />
              </Field>
              <Field label="Hasta">
                <input
                  type="date"
                  className={selectClass}
                  value={filters.to ?? ''}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      to: event.target.value || undefined
                    }))
                  }
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <Field label="Año">
                  <SingleSelect
                    value={filters.years[0] ? String(filters.years[0]) : ''}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        years: value ? [Number(value)] : [],
                        months: [],
                        weeks: []
                      }))
                    }
                    options={(options?.years ?? []).map((year) => ({
                      value: String(year),
                      label: String(year)
                    }))}
                  />
                </Field>
                <Field label="Mes">
                  <SingleSelect
                    value={filters.months[0] ? String(filters.months[0]) : ''}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        months: value ? [Number(value)] : [],
                        weeks: []
                      }))
                    }
                    options={toOptions(options?.months)}
                  />
                </Field>
              </div>
              {view !== 'cardiometabolicos' && (
                <Field label="Semana (lunes de inicio)">
                  <SingleSelect
                    value={filters.weeks[0] ?? ''}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, weeks: value ? [value] : [] }))
                    }
                    options={toOptions(options?.weeks)}
                  />
                </Field>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 text-2xs text-slate-600">
                <input
                  type="checkbox"
                  checked={filters.onlyClosed}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, onlyClosed: event.target.checked }))
                  }
                  className="h-3 w-3 rounded border-slate-300 text-health-teal focus:ring-health-teal"
                />
                Solo periodos cerrados
              </label>
            </>
          )}
        </Section>

        <Section title="Ubicación">
          <Field label="Departamento">
            <SingleSelect
              value={filters.department ?? ''}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  department: value || undefined,
                  province: undefined,
                  districts: []
                }))
              }
              options={toOptions(options?.departments)}
            />
          </Field>
          <Field label="Provincia">
            <SingleSelect
              value={filters.province ?? ''}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  province: value || undefined,
                  districts: []
                }))
              }
              options={toOptions(options?.provinces)}
            />
          </Field>
          <Field label="Distrito">
            <CheckList
              options={toOptions(options?.districts)}
              selected={filters.districts}
              onToggle={(value) => toggle('districts', value)}
            />
          </Field>
        </Section>

        <Section title="Perfil">
          <Field label="Sexo">
            <CheckList
              options={toOptions(options?.sexes)}
              selected={filters.sexes}
              onToggle={(value) => toggle('sexes', value)}
            />
          </Field>
          <Field label="Grupo de edad">
            <CheckList
              options={toOptions(options?.ageGroups)}
              selected={filters.ageGroups}
              onToggle={(value) => toggle('ageGroups', value)}
            />
          </Field>
          <Field label="Estado del participante">
            <CheckList
              options={toOptions(options?.personStates)}
              selected={filters.personStates}
              onToggle={(value) => toggle('personStates', value)}
            />
          </Field>
          <Field label="Participante">
            <SingleSelect
              value={filters.participant != null ? String(filters.participant) : ''}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  participant: value ? Number(value) : undefined
                }))
              }
              options={(options?.participants ?? []).map((participant) => ({
                value: String(participant),
                label: `Participante #${participant}`
              }))}
            />
          </Field>
        </Section>

        {view === 'resumen' && (
          <Section title="Vista">
            <Field label="Indicador para estados">
              <SingleSelect
                value={filters.indicator ?? ''}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    indicator:
                      value === 'CAF' || value === 'CCS' || value === 'FCM' ? value : undefined
                  }))
                }
                options={indicatorOptions}
                placeholder="CAF"
              />
            </Field>
          </Section>
        )}

        {(view === 'actividad' || view === 'contacto') && (
          <Section title="Vista">
            <Field label={view === 'actividad' ? 'Estado CAF' : 'Estado CCS'}>
              <CheckList
                options={toOptions(view === 'actividad' ? options?.cafStates : options?.ccsStates)}
                selected={view === 'actividad' ? filters.cafState : filters.ccsState}
                onToggle={(value) =>
                  toggle(view === 'actividad' ? 'cafState' : 'ccsState', value)
                }
              />
            </Field>
            <Field label="Estado de datos">
              <CheckList
                options={dataStateOptions}
                selected={filters.dataState}
                onToggle={(value) => toggle('dataState', value)}
              />
            </Field>
            <Field label="Origen de la meta">
              <CheckList
                options={metaOriginOptions}
                selected={filters.metaOrigin}
                onToggle={(value) => toggle('metaOrigin', value)}
              />
            </Field>
          </Section>
        )}

        {view === 'cardiometabolicos' && (
          <Section title="Vista">
            <Field label="Tipo de control">
              <CheckList
                options={controlTypeOptions}
                selected={filters.controlType}
                onToggle={(value) => toggle('controlType', value)}
              />
            </Field>
            <Field label="Estado de datos">
              <CheckList
                options={dataStateOptions}
                selected={filters.dataState}
                onToggle={(value) => toggle('dataState', value)}
              />
            </Field>
            <Field label="Origen del resultado">
              <CheckList
                options={resultOriginOptions}
                selected={filters.resultOrigin}
                onToggle={(value) => toggle('resultOrigin', value)}
              />
            </Field>
            <Field label="Validación">
              <CheckList
                options={validationOptions}
                selected={filters.validation}
                onToggle={(value) => toggle('validation', value)}
              />
            </Field>
          </Section>
        )}

        {view === 'pendientes' && (
          <Section title="Vista">
            <Field label="Indicador">
              <CheckList
                options={indicatorOptions}
                selected={filters.pendingIndicator}
                onToggle={(value) => toggle('pendingIndicator', value)}
              />
            </Field>
            <Field label="Tipo de control">
              <CheckList
                options={controlTypeOptions}
                selected={filters.controlType}
                onToggle={(value) => toggle('controlType', value)}
              />
            </Field>
            <Field label="Motivo">
              <CheckList
                options={pendingReasonOptions}
                selected={filters.pendingReason}
                onToggle={(value) => toggle('pendingReason', value)}
              />
            </Field>
            <Field label="Situación del periodo">
              <CheckList
                options={periodSituationOptions}
                selected={filters.periodSituation}
                onToggle={(value) => toggle('periodSituation', value)}
              />
            </Field>
          </Section>
        )}

        {view === 'evolucion' && (
          <Section title="Vista">
            <Field label="Indicador">
              <SingleSelect
                value={filters.evolutionIndicator ?? filters.indicator ?? ''}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    evolutionIndicator:
                      value === 'CAF' || value === 'CCS' || value === 'FCM' ? value : undefined
                  }))
                }
                options={indicatorOptions}
                placeholder="CAF"
              />
            </Field>
            <Field label="Comparar por">
              <select
                className={selectClass}
                value={filters.compareBy}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    compareBy: event.target.value as 'distrito' | 'edad' | 'sexo'
                  }))
                }
              >
                <option value="distrito">Distrito</option>
                <option value="edad">Grupo de edad</option>
                <option value="sexo">Sexo</option>
              </select>
            </Field>
          </Section>
        )}
      </div>

      <footer className="shrink-0 border-t border-health-border p-2">
        <button
          type="button"
          onClick={clearFilters}
          className="flex w-full items-center justify-center gap-1 rounded bg-slate-100 px-2 py-1.5 text-2xs font-semibold text-slate-600 hover:bg-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      </footer>
    </aside>
  );
}
