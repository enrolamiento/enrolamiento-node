import { describe, expect, test } from 'vitest';
import {
  EnrolamientoError,
  ErrorDeApi,
  ErrorDeAutenticacion,
  ErrorDeConexion,
  ErrorDeConfiguracion,
  ErrorDeFramework,
  ErrorDeLimite,
  ErrorDeNegocio,
  ErrorDeTiempoAgotado,
  errorDeRespuesta,
} from '../src/errors.js';

const OP = 'certificaciones_v1_crear';

function clasificar(status: number, cuerpo: string, cabeceras: Record<string, string> = {}): ErrorDeApi {
  return errorDeRespuesta(OP, status, new Headers(cabeceras), cuerpo);
}

describe('errorDeRespuesta clasifica en el orden de la guía', () => {
  test('500 con X-Codigo-Error y X-Reintentable: negocio con código, mensaje y reintentable', () => {
    const e = clasificar(500, 'SII_ERROR_CXN:No hay conexión', {
      'X-Codigo-Error': 'SII_ERROR_CXN',
      'X-Reintentable': 'si',
    });
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).toMatchObject({ codigo: 'SII_ERROR_CXN', subcodigo: null, mensaje: 'No hay conexión', reintentable: 'si' });
  });

  test('500 sin cabeceras con CODIGO:SUBCODIGO:mensaje: separa código, subcódigo y mensaje', () => {
    const e = clasificar(500, 'UKN:UNKNOWN_ERROR_CAF:falló -- System.Exception');
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).toMatchObject({
      codigo: 'UKN',
      subcodigo: 'UNKNOWN_ERROR_CAF',
      mensaje: 'falló -- System.Exception',
      reintentable: null,
    });
  });

  test('500 con CODIGO:mensaje que tiene dos puntos: el segundo segmento no es subcódigo', () => {
    const e = clasificar(500, 'INSUFICIENTE_SALDO:No es posible: verifique');
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).toMatchObject({ codigo: 'INSUFICIENTE_SALDO', subcodigo: null, mensaje: 'No es posible: verifique' });
  });

  test('404 con texto sin código: negocio sin código', () => {
    const e = clasificar(404, 'No existe una certificación para el RUT');
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).toMatchObject({ codigo: null, subcodigo: null, mensaje: 'No existe una certificación para el RUT' });
  });

  test('409 sin X-Codigo-Error: límite de tasa con reintentarEnMs 60000', () => {
    const e = clasificar(409, 'The allowed number of requests has been exceeded.');
    expect(e).toBeInstanceOf(ErrorDeLimite);
    expect((e as ErrorDeLimite).reintentarEnMs).toBe(60000);
    expect(e.codigo).toBeNull();
  });

  test('409 con X-Codigo-Error: negocio, no límite de tasa', () => {
    const e = clasificar(409, 'RESPALDO_EN_PROCESO:El respaldo está en proceso', {
      'X-Codigo-Error': 'RESPALDO_EN_PROCESO',
      'X-Reintentable': 'no',
    });
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).not.toBeInstanceOf(ErrorDeLimite);
    expect(e).toMatchObject({ codigo: 'RESPALDO_EN_PROCESO', mensaje: 'El respaldo está en proceso', reintentable: 'no' });
  });

  test('401 con cuerpo vacío: autenticación con mensaje no vacío', () => {
    const e = clasificar(401, '', { 'WWW-Authenticate': 'Basic' });
    expect(e).toBeInstanceOf(ErrorDeAutenticacion);
    expect(e.mensaje).not.toBe('');
    expect(e.codigo).toBeNull();
  });

  test('401 con JSON Message: autenticación con el Message como mensaje', () => {
    const e = clasificar(401, '{"Message":"Authorization has been denied for this request."}');
    expect(e).toBeInstanceOf(ErrorDeAutenticacion);
    expect(e.mensaje).toBe('Authorization has been denied for this request.');
  });

  test('504 con una página HTML: tiempo agotado en la capa de entrada', () => {
    const e = clasificar(504, '<html><body>504 Gateway Timeout</body></html>');
    expect(e).toBeInstanceOf(ErrorDeTiempoAgotado);
    expect(e.mensaje).not.toBe('');
    expect(e.mensaje).not.toMatch(/<html>/);
    expect(e.cuerpo).toBe('<html><body>504 Gateway Timeout</body></html>');
  });

  test('504 con X-Codigo-Error: negocio, no tiempo agotado', () => {
    const e = clasificar(504, 'SII_ERROR_CXN:No hay conexión', { 'X-Codigo-Error': 'SII_ERROR_CXN' });
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).not.toBeInstanceOf(ErrorDeTiempoAgotado);
  });

  test('400 con JSON Message: framework con el Message como mensaje', () => {
    const e = clasificar(400, '{"Message":"The request is invalid."}');
    expect(e).toBeInstanceOf(ErrorDeFramework);
    expect(e).toMatchObject({ mensaje: 'The request is invalid.', codigo: null });
  });

  test('502 con HTML: negocio sin código, sin lanzar', () => {
    let e: ErrorDeApi | undefined;
    expect(() => {
      e = clasificar(502, '<html>Bad Gateway</html>');
    }).not.toThrow();
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e).toMatchObject({ codigo: null, status: 502 });
  });

  test('500 con JSON sin Message: negocio sin código', () => {
    const e = clasificar(500, '{"otro":1}');
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e.codigo).toBeNull();
  });

  test('500 con cuerpo vacío: negocio con mensaje no vacío', () => {
    const e = clasificar(500, '');
    expect(e).toBeInstanceOf(ErrorDeNegocio);
    expect(e.codigo).toBeNull();
    expect(e.mensaje).not.toBe('');
  });
});

describe('propiedades comunes de ErrorDeApi', () => {
  const casos: Array<[string, ErrorDeApi, string]> = [
    ['negocio', clasificar(500, 'SII_ERROR_CXN:No hay conexión', { 'X-Codigo-Error': 'SII_ERROR_CXN' }), 'ErrorDeNegocio'],
    ['límite', clasificar(409, 'The allowed number of requests has been exceeded.'), 'ErrorDeLimite'],
    ['autenticación', clasificar(401, ''), 'ErrorDeAutenticacion'],
    ['tiempo agotado', clasificar(504, '<html></html>'), 'ErrorDeTiempoAgotado'],
    ['framework', clasificar(400, '{"Message":"The request is invalid."}'), 'ErrorDeFramework'],
  ];

  test.each(casos)('%s es ErrorDeApi y EnrolamientoError, con name de su clase', (_, e, nombre) => {
    expect(e).toBeInstanceOf(ErrorDeApi);
    expect(e).toBeInstanceOf(EnrolamientoError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe(nombre);
  });

  test.each(casos)('%s: message empieza con el operationId y el status', (_, e) => {
    expect(e.message.startsWith(`${OP} (HTTP ${e.status})`)).toBe(true);
  });

  test('conserva operacion, status, cabeceras y cuerpo', () => {
    const cabeceras = new Headers({ 'X-Codigo-Error': 'SII_ERROR_CXN', 'Retry-After': '30' });
    const e = errorDeRespuesta(OP, 500, cabeceras, 'SII_ERROR_CXN:No hay conexión');
    expect(e.operacion).toBe(OP);
    expect(e.status).toBe(500);
    expect(e.cabeceras).toBe(cabeceras);
    expect(e.cabeceras.get('Retry-After')).toBe('30');
    expect(e.cuerpo).toBe('SII_ERROR_CXN:No hay conexión');
  });

  test('message incluye el código y el mensaje', () => {
    const e = clasificar(500, 'UKN:UNKNOWN_ERROR_CAF:falló');
    expect(e.message).toBe(`${OP} (HTTP 500) UKN:UNKNOWN_ERROR_CAF: falló`);
  });

  test('X-Reintentable con un valor fuera de si/no/desconocido queda null', () => {
    const e = clasificar(500, 'X:y', { 'X-Codigo-Error': 'X', 'X-Reintentable': 'quizas' });
    expect(e.reintentable).toBeNull();
  });

  test('X-Codigo-Error que no abre el cuerpo: el mensaje es el cuerpo entero', () => {
    const e = clasificar(500, 'Otro texto', { 'X-Codigo-Error': 'CERT_REQUERIDO', 'X-Reintentable': 'no' });
    expect(e).toMatchObject({ codigo: 'CERT_REQUERIDO', subcodigo: null, mensaje: 'Otro texto' });
  });
});

describe('errores sin respuesta de la API', () => {
  test('ErrorDeConfiguracion lleva el mensaje dado', () => {
    const e = new ErrorDeConfiguracion('Falta ENROLAMIENTO_APIKEY');
    expect(e).toBeInstanceOf(EnrolamientoError);
    expect(e).not.toBeInstanceOf(ErrorDeApi);
    expect(e.name).toBe('ErrorDeConfiguracion');
    expect(e.message).toBe('Falta ENROLAMIENTO_APIKEY');
  });

  test('ErrorDeConexion lleva operacion, tiempoAgotado y la causa estándar', () => {
    const causa = new TypeError('fetch failed');
    const e = new ErrorDeConexion(OP, { tiempoAgotado: false, causa });
    expect(e).toBeInstanceOf(EnrolamientoError);
    expect(e).not.toBeInstanceOf(ErrorDeApi);
    expect(e.name).toBe('ErrorDeConexion');
    expect(e).toMatchObject({ operacion: OP, tiempoAgotado: false });
    expect(e.cause).toBe(causa);
    expect(e.message.startsWith(OP)).toBe(true);
  });

  test('ErrorDeConexion por tiempo agotado lo dice en el mensaje', () => {
    const e = new ErrorDeConexion(OP, { tiempoAgotado: true, causa: new Error('aborted') });
    expect(e.tiempoAgotado).toBe(true);
    expect(e.message).toMatch(/tiempo/);
  });
});
