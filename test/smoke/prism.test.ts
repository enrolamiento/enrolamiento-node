// Humo contra Prism: cada método generado, llamado con sus parámetros de ejemplo, arma un pedido que el contrato
// acepta. Prism sirve los ejemplos de contract/openapi.json y rechaza (4xx) el pedido que no cumple el contrato.
// Corre con `npm run test:smoke`, no con `npm test`: levanta un servidor.

import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import Enrolamiento, { ErrorDeApi, ErrorDeAutenticacion } from '../../src/index.js';
import { OPERACIONES } from '../../src/generated/operations.js';
import { EJEMPLOS } from './examples.generated.js';

const CONTRATO = JSON.parse(readFileSync('contract/openapi.json', 'utf8'));
const ARRANQUE_MS = 60000;

let prism: ChildProcess | undefined;
let salidaDePrism = '';
let urlBase = '';

beforeAll(async () => {
  const puerto = await puertoLibre();
  const paquete = createRequire(import.meta.url).resolve('@stoplight/prism-cli/package.json');
  const bin = join(dirname(paquete), JSON.parse(readFileSync(paquete, 'utf8')).bin.prism);
  prism = spawn(process.execPath, [bin, 'mock', 'contract/openapi.json', '-h', '127.0.0.1', '-p', String(puerto)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Lo último que escribió Prism, para explicar un arranque fallido.
  const anotar = (trozo: Buffer) => (salidaDePrism = (salidaDePrism + trozo.toString('utf8')).slice(-4000));
  prism.stdout?.on('data', anotar);
  prism.stderr?.on('data', anotar);
  urlBase = `http://127.0.0.1:${puerto}`;
  await esperarQueEscuche(prism, urlBase);
}, ARRANQUE_MS);

afterAll(async () => {
  if (!prism || prism.exitCode !== null || prism.signalCode !== null) return;
  const salida = new Promise((resolver) => prism?.once('exit', resolver));
  prism.kill('SIGTERM');
  await salida;
});

function cliente(): Enrolamiento {
  return new Enrolamiento({ urlBase, usuario: 'demo', apikey: 'demo', ambiente: 0, maxReintentos: 0 });
}

/** Sigue los `$ref` locales del contrato hasta el objeto que nombran. */
function resolver(valor: any): any {
  while (valor && typeof valor.$ref === 'string') {
    valor = valor.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((objeto: any, clave: string) => objeto?.[clave], CONTRATO);
  }
  return valor;
}

interface OperacionDelContrato {
  /** El método en el cliente: `['caf', 'anulacionMasivaAnular']`. */
  camino: string[];
  /** Lo que Prism sirve: el ejemplo JSON (o el primero de los ejemplos) de la respuesta 200 del contrato. */
  respuesta: unknown;
}

/** Cada operación del contrato sin alias, por `operationId`. */
function operacionesDelContrato(): Map<string, OperacionDelContrato> {
  const mapa = new Map<string, OperacionDelContrato>();
  for (const item of Object.values<any>(CONTRATO.paths)) {
    for (const op of Object.values<any>(item)) {
      if (!op?.operationId || op['x-alias-de'] !== undefined) continue;
      const [primera, ...resto] = String(op['x-sdk-name']).split(/[._]/);
      const nombre = primera + resto.map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1)).join('');
      const json = resolver(op.responses?.['200'])?.content?.['application/json'];
      const primero = Object.values<any>(json?.examples ?? {})[0];
      mapa.set(op.operationId, {
        camino: [...String(op['x-sdk-group']).split('.'), nombre],
        respuesta: json?.example !== undefined ? json.example : resolver(primero)?.value,
      });
    }
  }
  return mapa;
}

function metodo(objeto: Enrolamiento, camino: string[]): (params?: object, opciones?: object) => Promise<unknown> {
  let valor: any = objeto;
  for (const clave of camino) valor = valor?.[clave];
  if (typeof valor !== 'function') throw new Error(`el cliente no tiene ${camino.join('.')}`);
  return valor;
}

const DEL_CONTRATO = operacionesDelContrato();

test('hay un ejemplo, un método y una respuesta de ejemplo por operación', () => {
  expect(Object.keys(OPERACIONES)).toHaveLength(34);
  expect(Object.keys(EJEMPLOS).sort()).toEqual(Object.keys(OPERACIONES).sort());
  expect([...DEL_CONTRATO.keys()].sort()).toEqual(Object.keys(OPERACIONES).sort());
  for (const [id, { respuesta }] of DEL_CONTRATO) expect(respuesta, id).not.toBeUndefined();
});

for (const id of Object.keys(OPERACIONES).sort()) {
  test(`${id}: Prism acepta el pedido`, async () => {
    const { camino, respuesta } = DEL_CONTRATO.get(id)!;
    // Resuelve con lo que Prism sirve: el ejemplo de la 200. Un pedido fuera del contrato rechaza con un 4xx.
    const datos = await metodo(cliente(), camino)(EJEMPLOS[id]);
    expect(datos).toEqual(respuesta);
    if (id === 'respaldos_v1_descargar') expect(datos).toHaveProperty('url');
  });
}

test('Prism rechaza un pedido fuera del contrato', async () => {
  const pedido = cliente().caf.listar({ ...EJEMPLOS['caf_v1_listar'], tipoDocumento: 'treinta y tres' } as never);
  await expect(pedido).rejects.toBeInstanceOf(ErrorDeApi);
  await expect(pedido).rejects.toMatchObject({ status: expect.toSatisfy((s: number) => s >= 400 && s < 500) });
});

test('Prefer: code=401 lanza ErrorDeAutenticacion', async () => {
  const pedido = cliente().certificaciones.v1.consultar(
    { rut: '11111111-1' },
    { cabeceras: { Prefer: 'code=401' } },
  );
  await expect(pedido).rejects.toBeInstanceOf(ErrorDeAutenticacion);
});

/** Un puerto TCP libre en 127.0.0.1, el que el sistema asigne. */
function puertoLibre(): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const servidor = createServer();
    servidor.once('error', rechazar);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address();
      servidor.close(() =>
        typeof direccion === 'object' && direccion !== null
          ? resolver(direccion.port)
          : rechazar(new Error('sin puerto')),
      );
    });
  });
}

/** Espera a que Prism responda en `url`. Falla con lo que escribió si termina antes o no escucha a tiempo. */
async function esperarQueEscuche(proceso: ChildProcess, url: string): Promise<void> {
  const limite = Date.now() + ARRANQUE_MS - 5000;
  while (Date.now() < limite) {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      throw new Error(`Prism terminó antes de escuchar:\n${salidaDePrism}`);
    }
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(1000) });
      await respuesta.body?.cancel();
      return;
    } catch {
      await new Promise((resolver) => setTimeout(resolver, 200));
    }
  }
  throw new Error(`Prism no escuchó en ${url} a tiempo:\n${salidaDePrism}`);
}
