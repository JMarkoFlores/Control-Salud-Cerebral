import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MockRepository } from '../repositories/mock';
import { DashboardService } from '../services/dashboard.service';
import { defaultFiltersForView } from '../utils/filters';
import { DashboardResponse, ViewId } from '../types';

const repository = new MockRepository();
const service = new DashboardService(repository, 0);

async function load(view: ViewId): Promise<DashboardResponse> {
  const meta = await repository.getMeta();
  return service.getView(view, defaultFiltersForView(view, meta));
}

test('Resumen incluye respaldo de mapa y seguimiento con M1–M6', async () => {
  const response = await load('resumen');
  assert.ok(response.charts.some((chart) => chart.id === 'mapa-resumen'));

  const participant = response.tables.find((table) => table.id === 'seguimiento-participante');
  assert.ok(participant);
  const keys = participant.columns.map((column) => column.key);
  for (const key of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']) {
    assert.ok(keys.includes(key), `falta la columna ${key}`);
  }
  assert.ok(participant.rows.length > 0);
});

test('Pendientes apila motivos por distrito y separa no programados', async () => {
  const response = await load('pendientes');
  const chart = response.charts.find((item) => item.id === 'pendientes-distrito');
  assert.ok(chart);
  assert.equal(chart.data[0].length, 6);
  assert.ok(response.tables.some((table) => table.id === 'mapa-pendientes'));

  const controls = response.tables.find((table) => table.id === 'controles-pendientes');
  assert.ok(controls);
  const allowed = new Set([
    'PENDIENTE',
    'META_INCOMPLETA',
    'SIN_META',
    'NO_PROGRAMADO',
    'NO_VIGENTE'
  ]);
  assert.ok(controls.rows.every((row) => allowed.has(String(row.estado))));
});

test('Contacto informa participantes distintos con 0 % confirmado', async () => {
  const response = await load('contacto');
  assert.match(response.narrative, /participantes con 0 % confirmado/);
});

test('Actividad y Contacto cargan todas las semanas cerradas del mes', async () => {
  const meta = await repository.getMeta();
  for (const view of ['actividad', 'contacto'] as const) {
    const filters = defaultFiltersForView(view, meta);
    const rows = await repository.getWeeklyRows(filters);
    const closedWeeks = new Set(
      rows.filter((row) => row.periodo_cerrado === 1).map((row) => row.periodo)
    );

    assert.deepEqual(filters.weeks, []);
    assert.equal(filters.months[0], Number(meta.lastClosedWeek?.slice(5, 7)));
    assert.ok(closedWeeks.size > 1, `${view} debe mostrar más de una semana cerrada`);
  }
});

test('Los gráficos semanales conservan nulos cuando el hábito no tiene meta', async () => {
  const meta = await repository.getMeta();
  const filters = defaultFiltersForView('actividad', meta);
  filters.dataState = ['SIN_META'];
  const response = await service.getView('actividad', filters);
  const charts = new Map(response.charts.map((chart) => [chart.id, chart]));

  for (const id of ['minutos-semana', 'caf-distrito', 'caf-edad-sexo']) {
    const chart = charts.get(id);
    assert.ok(chart, `falta el gráfico ${id}`);
    assert.ok(
      chart.data.slice(1).every((row) => row.slice(1).every((value) => value == null)),
      `${id} no debe convertir la ausencia de datos en cero`
    );
  }
});

test('Cardiometabólicos traduce el origen de resultados', async () => {
  const response = await load('cardiometabolicos');
  const origin = response.charts.find((chart) => chart.id === 'origen-resultados');
  assert.ok(origin);
  const allowed = new Set(['Autorreporte', 'Dispositivo', 'Laboratorio']);
  assert.ok(origin.data.slice(1).every((row) => allowed.has(String(row[0]))));
});

test('Cardiometabólicos separa estados de factores y usa el nombre real del factor LDL', async () => {
  const response = await load('cardiometabolicos');
  const chart = response.charts.find((item) => item.id === 'factores-estado');
  assert.ok(chart);
  assert.deepEqual(chart.data[0], [
    'Factor',
    'Dentro de meta',
    'Fuera de meta',
    'Pendiente',
    'Meta incompleta',
    'Sin meta',
    'No programado',
    'No vigente'
  ]);
  assert.ok(chart.data.slice(1).some((row) => row[0] === 'Colesterol LDL'));
});

test('Evolución incluye respaldo de mapa y etiqueta el segmento', async () => {
  const response = await load('evolucion');
  assert.ok(response.tables.some((table) => table.id === 'mapa-evolucion'));
  const detail = response.tables.find((table) => table.id === 'evolucion-detalle');
  assert.ok(detail);
  assert.equal(detail.columns[1].label, 'Distrito');
});

test('Las seis vistas entregan los gráficos y tablas requeridos', async () => {
  const expected: Record<ViewId, { charts: string[]; tables: string[] }> = {
    resumen: {
      charts: ['indicadores-meta', 'estados', 'mapa-resumen'],
      tables: ['resumen-distrito', 'seguimiento-participante', 'detalle-controles']
    },
    actividad: {
      charts: ['minutos-semana', 'estados-caf', 'caf-distrito', 'caf-edad-sexo'],
      tables: ['detalle-caf']
    },
    contacto: {
      charts: ['dias-semana', 'estados-ccs', 'ccs-distrito', 'ccs-edad-sexo'],
      tables: ['detalle-ccs']
    },
    cardiometabolicos: {
      charts: ['factores-estado', 'fcm-mensual', 'origen-resultados'],
      tables: ['fcm-participante', 'detalle-factor']
    },
    pendientes: {
      charts: ['pendientes-distrito', 'motivos'],
      tables: ['mapa-pendientes', 'habitos-pendientes', 'controles-pendientes']
    },
    evolucion: {
      charts: ['tendencia', 'comparacion'],
      tables: ['mapa-evolucion', 'evolucion-detalle']
    }
  };

  for (const view of Object.keys(expected) as ViewId[]) {
    const response = await load(view);
    assert.deepEqual(
      response.charts.map((chart) => chart.id).sort(),
      [...expected[view].charts].sort(),
      `gráficos de ${view}`
    );
    assert.deepEqual(
      response.tables.map((table) => table.id).sort(),
      [...expected[view].tables].sort(),
      `tablas de ${view}`
    );
  }
});

test('Los hábitos sin meta no reciben una situación de periodo de pendiente', async () => {
  const response = await load('pendientes');
  const habits = response.tables.find((table) => table.id === 'habitos-pendientes');
  assert.ok(habits);
  const withoutMeta = habits.rows.filter((row) => row.estado_datos === 'SIN_META');
  assert.ok(withoutMeta.length > 0);
  assert.ok(withoutMeta.every((row) => row.situacion === 'NO_APLICA'));
});
