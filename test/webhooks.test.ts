import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { EnrolamientoError, ErrorDeConfiguracion, ErrorDeFirma } from '../src/errors.js';
import {
  webhooks,
  type EventoCertificacionFinalizada,
  type EventoDeWebhook,
} from '../src/webhooks.js';

const SECRETO = 'a3f1c9e07b2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f';
const FECHA = '2026-11-23T10:15:30-03:00';
const AHORA = Date.parse(FECHA);

const CERTIFICACION: EventoCertificacionFinalizada = {
  evento: 'certificacion.finalizada',
  id: '6f1c2d3e-4a5b-4c6d-8e7f-901234567890',
  fecha: '2026-11-23T10:15:00-03:00',
  rut: '77777777-7',
  resolucion: { numero: 80, fecha: '2026-11-23' },
  respaldo: {
    estado: 'listo',
    codigo: null,
    url: 'https://ejemplo.invalid/respaldo.zip',
    documentos: { emitidos: 120, recibidos: 45, faltantes: 0 },
    completo_hasta: '2026-10-31',
    bytes: 52341,
    catalogo: 'normalizado',
    disponible_hasta: '2026-12-23T10:15:00-03:00',
  },
};
const CUERPO = JSON.stringify(CERTIFICACION);

/** Las cuatro cabeceras de una entrega, firmadas con `secreto`. */
function cabecerasDe(cuerpo: string, secreto = SECRETO, fecha = FECHA): Record<string, string> {
  return {
    'X-Enrolamiento-Evento': 'certificacion.finalizada',
    'X-Enrolamiento-Entrega': CERTIFICACION.id,
    ...webhooks.firmar(cuerpo, secreto, fecha),
  };
}

/** `secreto` en `null` llama a `verificar` sin secreto. */
function verificar(cuerpo: unknown, cabeceras: unknown, secreto: string | null = SECRETO): EventoDeWebhook {
  return webhooks.verificar(cuerpo as string, cabeceras as Headers, { secreto: secreto ?? undefined, ahora: AHORA });
}

function errorDe(fn: () => unknown): Error {
  try {
    fn();
  } catch (e) {
    return e as Error;
  }
  throw new Error('no lanzó');
}

beforeEach(() => {
  vi.stubEnv('ENROLAMIENTO_WEBHOOK_SECRETO', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('webhooks.firmar', () => {
  test('firma fecha + "." + cuerpo con el secreto como texto, en hexadecimal minúsculo', () => {
    const esperada = createHmac('sha256', Buffer.from(SECRETO, 'utf8')).update(`${FECHA}.${CUERPO}`, 'utf8').digest('hex');
    expect(webhooks.firmar(CUERPO, SECRETO, FECHA)).toEqual({
      'X-Enrolamiento-Fecha': FECHA,
      'X-Enrolamiento-Firma': `sha256=${esperada}`,
    });
  });

  test('sin fecha usa la hora actual en ISO', () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-23T13:00:00Z') });
    try {
      expect(webhooks.firmar(CUERPO, SECRETO)['X-Enrolamiento-Fecha']).toBe('2026-11-23T13:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('webhooks.verificar', () => {
  test('verifica lo que firmar produce y devuelve el evento tipado', () => {
    const evento = verificar(CUERPO, cabecerasDe(CUERPO));
    expect(evento).toEqual(CERTIFICACION);
    expect(evento.evento).toBe('certificacion.finalizada');
  });

  test('sin `ahora` compara contra el reloj real', () => {
    const fecha = new Date().toISOString();
    expect(webhooks.verificar(CUERPO, cabecerasDe(CUERPO, SECRETO, fecha), { secreto: SECRETO })).toEqual(CERTIFICACION);
  });

  test('toma el secreto de ENROLAMIENTO_WEBHOOK_SECRETO si no se pasa', () => {
    vi.stubEnv('ENROLAMIENTO_WEBHOOK_SECRETO', SECRETO);
    expect(verificar(CUERPO, cabecerasDe(CUERPO), null)).toEqual(CERTIFICACION);
  });

  test('acepta Headers y un objeto con las claves en cualquier capitalización', () => {
    const firmadas = cabecerasDe(CUERPO);
    expect(verificar(CUERPO, new Headers(firmadas))).toEqual(CERTIFICACION);

    const minusculas = Object.fromEntries(Object.entries(firmadas).map(([k, v]) => [k.toLowerCase(), v]));
    expect(verificar(CUERPO, minusculas)).toEqual(CERTIFICACION);

    const mezcladas = {
      'x-ENROLAMIENTO-fecha': firmadas['X-Enrolamiento-Fecha'],
      'X-ENROLAMIENTO-FIRMA': firmadas['X-Enrolamiento-Firma'],
    };
    expect(verificar(CUERPO, mezcladas)).toEqual(CERTIFICACION);

    // Como `IncomingMessage.headers` de Node: valores string, string[] o undefined.
    const deNode = {
      'x-enrolamiento-fecha': [firmadas['X-Enrolamiento-Fecha']!, 'otra'],
      'x-enrolamiento-firma': firmadas['X-Enrolamiento-Firma'],
      'x-enrolamiento-evento': undefined,
    };
    expect(verificar(CUERPO, deNode)).toEqual(CERTIFICACION);
  });

  test('acepta el cuerpo como string, Uint8Array y ArrayBuffer', () => {
    const conAcentos = JSON.stringify({ ...CERTIFICACION, rut: '77777777-7', resolucion: { numero: 1, fecha: 'año' } });
    const cabeceras = cabecerasDe(conAcentos);
    expect(verificar(conAcentos, cabeceras)).toEqual(JSON.parse(conAcentos));
    expect(verificar(new TextEncoder().encode(conAcentos), cabeceras)).toEqual(JSON.parse(conAcentos));
    expect(verificar(Buffer.from(conAcentos, 'utf8'), cabeceras)).toEqual(JSON.parse(conAcentos));
    // Lo que da `await request.arrayBuffer()` en un handler estilo fetch.
    const arrayBuffer = new TextEncoder().encode(conAcentos).buffer;
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(verificar(arrayBuffer, cabeceras)).toEqual(JSON.parse(conAcentos));
  });

  test('un cuerpo que es un objeto ya parseado lanza ErrorDeFirma que pide el cuerpo crudo', () => {
    const e = errorDe(() => verificar(CERTIFICACION, cabecerasDe(CUERPO)));
    expect(e).toBeInstanceOf(ErrorDeFirma);
    expect(e).toBeInstanceOf(EnrolamientoError);
    expect(e.message).toMatch(/cuerpo crudo/);
    expect(e.message).toMatch(/bytes exactos/);
    expect(e.message).toMatch(/ArrayBuffer/);
  });

  test('cuerpo cambiado, otro secreto, firma de otro largo, fecha ilegible: ErrorDeFirma', () => {
    const cabeceras = cabecerasDe(CUERPO);
    const cambiado = CUERPO.replace('77777777-7', '88888888-8');
    expect(() => verificar(cambiado, cabeceras)).toThrow(ErrorDeFirma);
    expect(() => verificar(` ${CUERPO}`, cabeceras)).toThrow(ErrorDeFirma);

    const otroSecreto = 'b'.repeat(64);
    expect(() => verificar(CUERPO, cabecerasDe(CUERPO, otroSecreto))).toThrow(ErrorDeFirma);

    // El secreto se usa como texto: firmar con sus bytes decodificados de hex no verifica.
    const conSecretoDecodificado = createHmac('sha256', Buffer.from(SECRETO, 'hex')).update(`${FECHA}.${CUERPO}`).digest('hex');
    expect(() =>
      verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Firma': `sha256=${conSecretoDecodificado}` }),
    ).toThrow(ErrorDeFirma);

    const firma = cabeceras['X-Enrolamiento-Firma']!;
    for (const otroLargo of [firma.slice(0, -2), `${firma}00`, firma.replace('sha256=', ''), 'sha256=']) {
      expect(() => verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Firma': otroLargo })).toThrow(ErrorDeFirma);
    }

    // Del largo correcto, pero en mayúsculas o con caracteres que no son hexadecimales: ErrorDeFirma y nada más.
    const hex = firma.slice('sha256='.length);
    expect(hex).toMatch(/[a-f]/);
    for (const malFormada of [`sha256=${hex.toUpperCase()}`, `sha256=${'z'.repeat(64)}`, `sha256=${'ñ'.repeat(64)}`]) {
      expect(errorDe(() => verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Firma': malFormada }))).toBeInstanceOf(
        ErrorDeFirma,
      );
    }

    // La fecha forma parte de lo firmado: cambiarla invalida la firma.
    expect(() =>
      verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Fecha': '2026-11-23T10:15:31-03:00' }),
    ).toThrow(ErrorDeFirma);

    // Firma correcta sobre una fecha que no se puede leer.
    for (const ilegible of ['ayer', '2026-11-23', '2026-11-23T10:15:30', '2026-13-45T99:99:99-03:00']) {
      const e = errorDe(() => verificar(CUERPO, cabecerasDe(CUERPO, SECRETO, ilegible)));
      expect(e).toBeInstanceOf(ErrorDeFirma);
      expect(e.message).toMatch(/X-Enrolamiento-Fecha/);
    }
  });

  test('la fecha que manda el remitente entra al mensaje acotada: sin saltos de línea y a lo más 40 caracteres', () => {
    const larga = `${'1'.repeat(20)}\r\n${'2'.repeat(478)}`;
    expect(larga).toHaveLength(500);
    const e = errorDe(() => verificar(CUERPO, cabecerasDe(CUERPO, SECRETO, larga)));
    expect(e).toBeInstanceOf(ErrorDeFirma);
    expect(e.message).not.toMatch(/[\r\n]/);
    const citada = /"([^"]*)"/.exec(e.message)?.[1];
    expect(citada).toBe(`${'1'.repeat(20)}${'2'.repeat(20)}`);
  });

  test('ningún mensaje de error contiene el secreto ni el cuerpo', () => {
    const cabeceras = cabecerasDe(CUERPO);
    const { 'X-Enrolamiento-Firma': firma } = cabeceras;
    const cambiado = CUERPO.replace('80', '81');
    const casos: [cuerpo: string, () => unknown][] = [
      [cambiado, () => verificar(cambiado, cabeceras)],
      [CUERPO, () => verificar(CERTIFICACION, cabeceras)],
      [CUERPO, () => verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Firma': 'sha256=00' })],
      ['no es json', () => verificar('no es json', cabecerasDe('no es json'))],
      [CUERPO, () => webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora: AHORA + 3_600_000 })],
      [CUERPO, () => verificar(CUERPO, cabecerasDe(CUERPO, SECRETO, 'ayer'))],
      [CUERPO, () => verificar(CUERPO, { 'X-Enrolamiento-Firma': firma })],
      [CUERPO, () => verificar(CUERPO, { ...cabeceras, 'X-Enrolamiento-Firma': undefined })],
    ];
    for (const [cuerpo, caso] of casos) {
      const e = errorDe(caso);
      expect(e).toBeInstanceOf(ErrorDeFirma);
      for (const texto of [e.message, String(e)]) {
        expect(texto).not.toContain(SECRETO);
        expect(texto).not.toContain(cuerpo);
        expect(texto).not.toContain(CERTIFICACION.rut);
      }
    }
  });

  test('más de 5 minutos de diferencia: ErrorDeFirma que nombra el reloj', () => {
    const cabeceras = cabecerasDe(CUERPO);
    const cincoMinutos = 300_000;
    expect(webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora: AHORA + cincoMinutos })).toEqual(CERTIFICACION);
    expect(webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora: AHORA - cincoMinutos })).toEqual(CERTIFICACION);

    for (const ahora of [AHORA + cincoMinutos + 1, AHORA - cincoMinutos - 1]) {
      const e = errorDe(() => webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora }));
      expect(e).toBeInstanceOf(ErrorDeFirma);
      expect(e.message).toMatch(/reloj/);
    }

    // La tolerancia se puede cambiar.
    expect(() =>
      webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora: AHORA + 2_000, toleranciaMs: 1_000 }),
    ).toThrow(/reloj/);
    expect(webhooks.verificar(CUERPO, cabeceras, { secreto: SECRETO, ahora: AHORA + 600_000, toleranciaMs: 900_000 })).toEqual(
      CERTIFICACION,
    );

    // Con las opciones por omisión y el reloj real, una entrega de hace una hora se rechaza.
    const haceUnaHora = new Date(Date.now() - 3_600_000).toISOString();
    expect(() => webhooks.verificar(CUERPO, cabecerasDe(CUERPO, SECRETO, haceUnaHora), { secreto: SECRETO })).toThrow(/reloj/);
  });

  test('una tolerancia o un reloj que no es un número finito: ErrorDeConfiguracion, no una ventana abierta', () => {
    // Por ejemplo `toleranciaMs: Number(process.env.TOLERANCIA)` con la variable sin definir.
    const viejas = cabecerasDe(CUERPO, SECRETO, '2020-01-01T00:00:00-03:00');
    for (const opciones of [
      { toleranciaMs: Number.NaN },
      { toleranciaMs: -1 },
      { toleranciaMs: Number.POSITIVE_INFINITY },
      { ahora: Number.NaN },
      { ahora: Number.POSITIVE_INFINITY },
    ]) {
      const e = errorDe(() => webhooks.verificar(CUERPO, viejas, { secreto: SECRETO, ...opciones }));
      expect(e, JSON.stringify(opciones)).toBeInstanceOf(ErrorDeConfiguracion);
    }
    expect(webhooks.verificar(CUERPO, cabecerasDe(CUERPO), { secreto: SECRETO, ahora: AHORA, toleranciaMs: 0 })).toEqual(CERTIFICACION);
  });

  test('el tercer argumento es el objeto de opciones: un texto (la firma vieja) lanza ErrorDeConfiguracion sin copiarlo', () => {
    for (const opciones of [SECRETO, 5, true]) {
      const e = errorDe(() => webhooks.verificar(CUERPO, cabecerasDe(CUERPO), opciones as never));
      expect(e, String(opciones)).toBeInstanceOf(ErrorDeConfiguracion);
      expect(e.message).toMatch(/secreto/);
      expect(e.message).not.toContain(SECRETO);
    }
  });

  test('opciones null valen como ausentes', () => {
    vi.stubEnv('ENROLAMIENTO_WEBHOOK_SECRETO', SECRETO);
    const cabeceras = cabecerasDe(CUERPO, SECRETO, new Date().toISOString());
    expect(webhooks.verificar(CUERPO, cabeceras, null as never).evento).toBe('certificacion.finalizada');
  });

  test('argumentos con otra forma lanzan ErrorDeConfiguracion sin copiar valores, no un TypeError', () => {
    for (const cabeceras of [null, undefined, 5]) {
      const e = errorDe(() => verificar(CUERPO, cabeceras));
      expect(e, String(cabeceras)).toBeInstanceOf(ErrorDeConfiguracion);
      expect(e.message).not.toContain(SECRETO);
    }
    const secretoRaro = errorDe(() => webhooks.verificar(CUERPO, cabecerasDe(CUERPO), { secreto: 12345 as never, ahora: AHORA }));
    expect(secretoRaro).toBeInstanceOf(ErrorDeConfiguracion);
    expect(secretoRaro.message).not.toContain('12345');
    const cuerpoRaro = errorDe(() => webhooks.firmar({ clave: 'cuerpo-secreto' } as never, SECRETO));
    expect(cuerpoRaro).toBeInstanceOf(ErrorDeConfiguracion);
    expect(cuerpoRaro.message).not.toContain('cuerpo-secreto');
    expect(cuerpoRaro.message).not.toContain(SECRETO);
    const firmarSinPrototipo = errorDe(() => webhooks.firmar(CUERPO, Object.create(null)));
    expect(firmarSinPrototipo).toBeInstanceOf(ErrorDeConfiguracion);
  });

  test('sin secreto en el argumento ni en el entorno: ErrorDeConfiguracion', () => {
    const e = errorDe(() => verificar(CUERPO, cabecerasDe(CUERPO), null));
    expect(e).toBeInstanceOf(ErrorDeConfiguracion);
    expect(e.message).toMatch(/ENROLAMIENTO_WEBHOOK_SECRETO/);
    expect(() => verificar(CUERPO, cabecerasDe(CUERPO), '')).toThrow(ErrorDeConfiguracion);
    expect(() => webhooks.firmar(CUERPO, '')).toThrow(ErrorDeConfiguracion);
  });

  test('falta X-Enrolamiento-Fecha o X-Enrolamiento-Firma: ErrorDeFirma que nombra la cabecera', () => {
    const { 'X-Enrolamiento-Fecha': fecha, 'X-Enrolamiento-Firma': firma } = cabecerasDe(CUERPO);
    const sinFecha = errorDe(() => verificar(CUERPO, { 'X-Enrolamiento-Firma': firma }));
    expect(sinFecha).toBeInstanceOf(ErrorDeFirma);
    expect(sinFecha.message).toMatch(/X-Enrolamiento-Fecha/);

    const sinFirma = errorDe(() => verificar(CUERPO, new Headers({ 'X-Enrolamiento-Fecha': fecha! })));
    expect(sinFirma).toBeInstanceOf(ErrorDeFirma);
    expect(sinFirma.message).toMatch(/X-Enrolamiento-Firma/);

    const vacia = errorDe(() => verificar(CUERPO, { 'X-Enrolamiento-Fecha': fecha, 'X-Enrolamiento-Firma': [] }));
    expect(vacia).toBeInstanceOf(ErrorDeFirma);
    expect(vacia.message).toMatch(/X-Enrolamiento-Firma/);
  });

  test('un cuerpo verificado que no es JSON o no trae `evento`: ErrorDeFirma', () => {
    for (const cuerpo of ['no es json', '[1,2]', 'null', '{"id":"x"}', '{"evento":3}']) {
      const e = errorDe(() => verificar(cuerpo, cabecerasDe(cuerpo)));
      expect(e).toBeInstanceOf(ErrorDeFirma);
      expect(e.message).toMatch(/evento|JSON/);
    }
    const malUtf8 = new Uint8Array([0x7b, 0xff, 0x7d]);
    const cabeceras = { 'X-Enrolamiento-Fecha': FECHA, 'X-Enrolamiento-Firma': `sha256=${createHmac('sha256', SECRETO).update(Buffer.concat([Buffer.from(`${FECHA}.`), malUtf8])).digest('hex')}` };
    expect(() => verificar(malUtf8, cabeceras)).toThrow(ErrorDeFirma);
  });

  test('un evento que el SDK no conoce se devuelve igual, con su `evento`', () => {
    const nuevo = { evento: 'folios.agotados', id: '1b2c', fecha: FECHA, rut: '77777777-7', restantes: 3 };
    const cuerpo = JSON.stringify(nuevo);
    const evento = verificar(cuerpo, cabecerasDe(cuerpo));
    expect(evento).toEqual(nuevo);
    expect(evento.evento).toBe('folios.agotados');
  });

  test('un respaldo sin la clave `codigo` verifica y se devuelve tal cual', () => {
    const { codigo: _codigo, ...sinCodigo } = CERTIFICACION.respaldo!;
    const evento = { evento: 'respaldo.finalizado', id: '4e5f', fecha: FECHA, rut: '77777777-7', respaldo: sinCodigo };
    const cuerpo = JSON.stringify(evento);
    expect(cuerpo).not.toContain('codigo');
    const recibido = verificar(cuerpo, cabecerasDe(cuerpo));
    expect(recibido).toEqual(evento);
    expect(recibido.evento === 'respaldo.finalizado' && 'codigo' in recibido.respaldo).toBe(false);
  });

  test('prueba y respaldo.finalizado se devuelven tal cual', () => {
    const prueba = { evento: 'prueba', id: '0a1b', fecha: FECHA };
    const respaldo = { evento: 'respaldo.finalizado', id: '2c3d', fecha: FECHA, rut: '77777777-7', respaldo: CERTIFICACION.respaldo };
    for (const evento of [prueba, respaldo]) {
      const cuerpo = JSON.stringify(evento);
      expect(verificar(cuerpo, cabecerasDe(cuerpo))).toEqual(evento);
    }
  });
});
