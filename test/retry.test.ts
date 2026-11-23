import { describe, expect, test } from 'vitest';
import { ErrorDeConexion, type ErrorDeApi, errorDeRespuesta } from '../src/errors.js';
import type { Operacion } from '../src/request.js';
import { OPERACIONES } from '../src/generated/operations.js';
import { decidirReintento } from '../src/retry.js';

function operacion(parcial: Partial<Operacion> = {}): Operacion {
  return {
    id: 'prueba_v1_operacion',
    metodo: 'POST',
    ruta: '/v1/prueba',
    enRuta: [],
    enQuery: [],
    cuerpo: 'ninguno',
    idempotente: true,
    ambiente: 'no',
    ambienteObligatorio: false,
    queryFija: {},
    reintentable: { automatico: [], manual: [], nunca: [] },
    ...parcial,
  };
}

/** `caf_v1_descargar` con su `x-idempotente`, su `ambiente` y su `x-reintentable` tal como vienen en el contrato. */
const CAF_DESCARGAR = operacion({
  id: 'caf_v1_descargar',
  idempotente: false,
  ambiente: 'query',
  ambienteObligatorio: true,
  reintentable: {
    automatico: ['409', '429'],
    manual: [
      'CAF_UNKNOWN',
      'CNX_HTTP_ERROR_500',
      'CNX_HTTP_ERROR_CLOSED',
      'CNX_HTTP_ERROR_REMOTE',
      'CNX_HTTP_ERROR_RETRY',
      'CNX_HTTP_ERROR_SSLTLS',
      'CNX_HTTP_ERROR_TIMEOUT',
      'ERROR_GENERAL',
      'FUNCION_NO_VERIFICABLE',
      'RESP_HTTP_ERROR',
      'SEC_USER_NOT_AUTHENTICATED',
      'UKN',
    ],
    nunca: ['CAF_DENIED_SII_EXCEED', 'CERT_REVOCADO', 'SEC_EMP_NOT_AUTHORIZED'],
  },
});

/** Una operación idempotente con listas como las de `empresas_v1_consultar`. */
const CONSULTAR = operacion({
  id: 'empresas_v1_consultar',
  idempotente: true,
  reintentable: { automatico: ['409', '429', 'SII_ERROR_CXN'], manual: ['ERROR_GENERAL'], nunca: ['CERT_REVOCADO'] },
});

const OPCIONES = { maxReintentos: 2, esperaMaximaMs: 30000, azar: () => 0.5 };

test('CAF_DESCARGAR coincide con la operación generada', () => {
  const generada = OPERACIONES.caf_v1_descargar!;
  expect(CAF_DESCARGAR).toMatchObject({
    idempotente: generada.idempotente,
    ambienteObligatorio: generada.ambienteObligatorio,
    reintentable: { automatico: generada.reintentable.automatico },
  });
  expect(generada.reintentable.manual).toEqual(expect.arrayContaining([...CAF_DESCARGAR.reintentable.manual]));
  expect(generada.reintentable.nunca).toEqual(expect.arrayContaining([...CAF_DESCARGAR.reintentable.nunca]));
});

function error(status: number, cuerpo: string, cabeceras: Record<string, string> = {}): ErrorDeApi {
  return errorDeRespuesta('prueba', status, new Headers(cabeceras), cuerpo);
}

function conCodigo(codigo: string, cabeceras: Record<string, string> = {}, status = 500): ErrorDeApi {
  return error(status, `${codigo}:falló`, { 'X-Codigo-Error': codigo, ...cabeceras });
}

const conexion = (tiempoAgotado = false) => new ErrorDeConexion('prueba', { tiempoAgotado });
const limite = () => error(409, '');
const tiempoAgotadoDeLaApi = () => error(504, '');

const NO = { reintentar: false, esperaMs: 0 };

describe('decidirReintento: una fila de la tabla por test, en orden', () => {
  test('ErrorDeConexion o ErrorDeTiempoAgotado: solo si la operación es idempotente, con retroceso', () => {
    for (const e of [conexion(false), conexion(true), tiempoAgotadoDeLaApi()]) {
      expect(decidirReintento(CONSULTAR, e, 1, OPCIONES)).toEqual({ reintentar: true, esperaMs: 500 });
      expect(decidirReintento(CONSULTAR, e, 2, OPCIONES)).toEqual({ reintentar: true, esperaMs: 1000 });
      expect(decidirReintento(operacion({ idempotente: false }), e, 1, OPCIONES)).toEqual(NO);
    }
  });

  test('ErrorDeLimite: sí, aun sin idempotencia, con 60000 más hasta 10000 al azar', () => {
    const opciones = { ...OPCIONES, esperaMaximaMs: 120000 };
    expect(decidirReintento(CAF_DESCARGAR, limite(), 1, { ...opciones, azar: () => 0 })).toEqual({ reintentar: true, esperaMs: 60000 });
    expect(decidirReintento(CAF_DESCARGAR, limite(), 1, { ...opciones, azar: () => 0.5 })).toEqual({ reintentar: true, esperaMs: 65000 });
    expect(decidirReintento(CAF_DESCARGAR, limite(), 1, { ...opciones, azar: () => 0.999 }).esperaMs).toBeLessThan(70000);
  });

  test('código en nunca o en manual: no, aunque venga con X-Reintentable: si', () => {
    expect(decidirReintento(CONSULTAR, conCodigo('CERT_REVOCADO', { 'X-Reintentable': 'si' }), 1, OPCIONES)).toEqual(NO);
    expect(decidirReintento(CONSULTAR, conCodigo('ERROR_GENERAL', { 'X-Reintentable': 'si' }), 1, OPCIONES)).toEqual(NO);
  });

  test('código o status en automatico: sí, con Retry-After en ms o con retroceso', () => {
    expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN'), 1, OPCIONES)).toEqual({ reintentar: true, esperaMs: 500 });
    expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN', { 'Retry-After': '7' }), 1, OPCIONES)).toEqual({
      reintentar: true,
      esperaMs: 7000,
    });
    // El status como texto: un 429 sin código, aun en una operación no idempotente.
    expect(decidirReintento(CAF_DESCARGAR, error(429, 'Demasiados pedidos'), 1, OPCIONES)).toEqual({
      reintentar: true,
      esperaMs: 500,
    });
    // Un código listado en automatico se reintenta aunque la operación no sea idempotente.
    const noIdempotente = operacion({ idempotente: false, reintentable: { automatico: ['SII_ERROR_CXN'], manual: [], nunca: [] } });
    expect(decidirReintento(noIdempotente, conCodigo('SII_ERROR_CXN'), 1, OPCIONES).reintentar).toBe(true);
  });

  test('un 409 con código no calza por status: lo decide su código (R11)', () => {
    const conCodigoNoListado = conCodigo('OTRO_CODIGO', { 'X-Reintentable': 'si' }, 409);
    expect(conCodigoNoListado.name).toBe('ErrorDeNegocio');
    // (a) No idempotente: un código no listado con X-Reintentable: si no alcanza.
    expect(decidirReintento(CAF_DESCARGAR, conCodigoNoListado, 1, OPCIONES)).toEqual(NO);
    // (b) Idempotente: cae a la fila del código no listado y se reintenta.
    expect(decidirReintento(CONSULTAR, conCodigoNoListado, 1, OPCIONES)).toEqual({ reintentar: true, esperaMs: 500 });
    // (d) Un 409 con un código listado en automatico se reintenta por su código.
    expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN', {}, 409), 1, OPCIONES)).toEqual({
      reintentar: true,
      esperaMs: 500,
    });
  });

  test('(c) un 429 con código no listado se reintenta por status, aun sin idempotencia, con su Retry-After', () => {
    const bloqueo = conCodigo('CAF_REQUEST_IN_PROGRESS', { 'Retry-After': '5' }, 429);
    expect(decidirReintento(CAF_DESCARGAR, bloqueo, 1, OPCIONES)).toEqual({ reintentar: true, esperaMs: 5000 });
  });

  test('Retry-After ausente, no numérico o negativo cae al retroceso', () => {
    for (const valor of ['', 'abc', '-5', '1.5', 'Wed, 21 Oct 2026 07:28:00 GMT']) {
      expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN', { 'Retry-After': valor }), 1, OPCIONES)).toEqual({
        reintentar: true,
        esperaMs: 500,
      });
    }
    expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN', { 'Retry-After': '0' }), 1, OPCIONES)).toEqual({
      reintentar: true,
      esperaMs: 0,
    });
  });

  test('código que la operación no lista: solo con X-Reintentable: si y operación idempotente', () => {
    const si = conCodigo('OTRO_CODIGO', { 'X-Reintentable': 'si' });
    expect(decidirReintento(CONSULTAR, si, 1, OPCIONES)).toEqual({ reintentar: true, esperaMs: 500 });
    expect(decidirReintento(CONSULTAR, conCodigo('OTRO_CODIGO', { 'X-Reintentable': 'si', 'Retry-After': '3' }), 1, OPCIONES)).toEqual({
      reintentar: true,
      esperaMs: 3000,
    });
    expect(decidirReintento(operacion({ idempotente: false }), si, 1, OPCIONES)).toEqual(NO);
    for (const reintentable of ['no', 'desconocido']) {
      expect(decidirReintento(CONSULTAR, conCodigo('OTRO_CODIGO', { 'X-Reintentable': reintentable }), 1, OPCIONES)).toEqual(NO);
    }
    expect(decidirReintento(CONSULTAR, conCodigo('OTRO_CODIGO'), 1, OPCIONES)).toEqual(NO);
  });

  test('cualquier otro (ErrorDeAutenticacion, ErrorDeFramework, sin código): no', () => {
    const autenticacion = error(401, '{"Message":"Authorization has been denied for this request."}');
    const framework = error(500, '{"Message":"An error has occurred."}');
    const sinCodigo = error(500, 'algo falló', { 'X-Reintentable': 'si' });
    expect(autenticacion.name).toBe('ErrorDeAutenticacion');
    expect(framework.name).toBe('ErrorDeFramework');
    for (const e of [autenticacion, framework, sinCodigo]) {
      expect(decidirReintento(CONSULTAR, e, 1, OPCIONES)).toEqual(NO);
    }
  });
});

describe('decidirReintento: retroceso, topes y casos que importan', () => {
  test('el retroceso duplica desde 500, se topa en 8000 y lleva entre 0.75 y 1.25 de azar', () => {
    const esperas = [1, 2, 3, 4, 5, 6, 7].map(
      (intento) => decidirReintento(CONSULTAR, conexion(), intento, { ...OPCIONES, maxReintentos: 10 }).esperaMs,
    );
    expect(esperas).toEqual([500, 1000, 2000, 4000, 8000, 8000, 8000]);
    const opciones = { maxReintentos: 10, esperaMaximaMs: 30000 };
    expect(decidirReintento(CONSULTAR, conexion(), 1, { ...opciones, azar: () => 0 }).esperaMs).toBe(375);
    expect(decidirReintento(CONSULTAR, conexion(), 5, { ...opciones, azar: () => 1 }).esperaMs).toBe(10000);
  });

  test('sin azar usa Math.random', () => {
    const { reintentar, esperaMs } = decidirReintento(CONSULTAR, conexion(), 1, { maxReintentos: 2, esperaMaximaMs: 30000 });
    expect(reintentar).toBe(true);
    expect(esperaMs).toBeGreaterThanOrEqual(375);
    expect(esperaMs).toBeLessThanOrEqual(625);
  });

  test('caf.descargar (no idempotente) no reintenta un ErrorDeConexion ni un 504', () => {
    for (const e of [conexion(false), conexion(true), tiempoAgotadoDeLaApi()]) {
      expect(decidirReintento(CAF_DESCARGAR, e, 1, { ...OPCIONES, maxReintentos: 10 })).toEqual(NO);
    }
  });

  test('caf.descargar no reintenta CNX_HTTP_ERROR_500 aunque venga con X-Reintentable: si', () => {
    const e = conCodigo('CNX_HTTP_ERROR_500', { 'X-Reintentable': 'si' });
    expect(e.reintentable).toBe('si');
    expect(decidirReintento(CAF_DESCARGAR, e, 1, { ...OPCIONES, maxReintentos: 10 })).toEqual(NO);
  });

  test('el límite de tasa no se reintenta con esperaMaximaMs 30000 y sí con 120000', () => {
    expect(decidirReintento(CONSULTAR, limite(), 1, { ...OPCIONES, esperaMaximaMs: 30000 })).toEqual(NO);
    expect(decidirReintento(CONSULTAR, limite(), 1, { ...OPCIONES, esperaMaximaMs: 120000 }).reintentar).toBe(true);
  });

  test('Retry-After: 30 se reintenta con esperaMaximaMs 30000', () => {
    const e = conCodigo('SII_ERROR_CXN', { 'Retry-After': '30' });
    expect(decidirReintento(CONSULTAR, e, 1, { ...OPCIONES, esperaMaximaMs: 30000 })).toEqual({ reintentar: true, esperaMs: 30000 });
    expect(decidirReintento(CONSULTAR, e, 1, { ...OPCIONES, esperaMaximaMs: 29999 })).toEqual(NO);
  });

  test('con intento > maxReintentos no reintenta', () => {
    expect(decidirReintento(CONSULTAR, conexion(), 2, { ...OPCIONES, maxReintentos: 2 }).reintentar).toBe(true);
    expect(decidirReintento(CONSULTAR, conexion(), 3, { ...OPCIONES, maxReintentos: 2 })).toEqual(NO);
    expect(decidirReintento(CONSULTAR, conCodigo('SII_ERROR_CXN'), 3, { ...OPCIONES, maxReintentos: 2 })).toEqual(NO);
  });

  test('maxReintentos 0 no reintenta nunca', () => {
    const opciones = { ...OPCIONES, maxReintentos: 0, esperaMaximaMs: 120000 };
    for (const e of [conexion(), tiempoAgotadoDeLaApi(), limite(), conCodigo('SII_ERROR_CXN'), conCodigo('X', { 'X-Reintentable': 'si' })]) {
      expect(decidirReintento(CONSULTAR, e, 1, opciones)).toEqual(NO);
    }
  });
});
