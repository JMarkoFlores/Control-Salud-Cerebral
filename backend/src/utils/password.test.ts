import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEmail, normalizeEmail, passwordPolicyError } from './password';

test('normalizeEmail recorta y pasa a minusculas', () => {
  assert.equal(normalizeEmail('  Admin@SaludCerebral.PE '), 'admin@saludcerebral.pe');
  assert.equal(normalizeEmail(undefined), '');
});

test('isValidEmail acepta correos validos y rechaza invalidos', () => {
  assert.equal(isValidEmail('carlos.mendoza@gmail.com'), true);
  assert.equal(isValidEmail('sin-arroba'), false);
  assert.equal(isValidEmail('a@b'), false);
});

test('passwordPolicyError exige 8+ caracteres con letra y numero', () => {
  assert.equal(passwordPolicyError('Abc12345'), null);
  assert.match(passwordPolicyError('Ab1') || '', /8 caracteres/);
  assert.match(passwordPolicyError('sololetras') || '', /letra y un número/);
  assert.match(passwordPolicyError(12345678) || '', /8 caracteres/);
});
