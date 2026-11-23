import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import Enrolamiento from '../src/client.js';
import * as errores from '../src/errors.js';
import { ErrorDeConfiguracion } from '../src/errors.js';
import * as enums from '../src/generated/enums.js';
import { OPERACIONES, VERSION_DEL_CONTRATO } from '../src/generated/operations.js';
import * as entrada from '../src/index.js';
import { VERSION } from '../src/version.js';

const CONTRATO = JSON.parse(readFileSync('contract/openapi.json', 'utf8'));
const RUT = '11111111-1';

interface PedidoVisto {
  url: URL;
  metodo: string;
  cabeceras: Headers;
  cuerpo: unknown;
}

/** Un cliente con un `fetch` falso que anota cada pedido y responde 200 con `respuesta` como JSON. */
function clienteFalso(respuesta: unknown = true) {
  const pedidos: PedidoVisto[] = [];
  const fetch: typeof globalThis.fetch = async (url, init) => {
    const texto = typeof init?.body === 'string' ? init.body : undefined;
    pedidos.push({
      url: new URL(String(url)),
      metodo: String(init?.method),
      cabeceras: new Headers(init?.headers),
      cuerpo: texto === undefined ? undefined : JSON.parse(texto),
    });
    return new Response(JSON.stringify(respuesta), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const cliente = new Enrolamiento({ usuario: '77777777-7', apikey: 'clave-de-prueba', fetch, maxReintentos: 0 });
  return { cliente, pedidos };
}

/** Cada operación del contrato sin alias, con la ruta de su método en el cliente (`caf.anulacionMasivaAnular`). */
function metodosDelContrato(): { id: string; camino: string[]; op: any; parametros: any[] }[] {
  const resolver = (valor: any): any =>
    valor?.$ref
      ? resolver(valor.$ref.replace(/^#\//, '').split('/').reduce((o: any, k: string) => o[k], CONTRATO))
      : valor;
  const lista = [];
  for (const item of Object.values<any>(CONTRATO.paths)) {
    for (const op of Object.values<any>(item)) {
      if (!op?.operationId || op['x-alias-de'] !== undefined) continue;
      const [primera, ...resto] = String(op['x-sdk-name']).split(/[._]/);
      const nombre = primera + resto.map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1)).join('');
      const parametros = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolver);
      lista.push({ id: op.operationId as string, camino: [...String(op['x-sdk-group']).split('.'), nombre], op, parametros });
    }
  }
  return lista;
}

/** Las funciones del cliente, por camino, recorriendo sus propiedades propias. */
function metodosDelCliente(valor: object, prefijo: string[] = []): string[] {
  const caminos: string[] = [];
  for (const [clave, hijo] of Object.entries(valor)) {
    if (typeof hijo === 'function') caminos.push([...prefijo, clave].join('.'));
    else if (hijo !== null && typeof hijo === 'object') caminos.push(...metodosDelCliente(hijo, [...prefijo, clave]));
  }
  return caminos;
}

function metodo(cliente: Enrolamiento, camino: string[]): (params?: object, opciones?: object) => Promise<unknown> {
  let valor: any = cliente;
  for (const clave of camino) valor = valor?.[clave];
  if (typeof valor !== 'function') throw new Error(`el cliente no tiene ${camino.join('.')}`);
  return valor;
}

test('la superficie es exactamente la del contrato', () => {
  const { cliente } = clienteFalso();
  const esperados = metodosDelContrato().map(({ camino }) => camino.join('.'));
  expect(esperados).toHaveLength(34);
  expect(metodosDelCliente(cliente).sort()).toEqual(esperados.sort());
  expect(Object.keys(cliente).sort()).toEqual(['caf', 'certificaciones', 'certificados', 'empresas', 'portabilidad', 'respaldos']);
  expect(Object.keys(cliente.certificaciones).sort()).toEqual(['v1', 'v2']);
});

test('caf.anulacionMasivaAnular y caf.detalleFoliosTodos existen', () => {
  const { cliente } = clienteFalso();
  expect(cliente.caf.anulacionMasivaAnular).toBeTypeOf('function');
  expect(cliente.caf.detalleFoliosTodos).toBeTypeOf('function');
  expect(cliente.caf.olvidarMemoria).toBeTypeOf('function');
  expect(cliente.certificaciones.v1.actualizarCasillasIntercambio).toBeTypeOf('function');
  expect(cliente.certificados.descargarECert).toBeTypeOf('function');
  expect(cliente).not.toHaveProperty('empresas.consultar');
});

test('cada método llama a su operación: el método HTTP y la ruta de OPERACIONES', async () => {
  for (const { id, camino } of metodosDelContrato()) {
    const op = OPERACIONES[id]!;
    const params: Record<string, unknown> = {};
    for (const nombre of op.enRuta) params[nombre] = nombre === 'ambiente' ? 0 : `v-${nombre}`;
    if (op.ambiente !== 'no') params['ambiente'] = 0;
    const { cliente, pedidos } = clienteFalso();
    await metodo(cliente, camino)(params);
    expect(pedidos, id).toHaveLength(1);
    const ruta = op.ruta.replace(/\{([^}]+)\}/g, (_, nombre: string) => (nombre === 'ambiente' ? '0' : `v-${nombre}`));
    expect(`${pedidos[0]!.metodo} ${pedidos[0]!.url.pathname}`, id).toBe(`${op.metodo} ${ruta}`);
  }
});

test('certificaciones.v1.consultar llama a GET /v1/certificaciones/11111111-1/consultar', async () => {
  const { cliente, pedidos } = clienteFalso({ RUT, Estado: 1 });
  const certificacion = await cliente.certificaciones.v1.consultar({ rut: RUT });
  expect(certificacion).toEqual({ RUT, Estado: 1 });
  expect(pedidos).toHaveLength(1);
  expect(pedidos[0]!.metodo).toBe('GET');
  expect(pedidos[0]!.url.href).toBe('https://api.enrolamiento.cl/v1/certificaciones/11111111-1/consultar');
  expect(pedidos[0]!.cuerpo).toBeUndefined();
});

test('caf.descargar manda Data y Contrasenna en el cuerpo y cantidad en la ruta', async () => {
  const { cliente, pedidos } = clienteFalso('UkVTUFVFU1RB');
  const caf = await cliente.caf.descargar({
    rut: RUT,
    tipoDocumento: 33,
    cantidad: 5,
    ambiente: 0,
    ultimoFolio: 100,
    consultarSii: 'forzar',
    Data: 'MIIC',
    Contrasenna: 'secreta',
  });
  expect(caf).toBe('UkVTUFVFU1RB');
  const pedido = pedidos[0]!;
  expect(pedido.metodo).toBe('POST');
  expect(pedido.url.pathname).toBe('/v1/caf/11111111-1/descargar/33/5');
  expect(Object.fromEntries(pedido.url.searchParams)).toEqual({ ambiente: '0', ultimoFolio: '100' });
  expect(pedido.cabeceras.get('X-Consultar-Sii')).toBe('forzar');
  expect(pedido.cuerpo).toEqual({ Data: 'MIIC', Contrasenna: 'secreta' });
});

test('respaldos.descargar pide formato=json', async () => {
  const descarga = { url: 'https://almacen.ejemplo.cl/r.zip', vence: '2026-11-17T10:45:00-03:00' };
  const { cliente, pedidos } = clienteFalso(descarga);
  expect(await cliente.respaldos.descargar({ id: 'r-1' })).toEqual(descarga);
  expect(pedidos[0]!.url.pathname).toBe('/v1/respaldos/r-1/descargar');
  expect(pedidos[0]!.url.search).toBe('?formato=json');
});

test('ambiente: el del cliente llega a las operaciones que lo reciben y el obligatorio sin él no sale', async () => {
  const pedidos: string[] = [];
  const fetch: typeof globalThis.fetch = async (url) => {
    pedidos.push(String(url));
    return new Response('true', { status: 200 });
  };
  const conAmbiente = new Enrolamiento({ usuario: 'u', apikey: 'k', ambiente: 0, fetch });
  await conAmbiente.caf.descargar({ rut: RUT, tipoDocumento: 33, cantidad: 1 });
  await conAmbiente.empresas.permisos({ rutEmpresa: RUT, rutUsuario: '22222222-2' });
  expect(pedidos).toEqual([
    'https://api.enrolamiento.cl/v1/caf/11111111-1/descargar/33/1?ambiente=0',
    'https://api.enrolamiento.cl/v1/empresas/11111111-1/permisos/22222222-2/0',
  ]);

  const sinAmbiente = new Enrolamiento({ usuario: 'u', apikey: 'k', fetch });
  await expect(sinAmbiente.caf.descargar({ rut: RUT, tipoDocumento: 33, cantidad: 1 })).rejects.toThrow(
    ErrorDeConfiguracion,
  );
  expect(pedidos).toHaveLength(2);
});

describe('métodos sin parámetros obligatorios', () => {
  /** Las operaciones del contrato sin ningún parámetro obligatorio (salvo `ambiente`) ni cuerpo obligatorio. */
  const sinObligatorios = metodosDelContrato().filter(({ op, parametros }) => {
    const obligatorio = parametros.some((p) => p.name !== 'ambiente' && (p.in === 'path' || p.required === true));
    return !obligatorio && op.requestBody?.required !== true;
  });

  test('son las de estadísticas, listar respaldos y las dos de certificados', () => {
    expect(sinObligatorios.map(({ id }) => id).sort()).toEqual([
      'certificaciones_v1_stats',
      'certificados_v1_descargar_e_cert',
      'certificados_v1_solicitar',
      'respaldos_v1_listar',
    ]);
  });

  test('se llaman sin argumentos', async () => {
    for (const { id, camino } of sinObligatorios) {
      const { cliente, pedidos } = clienteFalso();
      await metodo(cliente, camino)();
      expect(pedidos, id).toHaveLength(1);
    }
  });

  test('uno con parámetros obligatorios, llamado sin argumentos, lanza ErrorDeConfiguracion sin llamar a la API', async () => {
    const { cliente, pedidos } = clienteFalso();
    await expect(metodo(cliente, ['certificaciones', 'v1', 'consultar'])()).rejects.toThrow(/falta el parámetro de ruta `rut`/);
    expect(pedidos).toHaveLength(0);
  });
});

test('las opciones del pedido llegan al núcleo', async () => {
  const { cliente, pedidos } = clienteFalso();
  await cliente.certificaciones.v1.stats(undefined, { cabeceras: { 'X-Prueba': 'si' } });
  expect(pedidos[0]!.cabeceras.get('X-Prueba')).toBe('si');
});

test('el punto de entrada exporta el cliente, las clases de error, los enums y las versiones', () => {
  const clasesDeError = Object.entries(errores).filter(([, valor]) => typeof valor === 'function' && /^[A-Z]/.test(valor.name));
  expect(clasesDeError.map(([nombre]) => nombre)).toHaveLength(9);
  expect(Object.keys(entrada).sort()).toEqual(
    ['default', ...clasesDeError.map(([nombre]) => nombre), ...Object.keys(enums), 'VERSION', 'VERSION_DEL_CONTRATO'].sort(),
  );
  expect(entrada.default).toBe(Enrolamiento);
  for (const [nombre, clase] of clasesDeError) expect((entrada as Record<string, unknown>)[nombre], nombre).toBe(clase);
  expect(entrada.SetDePruebas).toBe(enums.SetDePruebas);
  expect(entrada.VERSION).toBe(VERSION);
  expect(entrada.VERSION_DEL_CONTRATO).toBe(VERSION_DEL_CONTRATO);
});
