import assert from 'node:assert/strict';
import test from 'node:test';
import { errorPlausibilidad, evaluarDentroDeMeta } from './limitesCardiometabolicos';

const META_PA = { max: 120, maxDiast: 80 };

test('presión arterial rechaza valores por debajo del piso clínico', () => {
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 30, diastolica: 15 }, META_PA), false);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 85, diastolica: 55 }, META_PA), false);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 85, diastolica: 70 }, META_PA), false);
});

test('presión arterial acepta valores dentro del rango 90-120 / 60-80', () => {
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 110, diastolica: 70 }, META_PA), true);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 90, diastolica: 60 }, META_PA), true);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 120, diastolica: 80 }, META_PA), true);
});

test('presión arterial rechaza valores sobre la meta o invertidos', () => {
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 130, diastolica: 70 }, META_PA), false);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 110, diastolica: 85 }, META_PA), false);
  assert.equal(evaluarDentroDeMeta('Presión arterial', { sistolica: 80, diastolica: 120 }, META_PA), false);
});

test('factores numéricos usan piso clínico cuando la meta sólo tiene techo', () => {
  assert.equal(evaluarDentroDeMeta('Glucosa', { numerico: 50 }, { min: null, max: 100 }), false);
  assert.equal(evaluarDentroDeMeta('Glucosa', { numerico: 90 }, { min: null, max: 100 }), true);
  assert.equal(evaluarDentroDeMeta('Colesterol LDL', { numerico: 0 }, { min: null, max: 100 }), false);
  assert.equal(evaluarDentroDeMeta('Colesterol LDL', { numerico: 80 }, { min: null, max: 100 }), true);
  assert.equal(evaluarDentroDeMeta('IMC', { numerico: 12 }, { min: null, max: 24.9 }), false);
  assert.equal(evaluarDentroDeMeta('IMC', { numerico: 22 }, { min: null, max: 24.9 }), true);
});

test('errorPlausibilidad bloquea mediciones imposibles', () => {
  assert.match(errorPlausibilidad('Presión arterial', { sistolica: 80, diastolica: 120 }) || '', /sistólica debe ser mayor/);
  assert.match(errorPlausibilidad('Presión arterial', { sistolica: 0, diastolica: 0 }) || '', /positivos/);
  assert.match(errorPlausibilidad('Colesterol LDL', { numerico: 0 }) || '', /mayor que cero/);
  assert.equal(errorPlausibilidad('Presión arterial', { sistolica: 30, diastolica: 15 }), null);
  assert.equal(errorPlausibilidad('Presión arterial', { sistolica: 110, diastolica: 70 }), null);
  assert.equal(errorPlausibilidad('Glucosa', { numerico: 90 }), null);
});
