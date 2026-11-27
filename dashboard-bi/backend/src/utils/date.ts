const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const match = DATE_ONLY.exec(value);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return null;
}

export function isoDate(value: unknown): string {
  const result = toIsoDate(value);
  if (!result) {
    throw new Error(`Fecha inválida: ${String(value)}`);
  }
  return result;
}

export function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseDateOnly(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return isoDate(date);
}

export function startOfIsoWeek(value: string): string {
  const date = parseDateOnly(value);
  const weekday = date.getUTCDay();
  const diff = (weekday + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return isoDate(date);
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function endOfMonth(value: string): string {
  const date = parseDateOnly(value);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

export function monthOfWeek(week: string): string {
  return startOfMonth(week);
}

export function yearOf(value: string): number {
  return Number(value.slice(0, 4));
}

export function monthOf(value: string): number {
  return Number(value.slice(5, 7));
}

export function isoWeekNumber(value: string): number {
  const date = parseDateOnly(value);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

export function formatMonthLabel(month: number): string {
  return new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

export function formatMonthYearLabel(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parseDateOnly(value));
}

export function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parseDateOnly(value));
}

export function formatWeekLabel(value: string): string {
  const short = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  })
    .format(parseDateOnly(value))
    .replace(/\.$/, '');
  return `Semana del ${short} (S${isoWeekNumber(value)})`;
}

export function todayInLima(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function ageAt(birthDate: string, atDate: string): number {
  const birth = parseDateOnly(birthDate);
  const at = parseDateOnly(atDate);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const birthday = new Date(Date.UTC(at.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()));
  if (birthday > at) age -= 1;
  return age;
}

export function ageGroup(age: number): string {
  if (age >= 30 && age <= 39) return '30-39';
  if (age >= 40 && age <= 49) return '40-49';
  if (age >= 50 && age <= 59) return '50-59';
  if (age >= 60 && age <= 65) return '60-65';
  return 'FUERA_RANGO';
}
