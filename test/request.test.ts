import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Enrolamiento from '../src/client.js';
import { ErrorDeApi, ErrorDeConexion, ErrorDeConfiguracion, ErrorDeNegocio, errorDeRespuesta } from '../src/errors.js';
import { Nucleo, PromesaDeApi, type OpcionesDeCliente, type Operacion } from '../src/request.js';
import { VERSION } from '../src/version.js';

const USUARIO = '77777777-7';
const APIKEY = 'clave-secreta-de-prueba';
const BASIC = `Basic ${Buffer.from(`${USUARIO}:${APIKEY}`).toString('base64')}`;

function operacion(parcial: Partial<Operacion> = {}): Operacion {
  return {
    id: 'prueba_v1_operacion',
    metodo: 'GET',
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

const CAF_DESCARGAR = operacion({
  id: 'caf_v1_descargar',
  metodo: 'POST',
  ruta: '/v1/caf/{rut}/descargar/{tipoDocumento}/{cantidad}',
  enRuta: ['rut', 'tipoDocumento', 'cantidad'],
  cuerpo: 'plano',
  idempotente: false,
  ambiente: 'query',
  ambienteObligatorio: true,
  // Las listas de `x-reintentable` del contrato (las de `nunca`, recortadas).
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

const EMPRESAS_PERMISOS = operacion({
  id: 'empresas_v1_permisos',
  metodo: 'POST',
  ruta: '/v1/empresas/{rutEmpresa}/permisos/{rutUsuario}/{ambiente}',
  enRuta: ['rutEmpresa', 'rutUsuario', 'ambiente'],
  cuerpo: 'plano',
  ambiente: 'ruta',
});

interface PedidoRegistrado {
  url: string;
  metodo: string | undefined;
  cabeceras: Headers;
  cuerpo: unknown;
  signal: AbortSignal | undefined;
}

function respuestaJson(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Un `fetch` que registra cada pedido y contesta con `responder`. */
function fetchFalso(responder: (pedido: PedidoRegistrado) => Response | Promise<Response> = () => respuestaJson({ ok: true })) {
  const pedidos: PedidoRegistrado[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const pedido: PedidoRegistrado = {
      url: String(url),
      metodo: init?.method,
      cabeceras: new Headers(init?.headers),
      cuerpo: init?.body,
      signal: init?.signal ?? undefined,
    };
    pedidos.push(pedido);
    return responder(pedido);
  });
  return { fetch: fn as unknown as typeof fetch, fn, pedidos };
}

/** Un `fetch` que nunca contesta: solo rechaza cuando su signal aborta. */
function fetchColgado() {
  return fetchFalso(
    (pedido) =>
      new Promise<Response>((_, rechazar) => {
        pedido.signal?.addEventListener('abort', () => rechazar(pedido.signal!.reason), { once: true });
      }),
  );
}

function cliente(f: { fetch: typeof fetch }, opciones: OpcionesDeCliente = {}): Enrolamiento {
  return new Enrolamiento({ usuario: USUARIO, apikey: APIKEY, fetch: f.fetch, ...opciones });
}

beforeEach(() => {
  vi.stubEnv('ENROLAMIENTO_USUARIO', '');
  vi.stubEnv('ENROLAMIENTO_APIKEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('arma el pedido', () => {
  test('arma método, URL, Basic, Accept y User-Agent', async () => {
    const f = fetchFalso();
    await cliente(f).pedir(operacion({ metodo: 'GET', ruta: '/v1/certificaciones/consultar' }), {});
    expect(f.pedidos).toHaveLength(1);
    const [pedido] = f.pedidos;
    expect(pedido!.metodo).toBe('GET');
    expect(pedido!.url).toBe('https://api.enrolamiento.cl/v1/certificaciones/consultar');
    expect(pedido!.cabeceras.get('Authorization')).toBe(BASIC);
    expect(pedido!.cabeceras.get('Accept')).toBe('application/json');
    expect(pedido!.cabeceras.get('User-Agent')).toBe(`enrolamiento-node/${VERSION}`);
  });

  test('toma las credenciales de ENROLAMIENTO_USUARIO y ENROLAMIENTO_APIKEY y respeta urlBase', async () => {
    vi.stubEnv('ENROLAMIENTO_USUARIO', USUARIO);
    vi.stubEnv('ENROLAMIENTO_APIKEY', APIKEY);
    const f = fetchFalso();
    await new Enrolamiento({ fetch: f.fetch, urlBase: 'http://127.0.0.1:4010/' }).pedir(operacion(), {});
    expect(f.pedidos[0]!.url).toBe('http://127.0.0.1:4010/v1/prueba');
    expect(f.pedidos[0]!.cabeceras.get('Authorization')).toBe(BASIC);
  });

  test('las cabeceras del cliente y del pedido se suman; las del pedido ganan', async () => {
    const f = fetchFalso();
    await cliente(f, { cabeceras: { 'X-Uno': 'cliente', 'X-Dos': 'cliente' } }).pedir(operacion(), {}, {
      cabeceras: { 'X-Dos': 'pedido', 'X-Consultar-Sii': 'forzar' },
    });
    const { cabeceras } = f.pedidos[0]!;
    expect(cabeceras.get('X-Uno')).toBe('cliente');
    expect(cabeceras.get('X-Dos')).toBe('pedido');
    expect(cabeceras.get('X-Consultar-Sii')).toBe('forzar');
    expect(cabeceras.get('Authorization')).toBe(BASIC);
  });

  test('codifica los parámetros de ruta', async () => {
    const f = fetchFalso();
    await cliente(f).pedir(CAF_DESCARGAR, { rut: '1.234.567-K', tipoDocumento: 33, cantidad: 10, ambiente: 0 });
    expect(f.pedidos[0]!.url).toBe(
      `https://api.enrolamiento.cl/v1/caf/${encodeURIComponent('1.234.567-K')}/descargar/33/10?ambiente=0`,
    );

    await cliente(f).pedir(operacion({ ruta: '/v1/x/{rut}', enRuta: ['rut'] }), { rut: 'a/b?c#d' });
    expect(f.pedidos[1]!.url).toBe('https://api.enrolamiento.cl/v1/x/a%2Fb%3Fc%23d');
  });

  test('un parámetro de ruta vacío, null, undefined, "." o ".." lanza ErrorDeConfiguracion sin llamar a fetch', async () => {
    const f = fetchFalso();
    for (const rut of ['', null, undefined, '.', '..']) {
      const promesa = cliente(f).pedir(CAF_DESCARGAR, { rut, tipoDocumento: 33, cantidad: 10, ambiente: 0 });
      await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
      await expect(promesa).rejects.toThrow(/rut/);
    }
    await expect(cliente(f).pedir(CAF_DESCARGAR, { tipoDocumento: 33, cantidad: 10, ambiente: 0 })).rejects.toThrow(
      ErrorDeConfiguracion,
    );
    expect(f.fn).not.toHaveBeenCalled();
  });

  test('un parámetro de ruta "." o ".." no borra el ambiente de la ruta: lanza ErrorDeConfiguracion sin llamar a fetch', async () => {
    const f = fetchFalso();
    for (const rutUsuario of ['.', '..']) {
      const promesa = cliente(f).pedir(EMPRESAS_PERMISOS, { rutEmpresa: '1-9', rutUsuario, ambiente: 0 });
      await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
      await expect(promesa).rejects.toThrow(/rutUsuario/);
    }
    expect(f.fn).not.toHaveBeenCalled();
  });

  test('la URL que llega a fetch conserva cada segmento de la ruta', async () => {
    const f = fetchFalso();
    await cliente(f).pedir(EMPRESAS_PERMISOS, { rutEmpresa: '1.234.567-K', rutUsuario: '.9-7', ambiente: 0 });
    await cliente(f).pedir(CAF_DESCARGAR, { rut: '...', tipoDocumento: 33, cantidad: 10, ambiente: 0 });
    const segmentos = f.pedidos.map((p) => new URL(p.url).pathname.split('/'));
    expect(segmentos).toEqual([
      ['', 'v1', 'empresas', '1.234.567-K', 'permisos', '.9-7', '0'],
      ['', 'v1', 'caf', '...', 'descargar', '33', '10'],
    ]);
  });

  test('lo que no es de ruta ni de query va al cuerpo JSON con Content-Type', async () => {
    const f = fetchFalso();
    const op = operacion({
      metodo: 'POST',
      ruta: '/v1/x/{rut}',
      enRuta: ['rut'],
      enQuery: ['forzar'],
      cuerpo: 'plano',
      ambiente: 'query',
    });
    await cliente(f).pedir(op, { rut: '1-9', forzar: true, ambiente: 0, Data: 'cert', Contrasenna: 'pw', Lista: [1, 2] });
    const [pedido] = f.pedidos;
    expect(pedido!.cabeceras.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(pedido!.cuerpo as string)).toEqual({ Data: 'cert', Contrasenna: 'pw', Lista: [1, 2] });
    expect(pedido!.url).toBe('https://api.enrolamiento.cl/v1/x/1-9?forzar=true&ambiente=0');
  });

  test('una operación sin cuerpo no manda Content-Type ni body', async () => {
    const f = fetchFalso();
    await cliente(f).pedir(operacion({ metodo: 'DELETE', ruta: '/v1/x/{rut}', enRuta: ['rut'] }), { rut: '1-9' });
    const [pedido] = f.pedidos;
    expect(pedido!.metodo).toBe('DELETE');
    expect(pedido!.cabeceras.has('Content-Type')).toBe(false);
    expect(pedido!.cuerpo).toBeUndefined();
  });

  test('en una operación sin cuerpo, un parámetro que no es de ruta ni de query lanza ErrorDeConfiguracion que lo nombra', async () => {
    const f = fetchFalso();
    const promesa = cliente(f).pedir(operacion({ enQuery: ['pagina'] }), { pagina: 1, Pagina: 2 });
    await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
    await expect(promesa).rejects.toThrow(/Pagina/);
    expect(f.fn).not.toHaveBeenCalled();
  });

  test('los query undefined se omiten; los boolean van como true/false', async () => {
    const f = fetchFalso();
    const op = operacion({ enQuery: ['pagina', 'activas', 'inactivas', 'texto'] });
    await cliente(f).pedir(op, { pagina: undefined, activas: true, inactivas: false, texto: 'a b&c' });
    const url = new URL(f.pedidos[0]!.url);
    expect(url.searchParams.has('pagina')).toBe(false);
    expect(url.searchParams.get('activas')).toBe('true');
    expect(url.searchParams.get('inactivas')).toBe('false');
    expect(url.searchParams.get('texto')).toBe('a b&c');
  });

  test('queryFija se agrega siempre', async () => {
    const f = fetchFalso();
    const op = operacion({ ruta: '/v1/respaldos/{rut}', enRuta: ['rut'], queryFija: { formato: 'json' } });
    await cliente(f).pedir(op, { rut: '1-9' });
    expect(f.pedidos[0]!.url).toBe('https://api.enrolamiento.cl/v1/respaldos/1-9?formato=json');
  });
});

describe('credenciales', () => {
  test('sin credenciales lanza ErrorDeConfiguracion que nombra las dos variables, sin llamar a fetch', async () => {
    const f = fetchFalso();
    // Construir el cliente sin entorno no lanza: las credenciales se resuelven en el primer pedido.
    const sinNada = new Enrolamiento({ fetch: f.fetch });
    const promesa = sinNada.pedir(operacion(), {});
    await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
    await expect(promesa).rejects.toThrow(/ENROLAMIENTO_USUARIO/);
    await expect(promesa).rejects.toThrow(/ENROLAMIENTO_APIKEY/);

    await expect(new Enrolamiento({ fetch: f.fetch, usuario: USUARIO }).pedir(operacion(), {})).rejects.toThrow(
      ErrorDeConfiguracion,
    );
    await expect(new Enrolamiento({ fetch: f.fetch, apikey: APIKEY }).pedir(operacion(), {})).rejects.toThrow(
      ErrorDeConfiguracion,
    );
    expect(f.fn).not.toHaveBeenCalled();
  });
});

describe('ambiente', () => {
  const ENQUERY = operacion({ ruta: '/v1/caf/{rut}', enRuta: ['rut'], ambiente: 'query' });

  test('ambiente del cliente se aplica a las operaciones que lo reciben, en query y en ruta', async () => {
    const f = fetchFalso();
    const c = cliente(f, { ambiente: 0 });
    await c.pedir(ENQUERY, { rut: '1-9' });
    await c.pedir(EMPRESAS_PERMISOS, { rutEmpresa: '1-9', rutUsuario: '2-7' });
    await c.pedir(operacion(), {});
    expect(f.pedidos.map((p) => p.url)).toEqual([
      'https://api.enrolamiento.cl/v1/caf/1-9?ambiente=0',
      'https://api.enrolamiento.cl/v1/empresas/1-9/permisos/2-7/0',
      'https://api.enrolamiento.cl/v1/prueba',
    ]);
    // El ambiente no se cuela en el cuerpo de una operación que lo lleva en la ruta.
    expect(JSON.parse(f.pedidos[1]!.cuerpo as string)).toEqual({});
  });

  test('ambiente de la llamada gana al del cliente', async () => {
    const f = fetchFalso();
    const c = cliente(f, { ambiente: 0 });
    await c.pedir(ENQUERY, { rut: '1-9', ambiente: 1 });
    await c.pedir(EMPRESAS_PERMISOS, { rutEmpresa: '1-9', rutUsuario: '2-7', ambiente: 1 });
    expect(f.pedidos.map((p) => p.url)).toEqual([
      'https://api.enrolamiento.cl/v1/caf/1-9?ambiente=1',
      'https://api.enrolamiento.cl/v1/empresas/1-9/permisos/2-7/1',
    ]);
  });

  test('ambienteObligatorio sin ambiente en la llamada ni en el cliente lanza ErrorDeConfiguracion sin llamar a fetch', async () => {
    const f = fetchFalso();
    const params = { rut: '1-9', tipoDocumento: 33, cantidad: 10, Data: 'cert', Contrasenna: 'pw' };
    const promesa = cliente(f).pedir(CAF_DESCARGAR, params);
    await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
    await expect(promesa).rejects.toThrow(/ambiente/);
    await expect(cliente(f).pedir(CAF_DESCARGAR, { ...params, ambiente: undefined })).rejects.toThrow(
      ErrorDeConfiguracion,
    );
    expect(f.fn).not.toHaveBeenCalled();

    await cliente(f, { ambiente: 1 }).pedir(CAF_DESCARGAR, params);
    expect(f.pedidos[0]!.url).toMatch(/\?ambiente=1$/);
  });

  test('un ambiente que no es 0 ni 1 (2, "0", "abc", null) lanza ErrorDeConfiguracion en cualquier operación que lo reciba', async () => {
    const f = fetchFalso();
    for (const ambiente of [2, '0', 'abc', null, -1, 0.5, Number.NaN]) {
      for (const op of [ENQUERY, EMPRESAS_PERMISOS, CAF_DESCARGAR]) {
        const params = { rut: '1-9', rutEmpresa: '1-9', rutUsuario: '2-7', tipoDocumento: 33, cantidad: 1, ambiente };
        const promesa = cliente(f).pedir(op, params);
        await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
        await expect(promesa).rejects.toThrow(/ambiente/);
      }
      // También si el inválido viene en las opciones del cliente (p. ej. desde JavaScript sin tipos).
      const delCliente = cliente(f, { ambiente: ambiente as 0 }).pedir(ENQUERY, { rut: '1-9' });
      await expect(delCliente).rejects.toThrow(ErrorDeConfiguracion);
    }
    expect(f.fn).not.toHaveBeenCalled();
  });

  test('el mensaje de un ambiente inválido no copia valores largos ni lanza otra cosa que ErrorDeConfiguracion', async () => {
    const f = fetchFalso();
    const largo = 'x'.repeat(200);
    const conLargo: unknown = await cliente(f).pedir(ENQUERY, { rut: '1-9', ambiente: largo }).catch((e: unknown) => e);
    expect(conLargo).toBeInstanceOf(ErrorDeConfiguracion);
    expect((conLargo as Error).message).not.toContain('xxxxxxxxxxxxxxxxxxxxx');
    expect((conLargo as Error).message).toMatch(/string/);

    const sinPrototipo: unknown = await cliente(f)
      .pedir(ENQUERY, { rut: '1-9', ambiente: Object.create(null) })
      .catch((e: unknown) => e);
    expect(sinPrototipo).toBeInstanceOf(ErrorDeConfiguracion);
    expect((sinPrototipo as Error).message).toMatch(/object/);

    const corto: unknown = await cliente(f).pedir(ENQUERY, { rut: '1-9', ambiente: 'abc' }).catch((e: unknown) => e);
    expect((corto as Error).message).toContain('"abc"');
    const numero: unknown = await cliente(f).pedir(ENQUERY, { rut: '1-9', ambiente: 2 }).catch((e: unknown) => e);
    expect((numero as Error).message).toMatch(/number 2/);
    expect(f.fn).not.toHaveBeenCalled();
  });

  test('ambiente en ruta sin valor omite el segmento', async () => {
    const f = fetchFalso();
    await cliente(f).pedir(EMPRESAS_PERMISOS, { rutEmpresa: '1-9', rutUsuario: '2-7' });
    expect(f.pedidos[0]!.url).toBe('https://api.enrolamiento.cl/v1/empresas/1-9/permisos/2-7');
  });
});

describe('respuesta', () => {
  test('200 devuelve el JSON; conRespuesta() da también la Response', async () => {
    const f = fetchFalso(() => respuestaJson({ rut: '1-9', estado: 3 }));
    const c = cliente(f);

    const promesa = c.pedir<{ rut: string; estado: number }>(operacion(), {});
    expect(promesa).toBeInstanceOf(PromesaDeApi);
    expect(promesa).toBeInstanceOf(Promise);
    await expect(promesa).resolves.toEqual({ rut: '1-9', estado: 3 });

    const { datos, respuesta } = await c.pedir(operacion(), {}).conRespuesta();
    expect(datos).toEqual({ rut: '1-9', estado: 3 });
    expect(respuesta).toBeInstanceOf(Response);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Content-Type')).toBe('application/json');
  });

  test('.then, .catch y .finally de PromesaDeApi se comportan como los de una Promise', async () => {
    const f = fetchFalso(() => respuestaJson({ n: 1 }));
    const c = cliente(f);
    await expect(c.pedir<{ n: number }>(operacion(), {}).then((d) => d.n + 1)).resolves.toBe(2);
    const fin = vi.fn();
    await expect(c.pedir(operacion(), {}).finally(fin)).resolves.toEqual({ n: 1 });
    expect(fin).toHaveBeenCalledOnce();

    const sinCredenciales = new Enrolamiento({ fetch: f.fetch }).pedir(operacion(), {});
    await expect(sinCredenciales.catch((e: unknown) => e)).resolves.toBeInstanceOf(ErrorDeConfiguracion);
  });

  test('una respuesta no 2xx lanza el error de errorDeRespuesta', async () => {
    const cabeceras = { 'X-Codigo-Error': 'SII_ERROR_CXN', 'X-Reintentable': 'si' };
    const f = fetchFalso(() => new Response('SII_ERROR_CXN:No hay conexión', { status: 500, headers: cabeceras }));
    const op = operacion({ id: 'certificaciones_v1_consultar' });
    const error: unknown = await cliente(f).pedir(op, {}, { maxReintentos: 0 }).catch((e: unknown) => e);

    const esperado = errorDeRespuesta(op.id, 500, new Headers(cabeceras), 'SII_ERROR_CXN:No hay conexión');
    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect(error).toMatchObject({
      operacion: esperado.operacion,
      status: esperado.status,
      codigo: esperado.codigo,
      subcodigo: esperado.subcodigo,
      mensaje: esperado.mensaje,
      reintentable: esperado.reintentable,
      cuerpo: esperado.cuerpo,
      message: esperado.message,
    });
    expect(f.fn).toHaveBeenCalledOnce();
  });

  test('un fetch que rechaza lanza ErrorDeConexion con tiempoAgotado false', async () => {
    const causa = new TypeError('fetch failed');
    const f = fetchFalso(() => Promise.reject(causa));
    const params = { rut: '1-9', tipoDocumento: 33, cantidad: 10, ambiente: 0 };
    const error: unknown = await cliente(f).pedir(CAF_DESCARGAR, params).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeConexion);
    expect(error).toMatchObject({ tiempoAgotado: false, operacion: 'caf_v1_descargar', cause: causa });
  });

  test('un signal del llamador que aborta lanza ErrorDeConexion con tiempoAgotado false', async () => {
    const f = fetchColgado();
    const controlador = new AbortController();
    const promesa = cliente(f).pedir(operacion(), {}, { signal: controlador.signal });
    await vi.waitFor(() => expect(f.fn).toHaveBeenCalledOnce());
    controlador.abort();
    const error: unknown = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeConexion);
    expect(error).toMatchObject({ tiempoAgotado: false });
  });

  test('pasado timeoutMs aborta y lanza ErrorDeConexion con tiempoAgotado true', async () => {
    vi.useFakeTimers();
    const f = fetchColgado();
    const promesa = cliente(f, { timeoutMs: 65000 }).pedir(operacion(), {}, { timeoutMs: 1000, maxReintentos: 0 });
    const resultado = promesa.then(
      () => 'resolvió',
      (e: unknown) => e,
    );

    await vi.advanceTimersByTimeAsync(999);
    expect(f.pedidos[0]!.signal!.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(f.pedidos[0]!.signal!.aborted).toBe(true);
    const error = await resultado;
    expect(error).toBeInstanceOf(ErrorDeConexion);
    expect(error).toMatchObject({ tiempoAgotado: true, operacion: 'prueba_v1_operacion' });
  });

  test('un timeoutMs que no es un número de 1 a 2147483647 lanza ErrorDeConfiguracion sin llamar a fetch ni escribir en consola', async () => {
    const f = fetchFalso();
    const avisos = vi.fn();
    process.on('warning', avisos);
    try {
      for (const timeoutMs of [Infinity, -Infinity, Number.NaN, 0, -1, 0.5, 2147483648, '1000']) {
        const delPedido = cliente(f).pedir(operacion(), {}, { timeoutMs: timeoutMs as number });
        await expect(delPedido).rejects.toThrow(ErrorDeConfiguracion);
        await expect(delPedido).rejects.toThrow(/timeoutMs/);
        const delCliente = cliente(f, { timeoutMs: timeoutMs as number }).pedir(operacion(), {});
        await expect(delCliente).rejects.toThrow(ErrorDeConfiguracion);
      }
      expect(f.fn).not.toHaveBeenCalled();

      // Los extremos válidos llegan a fetch.
      await cliente(f).pedir(operacion(), {}, { timeoutMs: 1 });
      await cliente(f).pedir(operacion(), {}, { timeoutMs: 2147483647 });
      expect(f.fn).toHaveBeenCalledTimes(2);
      // Dar una vuelta para que un TimeoutOverflowWarning, si lo hubiera, se emita.
      await new Promise((resolver) => setImmediate(resolver));
      expect(avisos).not.toHaveBeenCalled();
    } finally {
      process.off('warning', avisos);
    }
  });

  test('timeoutMs del cliente se aplica si el pedido no trae el suyo', async () => {
    vi.useFakeTimers();
    const f = fetchColgado();
    const resultado = cliente(f, { timeoutMs: 5000, maxReintentos: 0 })
      .pedir(operacion(), {})
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(4999);
    expect(f.pedidos[0]!.signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(resultado).resolves.toMatchObject({ tiempoAgotado: true });
  });
});

describe('reintentos', () => {
  const CONSULTAR = operacion({
    id: 'empresas_v1_consultar',
    metodo: 'POST',
    reintentable: { automatico: ['409', '429', 'SII_ERROR_CXN'], manual: ['ERROR_GENERAL'], nunca: [] },
  });
  const CAF_PARAMS = { rut: '1-9', tipoDocumento: 33, cantidad: 10, ambiente: 0, Data: 'cert', Contrasenna: 'pw' };

  /** Un 500 con `SII_ERROR_CXN` cuyo mensaje dice qué intento fue. */
  function sinConexionConElSii(intento: number): Response {
    return new Response(`SII_ERROR_CXN:intento ${intento}`, { status: 500, headers: { 'X-Codigo-Error': 'SII_ERROR_CXN' } });
  }

  /** Un `fetch` que contesta `SII_ERROR_CXN` hasta el intento `exitoEn` (exclusivo) y 200 desde ahí. */
  function fetchQueFallaHasta(exitoEn = Infinity) {
    let intento = 0;
    return fetchFalso(() => (++intento < exitoEn ? sinConexionConElSii(intento) : respuestaJson({ intento })));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    // Azar 0.5: el retroceso queda en 500, 1000, 2000… exactos.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('reintenta SII_ERROR_CXN en una operación idempotente y devuelve el 200 del tercer intento', async () => {
    const f = fetchQueFallaHasta(3);
    const resultado = cliente(f)
      .pedir(CONSULTAR, {})
      .then(
        (datos) => datos,
        (e: unknown) => e,
      );

    await vi.advanceTimersByTimeAsync(0);
    expect(f.fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(f.fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(f.fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.fn).toHaveBeenCalledTimes(3);
    await expect(resultado).resolves.toEqual({ intento: 3 });
    // Cada intento es el mismo pedido.
    expect(new Set(f.pedidos.map((p) => `${p.metodo} ${p.url} ${p.cabeceras.get('Authorization')}`)).size).toBe(1);
  });

  test('agotados los reintentos lanza el último error', async () => {
    const f = fetchQueFallaHasta();
    const resultado = cliente(f)
      .pedir(CONSULTAR, {})
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const error = await resultado;
    expect(f.fn).toHaveBeenCalledTimes(3);
    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect(error).toMatchObject({ codigo: 'SII_ERROR_CXN', mensaje: 'intento 3' });
  });

  test('maxReintentos de la llamada gana al del cliente', async () => {
    const masQueElCliente = fetchQueFallaHasta();
    const uno = cliente(masQueElCliente, { maxReintentos: 0 })
      .pedir(CONSULTAR, {}, { maxReintentos: 3 })
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await expect(uno).resolves.toMatchObject({ mensaje: 'intento 4' });
    expect(masQueElCliente.fn).toHaveBeenCalledTimes(4);

    const menosQueElCliente = fetchQueFallaHasta();
    const otro = cliente(menosQueElCliente, { maxReintentos: 5 })
      .pedir(CONSULTAR, {}, { maxReintentos: 0 })
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await expect(otro).resolves.toMatchObject({ mensaje: 'intento 1' });
    expect(menosQueElCliente.fn).toHaveBeenCalledTimes(1);

    // Sin maxReintentos en la llamada vale el del cliente.
    const delCliente = fetchQueFallaHasta();
    const tercero = cliente(delCliente, { maxReintentos: 1 })
      .pedir(CONSULTAR, {})
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await tercero;
    expect(delCliente.fn).toHaveBeenCalledTimes(2);
  });

  test('un signal abortado durante la espera corta sin otro intento', async () => {
    const f = fetchQueFallaHasta();
    const controlador = new AbortController();
    const resultado = cliente(f)
      .pedir(CONSULTAR, {}, { signal: controlador.signal })
      .then(
        () => 'resolvió',
        (e: unknown) => e,
      );
    await vi.advanceTimersByTimeAsync(100);
    expect(f.fn).toHaveBeenCalledTimes(1);

    controlador.abort();
    const error = await resultado;
    expect(error).toBeInstanceOf(ErrorDeConexion);
    expect(error).toMatchObject({ tiempoAgotado: false, operacion: 'empresas_v1_consultar' });

    await vi.runAllTimersAsync();
    expect(f.fn).toHaveBeenCalledTimes(1);
  });

  test('un signal que aborta durante un intento no se reintenta, aunque la operación sea idempotente', async () => {
    const f = fetchColgado();
    const controlador = new AbortController();
    const resultado = cliente(f)
      .pedir(CONSULTAR, {}, { signal: controlador.signal })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    controlador.abort();
    await expect(resultado).resolves.toMatchObject({ name: 'ErrorDeConexion', tiempoAgotado: false });
    await vi.runAllTimersAsync();
    expect(f.fn).toHaveBeenCalledTimes(1);
  });

  test('caf_v1_descargar (no idempotente) se intenta una sola vez ante falla de red, tiempo agotado del SDK o 504', async () => {
    const generoso: OpcionesDeCliente = { maxReintentos: 10, esperaMaximaMs: 2147483647 };

    const red = fetchFalso(() => Promise.reject(new TypeError('fetch failed')));
    const deRed = cliente(red, generoso)
      .pedir(CAF_DESCARGAR, CAF_PARAMS)
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await expect(deRed).resolves.toMatchObject({ name: 'ErrorDeConexion', tiempoAgotado: false });
    expect(red.fn).toHaveBeenCalledTimes(1);

    const colgado = fetchColgado();
    const deTiempo = cliente(colgado, generoso)
      .pedir(CAF_DESCARGAR, CAF_PARAMS, { timeoutMs: 10 })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10);
    await expect(deTiempo).resolves.toMatchObject({ name: 'ErrorDeConexion', tiempoAgotado: true });
    await vi.runAllTimersAsync();
    expect(colgado.fn).toHaveBeenCalledTimes(1);

    const pasarela = fetchFalso(() => new Response('', { status: 504 }));
    const de504 = cliente(pasarela, generoso)
      .pedir(CAF_DESCARGAR, CAF_PARAMS)
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await expect(de504).resolves.toMatchObject({ name: 'ErrorDeTiempoAgotado', status: 504 });
    expect(pasarela.fn).toHaveBeenCalledTimes(1);

    const manual = fetchFalso(
      () =>
        new Response('CNX_HTTP_ERROR_500:falló', {
          status: 500,
          headers: { 'X-Codigo-Error': 'CNX_HTTP_ERROR_500', 'X-Reintentable': 'si' },
        }),
    );
    const deManual = cliente(manual, generoso)
      .pedir(CAF_DESCARGAR, CAF_PARAMS)
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    await expect(deManual).resolves.toMatchObject({ codigo: 'CNX_HTTP_ERROR_500' });
    expect(manual.fn).toHaveBeenCalledTimes(1);
  });

  test('el límite de tasa espera 60000 más el azar y reintenta si esperaMaximaMs lo permite', async () => {
    let intento = 0;
    const f = fetchFalso(() => (++intento === 1 ? new Response('', { status: 409 }) : respuestaJson({ intento })));
    const resultado = cliente(f, { esperaMaximaMs: 120000 })
      .pedir(CAF_DESCARGAR, CAF_PARAMS)
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(64999);
    expect(f.fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.fn).toHaveBeenCalledTimes(2);
    await expect(resultado).resolves.toEqual({ intento: 2 });

    // Con el tope por omisión (30000) no espera: lanza el ErrorDeLimite.
    const g = fetchFalso(() => new Response('', { status: 409 }));
    const error: unknown = await cliente(g).pedir(CAF_DESCARGAR, CAF_PARAMS).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: 'ErrorDeLimite' });
    expect(g.fn).toHaveBeenCalledTimes(1);
  });
});

describe('opciones de reintento', () => {
  test('maxReintentos fuera de 0..10 o no entero y esperaMaximaMs fuera de 0..2147483647 lanzan ErrorDeConfiguracion sin llamar a fetch', async () => {
    const f = fetchFalso();
    const avisos = vi.fn();
    process.on('warning', avisos);
    try {
      for (const maxReintentos of [-1, 11, 1.5, Number.NaN, Infinity, '2', null]) {
        const delPedido = cliente(f).pedir(operacion(), {}, { maxReintentos: maxReintentos as number });
        await expect(delPedido).rejects.toThrow(ErrorDeConfiguracion);
        await expect(delPedido).rejects.toThrow(/maxReintentos/);
        const delCliente = cliente(f, { maxReintentos: maxReintentos as number }).pedir(operacion(), {});
        await expect(delCliente).rejects.toThrow(ErrorDeConfiguracion);
      }
      for (const esperaMaximaMs of [-1, Number.NaN, Infinity, -Infinity, 2147483648, '1000', null]) {
        const promesa = cliente(f, { esperaMaximaMs: esperaMaximaMs as number }).pedir(operacion(), {});
        await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
        await expect(promesa).rejects.toThrow(/esperaMaximaMs/);
      }
      expect(f.fn).not.toHaveBeenCalled();

      // Los extremos válidos llegan a fetch.
      await cliente(f, { maxReintentos: 10, esperaMaximaMs: 0 }).pedir(operacion(), {}, { maxReintentos: 0 });
      await cliente(f, { maxReintentos: 0, esperaMaximaMs: 2147483647 }).pedir(operacion(), {}, { maxReintentos: 10 });
      expect(f.fn).toHaveBeenCalledTimes(2);
      await new Promise((resolver) => setImmediate(resolver));
      expect(avisos).not.toHaveBeenCalled();
    } finally {
      process.off('warning', avisos);
    }
  });
});

describe('secretos', () => {
  test('ningún error contiene la apikey, el Authorization ni el cuerpo del pedido', async () => {
    const SECRETO_DEL_CUERPO = 'contrasenna-del-pfx-123';
    const params = { rut: '1-9', tipoDocumento: 33, cantidad: 10, Data: 'MIIcertificado', Contrasenna: SECRETO_DEL_CUERPO };
    const prohibidos = [APIKEY, BASIC, Buffer.from(`${USUARIO}:${APIKEY}`).toString('base64'), SECRETO_DEL_CUERPO, 'MIIcertificado'];

    const errores: unknown[] = [];
    const capturar = (p: Promise<unknown>) => p.then(() => expect.fail('debía fallar'), (e: unknown) => errores.push(e));

    // Configuración: sin ambiente, con un parámetro de ruta vacío y con un parámetro sobrante.
    await capturar(cliente(fetchFalso()).pedir(CAF_DESCARGAR, params));
    await capturar(cliente(fetchFalso()).pedir(CAF_DESCARGAR, { ...params, rut: '', ambiente: 0 }));
    await capturar(cliente(fetchFalso()).pedir(operacion(), { Contrasenna: SECRETO_DEL_CUERPO }));
    // Respuesta de error de la API.
    await capturar(
      cliente(fetchFalso(() => new Response('UKN:falló', { status: 500 }))).pedir(CAF_DESCARGAR, { ...params, ambiente: 0 }),
    );
    // Conexión: fetch rechaza, y tiempo agotado.
    await capturar(
      cliente(fetchFalso(() => Promise.reject(new TypeError('fetch failed')))).pedir(CAF_DESCARGAR, { ...params, ambiente: 0 }),
    );
    vi.useFakeTimers();
    const colgado = cliente(fetchColgado()).pedir(CAF_DESCARGAR, { ...params, ambiente: 0 }, { timeoutMs: 10 });
    const tiempo = capturar(colgado);
    await vi.advanceTimersByTimeAsync(10);
    await tiempo;

    expect(errores).toHaveLength(6);
    expect(errores[0]).toBeInstanceOf(ErrorDeConfiguracion);
    expect(errores[3]).toBeInstanceOf(ErrorDeApi);
    expect(errores[4]).toBeInstanceOf(ErrorDeConexion);
    expect(errores[5]).toMatchObject({ tiempoAgotado: true });
    for (const error of errores) {
      const e = error as Error;
      const textos = [JSON.stringify(e), String(e), e.stack ?? '', inspect(e, { depth: 10, showHidden: true })];
      for (const texto of textos) {
        for (const prohibido of prohibidos) expect(texto).not.toContain(prohibido);
      }
    }
  });

  test('el cliente no expone la apikey al serializarlo ni al inspeccionarlo', () => {
    const c = cliente(fetchFalso());
    expect(c).toBeInstanceOf(Nucleo);
    expect(JSON.stringify(c)).not.toContain(APIKEY);
    expect(inspect(c, { depth: 10, showHidden: true })).not.toContain(APIKEY);
  });
});
