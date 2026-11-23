import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { VERSION } from '../src/version.js';

test('el contrato copiado es el público y trae las extensiones del SDK', () => {
  const c = JSON.parse(readFileSync('contract/openapi.json', 'utf8'));
  expect(c.openapi).toMatch(/^3\.1/);
  expect(JSON.stringify(c)).not.toMatch(/x-fuente|x-errores-sin-resolver|"evidencia"/);
  const ops = Object.values(c.paths).flatMap((p: any) => Object.values(p)).filter((o: any) => o.operationId);
  expect(ops.length).toBeGreaterThanOrEqual(35);
  for (const o of ops as any[]) expect(o).toMatchObject({ 'x-sdk-group': expect.any(String), 'x-sdk-name': expect.any(String) });
});

test('VERSION coincide con package.json', () => {
  const paquete = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(VERSION).toBe(paquete.version);
});
