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

  test('un parámetro de ruta vacío, null o undefined lanza ErrorDeConfiguracion sin llamar a fetch', async () => {
    const f = fetchFalso();
    for (const rut of ['', null, undefined]) {
      const promesa = cliente(f).pedir(CAF_DESCARGAR, { rut, tipoDocumento: 33, cantidad: 10, ambiente: 0 });
      await expect(promesa).rejects.toThrow(ErrorDeConfiguracion);
      await expect(promesa).rejects.toThrow(/rut/);
    }
    await expect(cliente(f).pedir(CAF_DESCARGAR, { tipoDocumento: 33, cantidad: 10, ambiente: 0 })).rejects.toThrow(
      ErrorDeConfiguracion,
    );
    expect(f.fn).not.toHaveBeenCalled();
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
    const error: unknown = await cliente(f).pedir(op, {}).catch((e: unknown) => e);

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
    const error: unknown = await cliente(f).pedir(operacion({ id: 'caf_v1_descargar' }), {}).catch((e: unknown) => e);
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
    const promesa = cliente(f, { timeoutMs: 65000 }).pedir(operacion(), {}, { timeoutMs: 1000 });
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

  test('timeoutMs del cliente se aplica si el pedido no trae el suyo', async () => {
    vi.useFakeTimers();
    const f = fetchColgado();
    const resultado = cliente(f, { timeoutMs: 5000 })
      .pedir(operacion(), {})
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(4999);
    expect(f.pedidos[0]!.signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(resultado).resolves.toMatchObject({ tiempoAgotado: true });
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
