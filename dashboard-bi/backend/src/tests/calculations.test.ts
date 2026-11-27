import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregate, indicatorState, round } from '../utils/calc';

test('CAF 120/150 => 80 % BUENO', () => {
  const result = aggregate(
    [{ numerador: 120, denominador: 150, es_evaluable: 1 }],
    'CAF'
  );
  assert.equal(result.percentage, 80);
  assert.equal(result.state, 'BUENO');
});

test('CCS 3/4 => 75 % REGULAR', () => {
  const result = aggregate(
    [{ numerador: 3, denominador: 4, es_evaluable: 1 }],
    'CCS'
  );
  assert.equal(result.percentage, 75);
  assert.equal(result.state, 'REGULAR');
});

test('FCM 2/3 => 66.67 % REGULAR', () => {
  const result = aggregate(
    [{ numerador: 2, denominador: 3, es_evaluable: 1 }],
    'FCM'
  );
  assert.equal(result.percentage, 66.67);
  assert.equal(result.state, 'REGULAR');
});

test('denominador 0 => null y SIN_DATOS', () => {
  const result = aggregate(
    [{ numerador: 0, denominador: 0, es_evaluable: 1 }],
    'CAF'
  );
  assert.equal(result.percentage, null);
  assert.equal(result.state, 'SIN_DATOS');
});

test('sin registros evaluables => null', () => {
  const result = aggregate(
    [{ numerador: 10, denominador: 20, es_evaluable: 0 }],
    'CCS'
  );
  assert.equal(result.percentage, null);
  assert.equal(result.evaluables, 0);
});

test('FCM con factores pendientes no entra en el agregado', () => {
  const result = aggregate(
    [
      { numerador: 4, denominador: 4, es_evaluable: 1 },
      { numerador: 1, denominador: 4, es_evaluable: 0 }
    ],
    'FCM'
  );
  assert.equal(result.numerator, 4);
  assert.equal(result.denominator, 4);
  assert.equal(result.percentage, 100);
  assert.equal(result.state, 'BUENO');
  assert.equal(result.evaluables, 1);
});

test('nunca se promedian porcentajes', () => {
  const result = aggregate(
    [
      { numerador: 100, denominador: 100, es_evaluable: 1 },
      { numerador: 0, denominador: 100, es_evaluable: 1 }
    ],
    'CAF'
  );
  assert.equal(result.percentage, 50);
  assert.equal(result.state, 'REGULAR');
});

test('umbrales CAF', () => {
  assert.equal(indicatorState('CAF', 100), 'OPTIMO');
  assert.equal(indicatorState('CAF', 99.99), 'BUENO');
  assert.equal(indicatorState('CAF', 70), 'BUENO');
  assert.equal(indicatorState('CAF', 69.99), 'REGULAR');
  assert.equal(indicatorState('CAF', 50), 'REGULAR');
  assert.equal(indicatorState('CAF', 49.99), 'MALO');
});

test('umbrales CCS y FCM', () => {
  assert.equal(indicatorState('CCS', 100), 'BUENO');
  assert.equal(indicatorState('CCS', 0.01), 'REGULAR');
  assert.equal(indicatorState('CCS', 0), 'MALO');
  assert.equal(indicatorState('FCM', 100), 'BUENO');
  assert.equal(indicatorState('FCM', 0.01), 'REGULAR');
  assert.equal(indicatorState('FCM', 0), 'MALO');
});

test('estado calculado antes de redondear', () => {
  assert.equal(indicatorState('CAF', 69.999), 'REGULAR');
  assert.equal(round(69.999, 2), 70);
});

test('CAF y CCS pueden superar 100 %', () => {
  const caf = aggregate([{ numerador: 240, denominador: 150, es_evaluable: 1 }], 'CAF');
  const ccs = aggregate([{ numerador: 8, denominador: 4, es_evaluable: 1 }], 'CCS');
  assert.equal(caf.percentage, 160);
  assert.equal(caf.state, 'OPTIMO');
  assert.equal(ccs.percentage, 200);
  assert.equal(ccs.state, 'BUENO');
});
