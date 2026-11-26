/**
 * Formatea una fecha-hora (string o Date) al formato de Perú: DD/MM/YYYY, hh:mm a.m./p.m.
 * Respeta exactamente los valores ingresados sin desfase de zona horaria.
 */
export function formatDateTimePE(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const clean = dateVal.replace('T', ' ').slice(0, 19);
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      const [y, m, d] = parts[0].split('-');
      const [hh, mm] = parts[1].split(':');
      const hour = parseInt(hh, 10);
      const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
      const h12 = hour % 12 || 12;
      return `${d}/${m}/${y}, ${h12}:${mm.padStart(2, '0')} ${ampm}`;
    }
    if (parts.length === 1 && parts[0].includes('-')) {
      const [y, m, d] = parts[0].split('-');
      return `${d}/${m}/${y}`;
    }
  }
  return new Date(dateVal).toLocaleString('es-PE');
}

/**
 * Formatea a solo fecha: DD/MM/YYYY
 */
export function formatDatePE(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const clean = dateVal.replace('T', ' ').trim();
    const datePart = clean.split(' ')[0];
    const [y, m, d] = datePart.split('-');
    if (y && m && d) {
      return `${d}/${m}/${y}`;
    }
    return dateVal;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = pad(dateVal.getDate());
  const m = pad(dateVal.getMonth() + 1);
  const y = dateVal.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Obtiene la fecha y hora local actual en formato para input type="datetime-local": YYYY-MM-DDTHH:mm
 */
export function getLocalDatetimeString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
