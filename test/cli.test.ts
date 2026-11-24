// El CLI por su función `ejecutar`, con un receptor de webhooks real en un puerto local y un `fetch` falso
// para la API. No abre procesos: el binario empaquetado se prueba en package.test.ts.

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, test } from 'vitest';
import { ejecutar, type Entorno } from '../src/cli/main.js';
import { CASOS, fechaDeAviso, type ResultadoDeCaso } from '../src/cli/webhooks-probar.js';
import type { Comprobacion } from '../src/cli/doctor.js';
import { ErrorDeFirma, VERSION, VERSION_DEL_CONTRATO, webhooks } from '../src/index.js';

const SECRETO = 'secreto-de-prueba';

interface Corrida {
  salida: number;
  stdout: string;
  stderr: string;
}

async function correr(argumentos: string[], entorno: Partial<Entorno> = {}): Promise<Corrida> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const salida = await ejecutar(argumentos, {
    env: {},
    salida: (linea) => stdout.push(linea),
    error: (linea) => stderr.push(linea),
    ...entorno,
  });
  return { salida, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}

const servidores: Server[] = [];
afterEach(async () => {
  await Promise.all(servidores.splice(0).map((s) => new Promise((listo) => s.close(listo))));
});

interface Recibido {
  cuerpo: string;
  cabeceras: Record<string, string | string[] | undefined>;
}

/** Levanta un receptor en un puerto libre. `responder` decide el status de cada entrega. */
async function receptor(responder: (recibido: Recibido) => number | Promise<number>): Promise<{ url: string; recibidos: Recibido[] }> {
  const recibidos: Recibido[] = [];
  const servidor = createServer((pedido, respuesta) => {
    const trozos: Buffer[] = [];
    pedido.on('data', (trozo: Buffer) => trozos.push(trozo));
    pedido.on('end', async () => {
      const recibido = { cuerpo: Buffer.concat(trozos).toString('utf8'), cabeceras: pedido.headers };
      recibidos.push(recibido);
      const status = await responder(recibido);
      respuesta.writeHead(status, status >= 300 && status < 400 ? { Location: 'http://127.0.0.1:1/' } : {}).end();
    });
  });
  servidores.push(servidor);
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  return { url: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`, recibidos };
}

/** Un receptor bien hecho: verifica con el SDK y responde 204 o 401. */
const verifica = ({ cuerpo, cabeceras }: Recibido): number => {
  try {
    webhooks.verificar(cuerpo, cabeceras, { secreto: SECRETO });
    return 204;
  } catch (error) {
    return error instanceof ErrorDeFirma ? 401 : 500;
  }
};

const conSecreto = { env: { ENROLAMIENTO_WEBHOOK_SECRETO: SECRETO } };

describe('enrolamiento', () => {
  test('--version imprime la versión del paquete y la del contrato', async () => {
    expect(await correr(['--version'])).toEqual({ salida: 0, stdout: `${VERSION} (contrato ${VERSION_DEL_CONTRATO})`, stderr: '' });
  });

  test('sin argumentos y con --help imprime la ayuda, que nombra los dos comandos', async () => {
    for (const argumentos of [[], ['--help'], ['-h']]) {
      const corrida = await correr(argumentos);
      expect(corrida.salida).toBe(0);
      expect(corrida.stdout).toContain('enrolamiento webhooks probar');
      expect(corrida.stdout).toContain('enrolamiento doctor');
    }
  });

  test('cada comando tiene su --help, con un ejemplo, y no hace nada más', async () => {
    const probar = await correr(['webhooks', 'probar', '--help']);
    expect(probar).toMatchObject({ salida: 0, stderr: '' });
    expect(probar.stdout).toContain('Ejemplo:');
    const doctor = await correr(['doctor', '-h'], { fetch: () => Promise.reject(new Error('no debe llamar a la API')) });
    expect(doctor).toMatchObject({ salida: 0, stderr: '' });
    expect(doctor.stdout).toContain('enrolamiento doctor');
  });

  test('un comando o una opción que no existe sale con 2 y lo dice por la salida de errores', async () => {
    for (const argumentos of [
      ['listen'],
      ['listen', '--help'],
      ['webhooks'],
      ['webhooks', 'probar', '--no-existe'],
      ['webhooks', 'probar', '--url'],
      ['webhooks', 'probar', '--json=si'],
      ['doctor', '--url'],
      ['doctor', 'sobra'],
    ]) {
      const corrida = await correr(argumentos, conSecreto);
      expect({ argumentos, salida: corrida.salida, stdout: corrida.stdout }).toEqual({ argumentos, salida: 2, stdout: '' });
      expect(corrida.stderr).toContain('enrolamiento --help');
    }
  });
});

describe('lo escrito en la consola no se repite: puede ser un secreto pegado por error', () => {
  const PRIVADO = 'Valor-Privado-1234';

  test.each([
    [['doctor', PRIVADO]],
    [['doctor', `--${PRIVADO}`]],
    [['doctor', `--json=${PRIVADO}`]],
    [[PRIVADO]],
    [[PRIVADO, '--help']],
    [['webhook', 'probar', `--secreto=${PRIVADO}`]],
    [['webhooks', PRIVADO]],
    [['webhooks', 'probar', PRIVADO]],
    [['webhooks', 'probar', `--${PRIVADO}`]],
    [['webhooks', 'probar', '--caso', PRIVADO]],
    [['webhooks', 'probar', '--secreto', PRIVADO]],
    [['webhooks', 'probar', '--listar', `--json=${PRIVADO}`]],
    [['webhooks', 'probar', '--url', `http://127.0.0.1:1/?clave=${PRIVADO}`]],
    [['webhooks', 'probar', '--url', `https://${PRIVADO}.example/`]],
    [['webhooks', 'probar', '--url', PRIVADO]],
  ])('%j', async (argumentos) => {
    const corrida = await correr(argumentos, conSecreto);
    expect(corrida.salida).not.toBe(0);
    expect(corrida.stdout + corrida.stderr).not.toMatch(new RegExp(PRIVADO, 'i'));
  });

  test('un comando con forma de nombre sí se nombra', async () => {
    expect((await correr(['listen'])).stderr).toContain('No existe el comando «listen».');
  });

  test('una falla que nadie previó muestra solo su clase', async () => {
    const corrida = await correr(['webhooks', 'probar', '--caso', 'prueba'], {
      ...conSecreto,
      ahora: () => {
        throw new RangeError(PRIVADO);
      },
    });
    expect(corrida).toMatchObject({ salida: 1, stdout: '', stderr: 'Falla inesperada (RangeError).' });
  });
});

describe('webhooks probar', () => {
  test('un receptor que verifica con el SDK pasa todos los casos y sale con 0', async () => {
    const { url, recibidos } = await receptor(verifica);
    const corrida = await correr(['webhooks', 'probar', '--url', url, '--json'], conSecreto);
    const informe = JSON.parse(corrida.stdout) as { correctos: number; total: number; casos: ResultadoDeCaso[] };

    expect(informe.casos.filter((c) => !c.correcto)).toEqual([]);
    expect(informe).toMatchObject({ correctos: CASOS.length, total: CASOS.length });
    expect(corrida).toMatchObject({ salida: 0, stderr: '' });
    // Los que debe aceptar respondieron 204 y los que debe rechazar, 401.
    expect(new Set(informe.casos.filter((c) => c.espera === 'aceptar').map((c) => c.status))).toEqual(new Set([204]));
    expect(new Set(informe.casos.filter((c) => c.espera === 'rechazar').map((c) => c.status))).toEqual(new Set([401]));
    // «repetida» se envía dos veces: una entrega más que casos.
    expect(recibidos).toHaveLength(CASOS.length + 1);
  });

  test('un receptor que acepta todo falla en los cuatro casos que debe rechazar y sale con 1', async () => {
    const { url } = await receptor(() => 200);
    const corrida = await correr(['webhooks', 'probar', '--url', url, '--json'], conSecreto);
    const informe = JSON.parse(corrida.stdout) as { casos: ResultadoDeCaso[] };

    expect(corrida.salida).toBe(1);
    expect(informe.casos.filter((c) => !c.correcto).map((c) => c.caso)).toEqual([
      'firma-de-otro-secreto',
      'cuerpo-alterado',
      'fecha-vencida',
      'sin-firma',
    ]);
  });

  test('un receptor con otro secreto rechaza los avisos válidos: sale con 1', async () => {
    const { url } = await receptor(verifica);
    const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'prueba', '--json'], {
      env: { ENROLAMIENTO_WEBHOOK_SECRETO: 'otro' },
    });
    expect(corrida.salida).toBe(1);
    expect(JSON.parse(corrida.stdout).casos).toMatchObject([{ caso: 'prueba', status: 401, correcto: false }]);
  });

  test('cada aviso válido lleva las cabeceras y el cuerpo de la guía, y el SDK lo verifica', async () => {
    const { url, recibidos } = await receptor(() => 204);
    await correr(['webhooks', 'probar', '--url', url], conSecreto);
    const validos = CASOS.filter((c) => c.espera === 'aceptar');
    const entregas = recibidos.slice(0, validos.length);

    for (const { cuerpo, cabeceras } of entregas) {
      const evento = webhooks.verificar(cuerpo, cabeceras, { secreto: SECRETO });
      expect(cabeceras['x-enrolamiento-evento']).toBe(evento.evento);
      expect(cabeceras['x-enrolamiento-entrega']).toBe(evento.id);
      expect(cabeceras['content-type']).toBe('application/json; charset=utf-8');
      expect(cabeceras['x-enrolamiento-fecha']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
      // Sin espacios, con las claves en el orden de la guía.
      expect(Object.keys(JSON.parse(cuerpo)).slice(0, 3)).toEqual(['evento', 'id', 'fecha']);
      expect(cuerpo).toBe(JSON.stringify(JSON.parse(cuerpo)));
    }
    const fallido = entregas.map((e) => JSON.parse(e.cuerpo)).find((e) => e.respaldo?.estado === 'fallido');
    expect(Object.keys(fallido.respaldo)).toEqual(['estado', 'codigo', 'url', 'documentos', 'completo_hasta', 'bytes', 'catalogo', 'disponible_hasta']);
  });

  test('«repetida» envía dos veces el mismo cuerpo y el mismo id, con firma propia en cada intento', async () => {
    const { url, recibidos } = await receptor(verifica);
    // Con el reloj quieto: los dos intentos se fechan igual con un minuto de diferencia, como un reintento real.
    const ahora = Date.now();
    const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'repetida'], { ...conSecreto, ahora: () => ahora });

    expect(corrida.salida).toBe(0);
    expect(recibidos).toHaveLength(2);
    expect(recibidos[1]!.cuerpo).toBe(recibidos[0]!.cuerpo);
    expect(recibidos[1]!.cabeceras['x-enrolamiento-entrega']).toBe(recibidos[0]!.cabeceras['x-enrolamiento-entrega']);
    expect(recibidos[1]!.cabeceras['x-enrolamiento-firma']).not.toBe(recibidos[0]!.cabeceras['x-enrolamiento-firma']);
    const fechas = recibidos.map((r) => Date.parse(String(r.cabeceras['x-enrolamiento-fecha'])));
    expect(fechas[1]! - fechas[0]!).toBe(60_000);
    expect(corrida.stdout).toContain('la procesó una sola vez');
  });

  test('un 3xx, un 500 y una respuesta que no llega a tiempo son fallas de un aviso válido', async () => {
    const redirige = await receptor(() => 302);
    const cae = await receptor(() => 500);
    const lento = await receptor(() => new Promise((listo) => setTimeout(() => listo(204), 300)));
    const casos = async (url: string, entorno: Partial<Entorno> = {}) =>
      JSON.parse((await correr(['webhooks', 'probar', '--url', url, '--caso', 'prueba', '--json'], { ...conSecreto, ...entorno })).stdout).casos;

    expect(await casos(redirige.url)).toMatchObject([{ status: 302, correcto: false, detalle: expect.stringContaining('redirige') }]);
    expect(await casos(cae.url)).toMatchObject([{ status: 500, correcto: false }]);
    expect(await casos(lento.url, { esperaDelReceptorMs: 50 })).toMatchObject([{ status: null, correcto: false, detalle: expect.stringContaining('no respondió') }]);
  });

  test('rechazar con un 5xx cuenta como rechazo, con una nota', async () => {
    const { url } = await receptor(() => 500);
    const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'sin-firma', '--json'], conSecreto);
    expect(corrida.salida).toBe(0);
    expect(JSON.parse(corrida.stdout).casos).toMatchObject([{ correcto: true, detalle: expect.stringContaining('4xx') }]);
  });

  test('sin receptor escuchando sale con 1 y un solo mensaje', async () => {
    const { url } = await receptor(() => 204);
    await new Promise((listo) => servidores.splice(0)[0]!.close(listo));
    const corrida = await correr(['webhooks', 'probar', '--url', url], conSecreto);
    expect(corrida).toMatchObject({ salida: 1, stdout: '' });
    expect(corrida.stderr).toBe(`No se pudo conectar con ${url}/: ¿está corriendo su receptor en esa dirección?`);

    const enJson = await correr(['webhooks', 'probar', '--url', url, '--json'], conSecreto);
    expect(enJson.salida).toBe(1);
    expect(JSON.parse(enJson.stdout)).toEqual({ url: `${url}/`, conecto: false, correctos: 0, total: 0, casos: [] });
  });

  test('un receptor que corta la conexión ante un aviso inválido no pierde los demás resultados', async () => {
    const servidor = createServer((pedido, respuesta) => {
      const trozos: Buffer[] = [];
      pedido.on('data', (trozo: Buffer) => trozos.push(trozo));
      pedido.on('end', () => {
        if (verifica({ cuerpo: Buffer.concat(trozos).toString('utf8'), cabeceras: pedido.headers }) === 204) respuesta.writeHead(204).end();
        else pedido.socket.destroy();
      });
    });
    servidores.push(servidor);
    await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
    const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

    const corrida = await correr(['webhooks', 'probar', '--url', url, '--json'], conSecreto);
    const informe = JSON.parse(corrida.stdout) as { conecto: boolean; total: number; casos: ResultadoDeCaso[] };
    expect(corrida).toMatchObject({ salida: 0, stderr: '' });
    expect(informe).toMatchObject({ conecto: true, total: CASOS.length });
    const rechazados = informe.casos.filter((c) => c.espera === 'rechazar');
    expect(rechazados.map((c) => [c.status, c.correcto])).toEqual(rechazados.map(() => [null, true]));
    expect(rechazados[0]!.detalle).toContain('cortó la conexión');
    expect(Object.keys(informe.casos[0]!)).toEqual(['caso', 'descripcion', 'espera', 'status', 'ms', 'correcto', 'detalle']);
  });

  test('cortar la conexión ante un aviso válido, después del primero, es una falla de ese caso', async () => {
    let entregas = 0;
    const servidor = createServer((pedido, respuesta) => {
      pedido.resume();
      pedido.on('end', () => (++entregas === 2 ? pedido.socket.destroy() : respuesta.writeHead(204).end()));
    });
    servidores.push(servidor);
    await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
    const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

    const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'prueba', '--caso', 'respaldo-listo', '--caso', 'respaldo-vencido', '--json'], conSecreto);
    expect(corrida.salida).toBe(1);
    expect(JSON.parse(corrida.stdout).casos.map((c: ResultadoDeCaso) => [c.caso, c.status, c.correcto])).toEqual([
      ['prueba', 204, true],
      ['respaldo-listo', null, false],
      ['respaldo-vencido', 204, true],
    ]);
  });

  test('la dirección se muestra sin su query, que puede llevar un token del receptor', async () => {
    const { url } = await receptor(() => 204);
    for (const formato of [[], ['--json']]) {
      const corrida = await correr(['webhooks', 'probar', '--url', `${url}/hooks?token=token-privado#f`, '--caso', 'prueba', ...formato], conSecreto);
      expect(corrida.salida).toBe(0);
      expect(corrida.stdout).toContain(`${url}/hooks`);
      expect(corrida.stdout + corrida.stderr).not.toContain('token-privado');
    }
    await new Promise((listo) => servidores.splice(0)[0]!.close(listo));
    const sinReceptor = await correr(['webhooks', 'probar', '--url', `${url}/hooks?token=token-privado`], conSecreto);
    expect(sinReceptor.stderr).not.toContain('token-privado');
  });

  test('sin el secreto en el entorno sale con 2 y no envía nada', async () => {
    const { url, recibidos } = await receptor(() => 204);
    const corrida = await correr(['webhooks', 'probar', '--url', url]);
    expect(corrida.salida).toBe(2);
    expect(corrida.stderr).toContain('ENROLAMIENTO_WEBHOOK_SECRETO');
    expect(recibidos).toEqual([]);
  });

  test('el secreto no se acepta como opción, y su valor no sale en el mensaje', async () => {
    for (const argumentos of [['--secreto', 'valor-privado'], ['--secreto=valor-privado']]) {
      const corrida = await correr(['webhooks', 'probar', ...argumentos]);
      expect(corrida.salida).toBe(2);
      expect(corrida.stderr).toContain('ENROLAMIENTO_WEBHOOK_SECRETO');
      expect(corrida.stderr).not.toContain('valor-privado');
    }
  });

  test('una dirección que no es de esta máquina exige --permitir-remoto', async () => {
    const llamadas: string[] = [];
    const fetchFalso = ((url: URL) => {
      llamadas.push(url.href);
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as unknown as typeof fetch;
    const entorno = { ...conSecreto, fetch: fetchFalso };

    for (const url of [
      'https://receptor.example/webhooks',
      'http://10.0.0.5:3000',
      'http://127.0.0.1.example',
      'http://localhost.example',
      'http://app.localhost:3000',
      'http://0.0.0.0:3000',
      'http://[::ffff:127.0.0.1]:3000',
    ]) {
      const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'prueba'], entorno);
      expect({ url, salida: corrida.salida }).toEqual({ url, salida: 2 });
      expect(corrida.stderr).toContain('--permitir-remoto');
    }
    expect(llamadas).toEqual([]);

    const permitido = await correr(['webhooks', 'probar', '--url', 'https://receptor.example/webhooks', '--caso', 'prueba', '--permitir-remoto'], entorno);
    expect(permitido.salida).toBe(0);
    expect(llamadas).toEqual(['https://receptor.example/webhooks']);
  });

  test('localhost, 127.x y [::1], en cualquiera de sus formas, son de esta máquina', async () => {
    const fetchFalso = (() => Promise.resolve(new Response(null, { status: 204 }))) as unknown as typeof fetch;
    for (const url of ['http://localhost:3000', 'http://LOCALHOST:3000', 'http://127.0.0.2:3000', 'http://127.1:3000', 'http://[::1]:3000', 'http://[0:0:0:0:0:0:0:1]:3000']) {
      const corrida = await correr(['webhooks', 'probar', '--url', url, '--caso', 'prueba'], { ...conSecreto, fetch: fetchFalso });
      expect({ url, salida: corrida.salida }).toEqual({ url, salida: 0 });
    }
  });

  test('una --url que no es http(s), que no es una dirección o que lleva credenciales sale con 2', async () => {
    for (const url of ['ftp://127.0.0.1', '127.0.0.1:3000/x y', 'no es una url', 'http://usuario:clave-privada@127.0.0.1:3000']) {
      const corrida = await correr(['webhooks', 'probar', '--url', url], conSecreto);
      expect({ url, salida: corrida.salida }).toEqual({ url, salida: 2 });
      expect(corrida.stderr).not.toContain('clave-privada');
    }
  });

  test('--listar muestra los casos sin enviar nada ni pedir el secreto; --caso desconocido sale con 2', async () => {
    const lista = await correr(['webhooks', 'probar', '--listar', '--json']);
    expect(lista.salida).toBe(0);
    expect(JSON.parse(lista.stdout).map((c: { caso: string }) => c.caso)).toEqual(CASOS.map((c) => c.nombre));

    const desconocido = await correr(['webhooks', 'probar', '--caso', 'no-existe'], conSecreto);
    expect(desconocido.salida).toBe(2);
    expect(desconocido.stderr).toContain('--listar');
    expect(desconocido.stderr).not.toContain('no-existe');
  });

  test('la salida para personas agrupa por lo esperado y cuenta los casos', async () => {
    const { url } = await receptor(() => 200);
    const corrida = await correr(['webhooks', 'probar', '--url', url], conSecreto);
    expect(corrida.stdout).toContain('Avisos que debe aceptar (2xx):');
    expect(corrida.stdout).toContain('Avisos que debe rechazar:');
    expect(corrida.stdout).toMatch(/FALLA {2}sin-firma\s+200/);
    expect(corrida.stdout).toContain(`${CASOS.length - 4} de ${CASOS.length} casos respondieron como se esperaba.`);
    expect(corrida.stdout).not.toContain(SECRETO);
  });

  test('fechaDeAviso escribe la hora con el desfase -03:00, sin fracción', () => {
    expect(fechaDeAviso(Date.parse('2026-11-14T18:04:05.678Z'))).toBe('2026-11-14T15:04:05-03:00');
    expect(Date.parse(fechaDeAviso(1_800_000_000_000))).toBe(1_800_000_000_000);
  });
});

describe('doctor', () => {
  const CREDENCIALES = { ENROLAMIENTO_USUARIO: 'usuario-privado', ENROLAMIENTO_APIKEY: 'apikey-privada' };
  const AHORA = Date.parse('2026-11-23T12:00:00Z');

  /** Un `fetch` que responde lo mismo siempre y anota a dónde lo llamaron. */
  function api(status: number, cuerpo: string, cabeceras: Record<string, string> = {}) {
    const llamadas: { url: string; metodo: string | undefined }[] = [];
    const fetchFalso = ((url: string | URL, init?: RequestInit) => {
      llamadas.push({ url: String(url), metodo: init?.method });
      return Promise.resolve(new Response(cuerpo, { status, headers: { Date: new Date(AHORA).toUTCString(), ...cabeceras } }));
    }) as typeof fetch;
    return { fetch: fetchFalso, llamadas };
  }

  async function comprobar(entorno: Partial<Entorno>): Promise<{ salida: number; texto: string; por: Record<string, Comprobacion> }> {
    const corrida = await correr(['doctor', '--json'], { ahora: () => AHORA, versionDeNode: '22.12.0', ...entorno });
    const informe = JSON.parse(corrida.stdout) as { comprobaciones: Comprobacion[] };
    return { salida: corrida.salida, texto: corrida.stdout + corrida.stderr, por: Object.fromEntries(informe.comprobaciones.map((c) => [c.nombre, c])) };
  }

  test('con todo en orden sale con 0 y hace una sola lectura, sin RUT ni ambiente', async () => {
    const { fetch, llamadas } = api(200, '{}');
    const { salida, por, texto } = await comprobar({ env: { ...CREDENCIALES, ENROLAMIENTO_WEBHOOK_SECRETO: 'a'.repeat(64) }, fetch });

    expect(salida).toBe(0);
    expect(Object.values(por).map((c) => [c.nombre, c.estado])).toEqual([
      ['node', 'ok'],
      ['credenciales', 'ok'],
      ['api', 'ok'],
      ['reloj', 'ok'],
      ['secreto-de-webhooks', 'ok'],
    ]);
    expect(llamadas).toEqual([{ url: 'https://api.enrolamiento.cl/v1/certificaciones/stats', metodo: 'GET' }]);
    expect(texto).not.toMatch(/usuario-privado|apikey-privada|a{64}/);
  });

  test('sin credenciales falla y no llama a la API', async () => {
    const { fetch, llamadas } = api(200, '{}');
    const { salida, por } = await comprobar({ env: { ENROLAMIENTO_USUARIO: 'u' }, fetch });
    expect(salida).toBe(1);
    expect(por['credenciales']).toMatchObject({ estado: 'falla', detalle: 'falta ENROLAMIENTO_APIKEY en el entorno' });
    expect(por['api']!.estado).toBe('omitida');
    expect(por['reloj']!.estado).toBe('omitida');
    expect(llamadas).toEqual([]);
  });

  test('un 401 es una falla que dice dónde están las credenciales, sin mostrarlas', async () => {
    const { salida, por, texto } = await comprobar({ env: CREDENCIALES, fetch: api(401, '{"Message":"Authorization has been denied for this request."}').fetch });
    expect(salida).toBe(1);
    expect(por['api']).toMatchObject({ estado: 'falla', detalle: expect.stringContaining('Mi Cuenta') });
    // El reloj se compara igual: el 401 también trae `Date`.
    expect(por['reloj']!.estado).toBe('ok');
    expect(texto).not.toMatch(/usuario-privado|apikey-privada/);
  });

  test('el límite de pedidos es un aviso, y otro error de la API una falla con su enlace de ayuda', async () => {
    const limite = await comprobar({ env: CREDENCIALES, fetch: api(409, 'Se excedió').fetch });
    expect(limite.salida).toBe(0);
    expect(limite.por['api']!.estado).toBe('aviso');

    const negocio = await comprobar({ env: CREDENCIALES, fetch: api(500, 'ERROR_GENERAL:algo', { 'X-Codigo-Error': 'ERROR_GENERAL' }).fetch });
    expect(negocio.salida).toBe(1);
    expect(negocio.por['api']!.detalle).toContain('https://developers.enrolamiento.cl/docs/errores-y-reintentos/#error-ERROR_GENERAL');
  });

  test('sin red es una falla y el reloj queda sin comprobar', async () => {
    const { salida, por } = await comprobar({ env: CREDENCIALES, fetch: () => Promise.reject(new TypeError('fetch failed')) });
    expect(salida).toBe(1);
    expect(por['api']).toMatchObject({ estado: 'falla', detalle: expect.stringContaining('no se pudo conectar') });
    expect(por['reloj']!.estado).toBe('omitida');
  });

  test('el reloj: hasta 60 s bien, hasta 300 s aviso, más es una falla', async () => {
    const con = async (desfaseMs: number) => (await comprobar({ env: CREDENCIALES, fetch: api(200, '{}').fetch, ahora: () => AHORA + desfaseMs })).por['reloj']!;
    expect(await con(-45_000)).toMatchObject({ estado: 'ok' });
    expect(await con(120_000)).toMatchObject({ estado: 'aviso', detalle: expect.stringContaining('120 s') });
    expect(await con(-400_000)).toMatchObject({ estado: 'falla', detalle: expect.stringContaining('400 s') });
    expect((await comprobar({ env: CREDENCIALES, fetch: api(200, '{}', { Date: 'ayer' }).fetch })).por['reloj']!.estado).toBe('omitida');
  });

  test('un reloj fuera de la tolerancia hace salir con 1', async () => {
    expect((await comprobar({ env: CREDENCIALES, fetch: api(200, '{}').fetch, ahora: () => AHORA + 900_000 })).salida).toBe(1);
  });

  test('Node anterior a 22.12 es una falla', async () => {
    const con = async (versionDeNode: string) => (await comprobar({ env: CREDENCIALES, fetch: api(200, '{}').fetch, versionDeNode })).por['node']!.estado;
    expect(await con('22.11.0')).toBe('falla');
    expect(await con('20.19.0')).toBe('falla');
    expect(await con('22.12.0')).toBe('ok');
    expect(await con('24.1.0')).toBe('ok');
  });

  test('el secreto de los webhooks: ausente se omite, con otra forma avisa, con espacios falla; nunca se imprime', async () => {
    const con = async (secreto?: string) =>
      comprobar({ env: { ...CREDENCIALES, ENROLAMIENTO_WEBHOOK_SECRETO: secreto }, fetch: api(200, '{}').fetch });
    expect((await con()).por['secreto-de-webhooks']!.estado).toBe('omitida');
    const corto = await con('secreto-privado-corto');
    expect(corto.por['secreto-de-webhooks']!.estado).toBe('aviso');
    expect(corto.salida).toBe(0);
    expect(corto.texto).not.toContain('secreto-privado-corto');
    const conSalto = await con(`${'b'.repeat(64)}\n`);
    expect(conSalto.por['secreto-de-webhooks']!.estado).toBe('falla');
    expect(conSalto.salida).toBe(1);
  });

  test('la salida para personas lista cada comprobación y cierra con el resumen', async () => {
    const bien = await correr(['doctor'], { env: CREDENCIALES, fetch: api(200, '{}').fetch, ahora: () => AHORA, versionDeNode: '22.12.0' });
    expect(bien.salida).toBe(0);
    expect(bien.stdout).toContain(`SDK ${VERSION}, contrato ${VERSION_DEL_CONTRATO}`);
    expect(bien.stdout).toMatch(/ok\s+api\s+la API aceptó las credenciales/);
    expect(bien.stdout).toContain('Todo en orden.');

    const mal = await correr(['doctor'], { env: {}, versionDeNode: '22.12.0' });
    expect(mal.salida).toBe(1);
    expect(mal.stdout).toContain('1 comprobación falló.');
  });
});
