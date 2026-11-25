/**
 * Utilidades para manejo de fechas en Perú (America/Lima)
 * Semanas estrictas de Lunes a Domingo
 */

export function getPeruDate(): Date {
  // Retorna fecha actual ajustada
  return new Date();
}

/**
 * Convierte de manera segura cualquier string o Date a un objeto Date válido para SQL Server DateTime2
 */
export function parseToDate(val: string | Date): Date {
  if (val instanceof Date) return val;
  const str = String(val).trim();
  // Si solo tiene formato fecha YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T00:00:00`);
  }
  // Si viene como YYYY-MM-DDTHH:mm o YYYY-MM-DD HH:mm (sin segundos)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(str)) {
    return new Date(str.replace(' ', 'T') + ':00');
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    const alt = new Date(str.replace(' ', 'T'));
    if (!isNaN(alt.getTime())) return alt;
  }
  return d;
}

/**
 * Formatea de forma exacta cualquier string o Date a formato estándar de SQL Server: YYYY-MM-DD HH:mm:ss
 * Conserva la hora local exacta que ingresó el usuario, sin convertir a UTC ni sufrir desfases de zona horaria.
 */
export function formatToSqlDateTime(val: string | Date): string {
  if (typeof val === 'string') {
    const clean = val.replace('T', ' ').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(clean)) {
      return `${clean}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return `${clean} 00:00:00`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(clean)) {
      return clean.slice(0, 19);
    }
    return clean;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = val.getFullYear();
  const m = pad(val.getMonth() + 1);
  const d = pad(val.getDate());
  const h = pad(val.getHours());
  const min = pad(val.getMinutes());
  const s = pad(val.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/**
 * Obtiene el Lunes de la semana para una fecha dada (en formato YYYY-MM-DD)
 */
export function getMondayOfCurrentWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 es Domingo, 1 es Lunes, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es Domingo
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Obtiene el Domingo de la semana para una fecha dada (en formato YYYY-MM-DD)
 */
export function getSundayOfCurrentWeek(d: Date = new Date()): string {
  const mondayStr = getMondayOfCurrentWeek(d);
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split('T')[0];
}

/**
 * Retorna un arreglo con las 7 fechas (YYYY-MM-DD) de Lunes a Domingo de la semana
 */
export function getDaysOfWeek(mondayDateStr: string): Array<{ fecha: string; nombreDia: string; esHoy: boolean; esPasado: boolean; esFuturo: boolean }> {
  const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const base = new Date(mondayDateStr + 'T00:00:00');
  const hoyStr = new Date().toISOString().split('T')[0];

  const result = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + i);
    const curStr = cur.toISOString().split('T')[0];
    result.push({
      fecha: curStr,
      nombreDia: diasNombres[i],
      esHoy: curStr === hoyStr,
      esPasado: curStr < hoyStr,
      esFuturo: curStr > hoyStr,
    });
  }
  return result;
}

/**
 * Obtiene el primer día del mes actual (YYYY-MM-01)
 */
export function getFirstDayOfMonth(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Formatea a DD/MM/YYYY
 */
export function formatDateDMY(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const str = typeof d === 'string' ? d : d.toISOString();
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}
