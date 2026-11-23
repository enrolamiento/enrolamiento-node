import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';

// El servidor local responde lo que diga `respuesta`; cada prueba la fija.
let respuesta: { status: number; cuerpo: string } = { status: 200, cuerpo: '{}' };
let servidor: Server;
let url: string;
let carpeta: string;
let destino: string;

const PREVIO = 'contenido previo\n';

beforeAll(async () => {
  servidor = createServer((_pedido, res) => {
    res.writeHead(respuesta.status, { 'content-type': 'application/json' });
    res.end(respuesta.cuerpo);
  });
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/openapi.json`;
});

afterAll(() => new Promise<void>((listo) => servidor.close(() => listo())));

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'pull-contract-'));
  destino = join(carpeta, 'openapi.json');
  writeFileSync(destino, PREVIO);
});

afterEach(() => rmSync(carpeta, { recursive: true, force: true }));

/** Corre el script contra el servidor local, escribiendo en `destino`. Asíncrono: el servidor vive en este proceso. */
function correr(): Promise<{ codigo: number; stderr: string }> {
  return new Promise((listo) => {
    execFile(
      process.execPath,
      ['scripts/pull-contract.mjs', '--out', destino],
      { env: { ...process.env, CONTRACT_URL: url } },
      (error, _stdout, stderr) => listo({ codigo: error ? (error.code as number) : 0, stderr }),
    );
  });
}

test('un 500 sale con error y no toca el archivo', async () => {
  respuesta = { status: 500, cuerpo: 'error' };
  const { codigo, stderr } = await correr();
  expect(codigo).not.toBe(0);
  expect(stderr).toContain('respondió 500');
  expect(readFileSync(destino, 'utf8')).toBe(PREVIO);
});

test('un documento que no es OpenAPI 3.1 sale con error y no toca el archivo', async () => {
  respuesta = { status: 200, cuerpo: JSON.stringify({ openapi: '3.0.3', info: { version: '1' } }) };
  const { codigo, stderr } = await correr();
  expect(codigo).not.toBe(0);
  expect(stderr).toContain('no es un contrato OpenAPI 3.1');
  expect(readFileSync(destino, 'utf8')).toBe(PREVIO);
});

test('un contrato 3.1 se escribe con las claves ordenadas y dos espacios de sangría', async () => {
  respuesta = {
    status: 200,
    cuerpo: JSON.stringify({ paths: { '/b': {}, '/a': {} }, openapi: '3.1.0', info: { version: '9.9.9', title: 'T' }, tags: ['z', 'a'] }),
  };
  const { codigo } = await correr();
  expect(codigo).toBe(0);
  expect(readFileSync(destino, 'utf8')).toBe(
    [
      '{',
      '  "info": {',
      '    "title": "T",',
      '    "version": "9.9.9"',
      '  },',
      '  "openapi": "3.1.0",',
      '  "paths": {',
      '    "/a": {},',
      '    "/b": {}',
      '  },',
      '  "tags": [',
      '    "z",',
      '    "a"',
      '  ]',
      '}',
      '',
    ].join('\n'),
  );
});
