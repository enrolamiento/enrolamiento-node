import { Buffer } from 'node:buffer';
import { EnrolamientoError, ErrorDeApi, ErrorDeConexion, ErrorDeConfiguracion, errorDeRespuesta } from './errors.js';
import { decidirReintento } from './retry.js';
import { VERSION } from './version.js';

/**
 * Lo que el SDK necesita saber de una operación del contrato para armar su pedido. Sale de `npm run generate`.
 * Es interno: el punto de entrada del paquete no lo exporta.
 */
export interface Operacion {
  /** `operationId` del contrato. */
  id: string;
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Plantilla de la ruta, p. ej. `'/v1/caf/{rut}/descargar/{tipoDocumento}/{cantidad}'`. */
  ruta: string;
  enRuta: readonly string[];
  enQuery: readonly string[];
  /** Parámetros que van como cabecera HTTP: nombre en el SDK → cabecera, p. ej. `{ consultarSii: 'X-Consultar-Sii' }`. */
  enCabecera: Readonly<Record<string, string>>;
  /** Las propiedades del cuerpo JSON según su esquema, ordenadas; `[]` si la operación no lleva cuerpo. */
  enCuerpo: readonly string[];
  /**
   * `'plano'`: las propiedades de `enCuerpo` van al cuerpo JSON. `'ninguno'`: la operación no lleva cuerpo.
   * Toda otra clave de los parámetros que no sea de ruta, de query, de cabecera ni `ambiente` se rechaza.
   */
  cuerpo: 'ninguno' | 'plano';
  /** `true` solo si el contrato marca la operación con `x-idempotente: true`. */
  idempotente: boolean;
  /** Dónde recibe la operación el `ambiente`: en ninguna parte, en la query o como último segmento de la ruta. */
  ambiente: 'no' | 'query' | 'ruta';
  /**
   * Si es `true`, el SDK no envía el pedido sin `ambiente`: la API correría en producción. El generador lo pone en
   * toda operación que recibe `ambiente`.
   */
  ambienteObligatorio: boolean;
  /** Parámetros de query que van siempre, p. ej. `{ formato: 'json' }` en `respaldos.descargar`. */
  queryFija: Readonly<Record<string, string>>;
  /** Códigos de error según `x-reintentable` del contrato. */
  reintentable: { automatico: readonly string[]; manual: readonly string[]; nunca: readonly string[] };
}

/** Opciones del cliente. Valen para todos sus pedidos. */
export interface OpcionesDeCliente {
  /** Usuario de la API. Por omisión, `ENROLAMIENTO_USUARIO`. */
  usuario?: string;
  /** APIKey. Por omisión, `ENROLAMIENTO_APIKEY`. */
  apikey?: string;
  /** Ambiente del SII para las operaciones que lo reciben: 0 = homologación, 1 = producción. El de la llamada gana. */
  ambiente?: 0 | 1;
  /** Por omisión, `'https://api.enrolamiento.cl'`. */
  urlBase?: string;
  /** Tiempo de espera de cada intento, en milisegundos. Por omisión, 65000. */
  timeoutMs?: number;
  /** Reintentos automáticos como máximo: un entero de 0 a 10. Por omisión, 2. */
  maxReintentos?: number;
  /**
   * Espera más larga que el SDK acepta antes de un reintento, en milisegundos (de 0 a 2147483647). Un error que
   * pide esperar más no se reintenta: se lanza. Por omisión, 30000.
   */
  esperaMaximaMs?: number;
  /** `fetch` a usar. Por omisión, el global. */
  fetch?: typeof fetch;
  /** Cabeceras que se suman a cada pedido. */
  cabeceras?: Record<string, string>;
}

/** Opciones de un pedido. Ganan a las del cliente. */
export interface OpcionesDePedido {
  timeoutMs?: number;
  /** Reintentos automáticos como máximo para esta llamada: un entero de 0 a 10. Gana al del cliente. */
  maxReintentos?: number;
  /** Cancela el pedido. Cancelarlo no es un tiempo agotado: lanza `ErrorDeConexion` con `tiempoAgotado: false`. */
  signal?: AbortSignal;
  cabeceras?: Record<string, string>;
}

/** Resultado completo de un pedido: los datos y la `Response`, cuyo cuerpo ya fue leído. */
export interface DatosYRespuesta<T> {
  datos: T;
  respuesta: Response;
}

/** La promesa que devuelve cada método: se resuelve con el JSON de la respuesta. */
export class PromesaDeApi<T> extends Promise<T> {
  // `then`, `catch` y `finally` derivan promesas comunes, no otra PromesaDeApi.
  static override get [Symbol.species](): PromiseConstructor {
    return Promise;
  }

  readonly #conRespuesta: Promise<DatosYRespuesta<T>>;
  #datos: Promise<T> | undefined;

  constructor(conRespuesta: Promise<DatosYRespuesta<T>>) {
    // La promesa base no se usa: `then` lee de `conRespuesta`. Se resuelve para no dejar rechazos sin atender.
    super((resolver) => resolver(undefined as T));
    this.#conRespuesta = conRespuesta;
  }

  /** Los datos y también la `Response` (status y cabeceras). */
  conRespuesta(): Promise<DatosYRespuesta<T>> {
    return this.#conRespuesta;
  }

  override then<R1 = T, R2 = never>(
    alResolver?: ((datos: T) => R1 | PromiseLike<R1>) | null,
    alRechazar?: ((motivo: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    this.#datos ??= this.#conRespuesta.then((r) => r.datos);
    return this.#datos.then(alResolver, alRechazar);
  }
}

const URL_BASE = 'https://api.enrolamiento.cl';
const TIMEOUT_MS = 65000;
/** El mayor plazo que acepta `setTimeout`; uno mayor dispara de inmediato y Node avisa por consola. */
const TIMEOUT_MAXIMO_MS = 2147483647;
const MAX_REINTENTOS = 2;
const MAX_REINTENTOS_TOPE = 10;
const ESPERA_MAXIMA_MS = 30000;
/** Un token de RFC 9110: lo que `Headers` acepta como nombre de cabecera. */
const NOMBRE_DE_CABECERA = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/** Lo que no va en el valor de una cabecera: controles (CR, LF, NUL…), DEL y lo que está sobre U+00FF. */
const FUERA_DE_CABECERA = /[^\t\x20-\x7e\x80-\xff]/;
/** Los hosts a los que `urlBase` puede llegar por `http:`: solo la máquina local. */
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Envía una operación con sus parámetros. Es lo que `recursos()` recibe para armar los métodos del cliente. */
export type Pedir = <T>(
  op: Operacion,
  params: Record<string, unknown>,
  opciones?: OpcionesDePedido | null,
) => PromesaDeApi<T>;

/**
 * El envío de pedidos de un cliente, como una función: el cliente la pasa a `recursos()` y no la expone. Las
 * opciones `null` valen como ausentes.
 */
export function crearPedir(opciones?: OpcionesDeCliente | null): Pedir {
  const nucleo = new Nucleo(opciones ?? {});
  return (op, params, opcionesDePedido) => nucleo.pedir(op, params, opcionesDePedido ?? {});
}

/** Un pedido listo para enviar. Se arma una vez y sirve para cada intento. */
interface PedidoArmado {
  url: string;
  metodo: Operacion['metodo'];
  cabeceras: Headers;
  cuerpo: string | undefined;
  /** Tiempo de espera de cada intento, ya validado. */
  timeoutMs: number;
  /** Reintentos como máximo, ya validados. */
  maxReintentos: number;
  /** Espera más larga aceptada antes de un reintento, ya validada. */
  esperaMaximaMs: number;
}

/** Arma y envía los pedidos a la API. Interno: el cliente lo usa a través de `crearPedir`. */
class Nucleo {
  readonly #opciones: OpcionesDeCliente;
  #autorizacion: string | undefined;

  constructor(opciones: OpcionesDeCliente) {
    this.#opciones = { ...opciones };
  }

  /** Envía la operación `op` con `params` (ruta, query, cabeceras y cuerpo en un solo objeto). */
  pedir<T>(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido): PromesaDeApi<T> {
    return new PromesaDeApi<T>(this.#ejecutar<T>(op, params, opciones));
  }

  async #ejecutar<T>(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido): Promise<DatosYRespuesta<T>> {
    let pedido: PedidoArmado;
    try {
      pedido = this.#armar(op, params, opciones);
    } catch (error) {
      if (error instanceof EnrolamientoError) throw error;
      // Lo que falla antes de la red sin ser del SDK (un valor que no se deja convertir, p. ej.) no se copia: el
      // error original puede traer el valor, que puede ser un secreto.
      throw new ErrorDeConfiguracion(`${op.id}: no se pudo armar el pedido con los parámetros y las opciones recibidos.`);
    }
    const signal = opciones.signal ?? undefined;
    for (let intento = 1; ; intento++) {
      try {
        return await this.#intentar<T>(op, pedido, opciones);
      } catch (error) {
        // Lo que canceló el llamador no se repite, aunque la operación sea idempotente.
        if (signal?.aborted) throw error;
        if (!(error instanceof ErrorDeApi || error instanceof ErrorDeConexion)) throw error;
        const { maxReintentos, esperaMaximaMs } = pedido;
        const { reintentar, esperaMs } = decidirReintento(op, error, intento, { maxReintentos, esperaMaximaMs });
        if (!reintentar) throw error;
        await esperar(op, esperaMs, signal);
      }
    }
  }

  /** Valida los parámetros y arma URL, cabeceras y cuerpo. Lanza `ErrorDeConfiguracion` sin tocar la red. */
  #armar(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido): PedidoArmado {
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      throw new ErrorDeConfiguracion(`${op.id}: los parámetros van en un objeto; se recibió ${describir(params)}.`);
    }
    rechazarDesconocidos(op, params);
    const autorizacion = this.#resolverAutorizacion();
    const ambiente = op.ambiente === 'no' ? undefined : resolverAmbiente(op, params, this.#opciones.ambiente);

    let ruta = op.ruta;
    if (op.ambiente === 'ruta') {
      // resolverAmbiente ya exige el ambiente; sin él la ruta perdería un segmento y la API correría en producción.
      if (ambiente === undefined) throw new ErrorDeConfiguracion(mensajeSinAmbiente(op));
      ruta = ruta.replace('{ambiente}', String(ambiente));
    }
    for (const nombre of op.enRuta) {
      if (nombre === 'ambiente' && op.ambiente === 'ruta') continue;
      const valor = params[nombre];
      if (valor === undefined || valor === null || valor === '') {
        throw new ErrorDeConfiguracion(`${op.id}: falta el parámetro de ruta \`${nombre}\`.`);
      }
      const texto = comoTexto(op, nombre, valor);
      // encodeURIComponent deja los puntos y el parser de URL resuelve `.` y `..`: cambiarían el endpoint.
      if (texto === '.' || texto === '..') {
        throw new ErrorDeConfiguracion(`${op.id}: el parámetro de ruta \`${nombre}\` no puede ser "." ni "..".`);
      }
      const codificado = encodeURIComponent(texto);
      ruta = ruta.replace(`{${nombre}}`, () => codificado);
    }

    const query = new URLSearchParams();
    for (const nombre of op.enQuery) {
      if (nombre === 'ambiente' && op.ambiente === 'query') continue;
      const valor = params[nombre];
      if (valor === undefined || valor === null) continue;
      query.append(nombre, comoTexto(op, nombre, valor));
    }
    if (op.ambiente === 'query' && ambiente !== undefined) query.append('ambiente', String(ambiente));
    for (const [nombre, valor] of Object.entries(op.queryFija)) query.set(nombre, valor);

    let cuerpo: string | undefined;
    if (op.cuerpo === 'plano') {
      const delCuerpo = new Set(op.enCuerpo);
      const propiedades = Object.keys(params).filter((nombre) => delCuerpo.has(nombre));
      cuerpo = JSON.stringify(Object.fromEntries(propiedades.map((nombre) => [nombre, params[nombre]])));
    }

    const cabeceras = new Headers({ Accept: 'application/json', 'User-Agent': `enrolamiento-node/${VERSION}` });
    for (const extra of [this.#opciones.cabeceras, opciones.cabeceras]) {
      if (extra === undefined || extra === null) continue;
      if (typeof extra !== 'object' || Array.isArray(extra)) {
        throw new ErrorDeConfiguracion(`${op.id}: \`cabeceras\` va en un objeto de nombre → valor; se recibió ${describir(extra)}.`);
      }
      for (const [nombre, valor] of Object.entries(extra)) {
        if (valor === undefined) continue;
        if (!NOMBRE_DE_CABECERA.test(nombre)) {
          throw new ErrorDeConfiguracion(`${op.id}: una de las \`cabeceras\` tiene un nombre que no es válido en HTTP.`);
        }
        comprobarValorDeCabecera(op, `la cabecera \`${nombre}\``, valor);
        cabeceras.set(nombre, valor);
      }
    }
    for (const [nombre, cabecera] of Object.entries(op.enCabecera)) {
      const valor = params[nombre];
      if (valor === undefined) continue;
      comprobarValorDeCabecera(op, `\`${nombre}\` (va en una cabecera)`, valor);
      cabeceras.set(cabecera, valor);
    }
    if (cuerpo !== undefined) cabeceras.set('Content-Type', 'application/json');
    cabeceras.set('Authorization', autorizacion);

    const urlBase = resolverUrlBase(op, this.#opciones.urlBase);
    const textoQuery = query.toString();
    const url = `${urlBase}${ruta}${textoQuery === '' ? '' : `?${textoQuery}`}`;
    const { fetch } = this.#opciones;
    if (fetch !== undefined && fetch !== null && typeof fetch !== 'function') {
      throw new ErrorDeConfiguracion(`${op.id}: \`fetch\` debe ser una función; se recibió ${describir(fetch)}.`);
    }
    const { signal } = opciones;
    if (signal !== undefined && signal !== null && !(signal instanceof AbortSignal)) {
      throw new ErrorDeConfiguracion(`${op.id}: \`signal\` debe ser un AbortSignal; se recibió ${describir(signal)}.`);
    }
    const timeoutMs = resolverTimeout(op, opciones.timeoutMs, this.#opciones.timeoutMs);
    const maxReintentos = resolverMaxReintentos(op, opciones.maxReintentos, this.#opciones.maxReintentos);
    const esperaMaximaMs = resolverEsperaMaxima(op, this.#opciones.esperaMaximaMs);
    return { url, metodo: op.metodo, cabeceras, cuerpo, timeoutMs, maxReintentos, esperaMaximaMs };
  }

  /** La cabecera `Authorization`. Se resuelve en el primer pedido para que el paquete se importe sin entorno. */
  #resolverAutorizacion(): string {
    if (this.#autorizacion !== undefined) return this.#autorizacion;
    const usuario = this.#opciones.usuario ?? process.env['ENROLAMIENTO_USUARIO'];
    const apikey = this.#opciones.apikey ?? process.env['ENROLAMIENTO_APIKEY'];
    if (!usuario || !apikey) {
      throw new ErrorDeConfiguracion(
        'Faltan las credenciales de la API: páselas como `usuario` y `apikey` al crear el cliente, ' +
          'o defina ENROLAMIENTO_USUARIO y ENROLAMIENTO_APIKEY en el entorno.',
      );
    }
    this.#autorizacion = `Basic ${Buffer.from(`${usuario}:${apikey}`, 'utf8').toString('base64')}`;
    return this.#autorizacion;
  }

  /** Un intento: envía el pedido y lee la respuesta. El tiempo de espera cubre también la lectura del cuerpo. */
  async #intentar<T>(op: Operacion, pedido: PedidoArmado, opciones: OpcionesDePedido): Promise<DatosYRespuesta<T>> {
    const { timeoutMs } = pedido;
    const controlador = new AbortController();
    let vencido = false;
    const temporizador = setTimeout(() => {
      vencido = true;
      controlador.abort();
    }, timeoutMs);
    const signal = opciones.signal ? AbortSignal.any([controlador.signal, opciones.signal]) : controlador.signal;
    const enviar = this.#opciones.fetch ?? globalThis.fetch;

    try {
      let respuesta: Response;
      let texto: string;
      try {
        respuesta = await enviar(pedido.url, {
          method: pedido.metodo,
          headers: pedido.cabeceras,
          body: pedido.cuerpo,
          signal,
        });
        texto = await respuesta.text();
      } catch (causa) {
        throw new ErrorDeConexion(op.id, { tiempoAgotado: vencido, causa });
      }
      if (!respuesta.ok) throw errorDeRespuesta(op.id, respuesta.status, respuesta.headers, texto);
      return { datos: leerDatos(texto) as T, respuesta };
    } finally {
      clearTimeout(temporizador);
    }
  }
}

/**
 * Rechaza toda clave de `params` que la operación no recibe: una errata (`Ambiente`, `ambiete`) no puede ir al
 * cuerpo ni perderse, porque sin `ambiente` la API opera en producción. Las claves con valor `undefined` se ignoran.
 */
function rechazarDesconocidos(op: Operacion, params: Record<string, unknown>): void {
  const conocidas = new Set([...op.enRuta, ...op.enQuery, ...Object.keys(op.enCabecera)]);
  if (op.cuerpo === 'plano') for (const nombre of op.enCuerpo) conocidas.add(nombre);
  if (op.ambiente === 'no') conocidas.delete('ambiente');
  else conocidas.add('ambiente');
  const desconocidas = Object.keys(params).filter((nombre) => !conocidas.has(nombre) && params[nombre] !== undefined);
  if (desconocidas.length === 0) return;
  const lista = desconocidas
    .map((nombre) => {
      const parecida = parecidaA(nombre, conocidas);
      const texto = `\`${nombreParaMensaje(nombre)}\``;
      return parecida === undefined ? texto : `${texto} (¿quiso decir \`${parecida}\`?)`;
    })
    .join(', ');
  throw new ErrorDeConfiguracion(
    `${op.id}: la operación no recibe ${lista}. No se envió nada: los nombres distinguen mayúsculas y minúsculas.`,
  );
}

/** La clave conocida que difiere de `nombre` solo en mayúsculas o en un carácter (de más, de menos o cambiado). */
function parecidaA(nombre: string, conocidas: ReadonlySet<string>): string | undefined {
  const ordenadas = [...conocidas].sort();
  return (
    ordenadas.find((conocida) => conocida.toLowerCase() === nombre.toLowerCase()) ??
    ordenadas.find((conocida) => aUnaEdicion(conocida, nombre))
  );
}

/** `true` si `a` y `b` difieren en exactamente un carácter insertado, borrado o cambiado. */
function aUnaEdicion(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Una clave de los parámetros para un mensaje: sin caracteres de control y a lo más 40 caracteres. */
function nombreParaMensaje(nombre: string): string {
  const limpio = nombre.replace(/[\x00-\x1f\x7f]/g, '');
  return limpio.length > 40 ? `${limpio.slice(0, 40)}…` : limpio;
}

/** Un parámetro de ruta o de query como texto. Un valor que no se deja convertir no se copia al mensaje. */
function comoTexto(op: Operacion, nombre: string, valor: unknown): string {
  try {
    return String(valor);
  } catch {
    throw new ErrorDeConfiguracion(`${op.id}: el parámetro \`${nombre}\` no se puede convertir en texto; se recibió ${describir(valor)}.`);
  }
}

/** Un valor de cabecera tiene que ser un texto sin controles, sin DEL y sin caracteres sobre U+00FF. */
function comprobarValorDeCabecera(op: Operacion, que: string, valor: unknown): asserts valor is string {
  if (typeof valor !== 'string') {
    throw new ErrorDeConfiguracion(`${op.id}: ${que} debe ser un texto; se recibió ${describir(valor)}.`);
  }
  if (FUERA_DE_CABECERA.test(valor)) {
    throw new ErrorDeConfiguracion(
      `${op.id}: ${que} tiene caracteres que no van en una cabecera HTTP ` +
        '(saltos de línea, caracteres de control o fuera de Latin-1).',
    );
  }
}

/**
 * La URL base, sin `/` final. Solo `https:`, o `http:` hacia la máquina local: la cabecera Basic viajaría en claro.
 * No puede traer credenciales, query ni fragmento. El mensaje no copia la URL: podría traer credenciales.
 */
function resolverUrlBase(op: Operacion, valor: unknown): string {
  const texto = valor === undefined || valor === null ? URL_BASE : valor;
  if (typeof texto !== 'string') {
    throw new ErrorDeConfiguracion(`${op.id}: \`urlBase\` debe ser un texto; se recibió ${describir(texto)}.`);
  }
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new ErrorDeConfiguracion(`${op.id}: \`urlBase\` no es una URL absoluta válida.`);
  }
  if (url.username !== '' || url.password !== '' || /^[^:/?#]+:\/\/[^/?#]*@/.test(texto.trim()) || /[?#]/.test(texto)) {
    throw new ErrorDeConfiguracion(`${op.id}: \`urlBase\` no puede llevar credenciales, query ni fragmento.`);
  }
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && HOSTS_LOCALES.has(url.hostname)))) {
    throw new ErrorDeConfiguracion(
      `${op.id}: \`urlBase\` debe usar https (http solo hacia localhost, 127.0.0.1 o [::1]): ` +
        'las credenciales viajarían en claro.',
    );
  }
  return url.href.replace(/\/+$/, '');
}

/** El mensaje cuando falta `ambiente`: dónde definirlo. */
function mensajeSinAmbiente(op: Operacion): string {
  return (
    `${op.id}: falta \`ambiente\`. Sin él la API opera en producción. Defínalo al crear el cliente ` +
    '(`new Enrolamiento({ ambiente: 0 })`; 0 = homologación, 1 = producción) o páselo en la llamada.'
  );
}

/** El `ambiente` del pedido: el de la llamada o, si falta, el del cliente. Solo 0, 1 o ninguno. */
function resolverAmbiente(op: Operacion, params: Record<string, unknown>, delCliente: unknown): 0 | 1 | undefined {
  const valor = params['ambiente'] !== undefined ? params['ambiente'] : delCliente;
  if (valor === undefined) {
    if (op.ambienteObligatorio) throw new ErrorDeConfiguracion(mensajeSinAmbiente(op));
    return undefined;
  }
  if (valor !== 0 && valor !== 1) {
    throw new ErrorDeConfiguracion(
      `${op.id}: \`ambiente\` debe ser 0 (homologación) o 1 (producción); se recibió ${describir(valor)}.`,
    );
  }
  return valor;
}

/** El tiempo de espera de cada intento: el de la llamada, el del cliente o 65000. Un número finito de 1 a 2147483647. */
function resolverTimeout(op: Operacion, delPedido: unknown, delCliente: unknown): number {
  const valor = delPedido !== undefined ? delPedido : delCliente !== undefined ? delCliente : TIMEOUT_MS;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 1 || valor > TIMEOUT_MAXIMO_MS) {
    throw new ErrorDeConfiguracion(
      `${op.id}: \`timeoutMs\` debe ser un número de 1 a ${TIMEOUT_MAXIMO_MS}; se recibió ${describir(valor)}.`,
    );
  }
  return valor;
}

/** Los reintentos como máximo: los de la llamada, los del cliente o 2. Un entero de 0 a 10. */
function resolverMaxReintentos(op: Operacion, delPedido: unknown, delCliente: unknown): number {
  const valor = delPedido !== undefined ? delPedido : delCliente !== undefined ? delCliente : MAX_REINTENTOS;
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0 || valor > MAX_REINTENTOS_TOPE) {
    throw new ErrorDeConfiguracion(
      `${op.id}: \`maxReintentos\` debe ser un entero de 0 a ${MAX_REINTENTOS_TOPE}; se recibió ${describir(valor)}.`,
    );
  }
  return valor;
}

/** La espera más larga antes de un reintento: la del cliente o 30000. Un número finito de 0 a 2147483647. */
function resolverEsperaMaxima(op: Operacion, delCliente: unknown): number {
  const valor = delCliente !== undefined ? delCliente : ESPERA_MAXIMA_MS;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > TIMEOUT_MAXIMO_MS) {
    throw new ErrorDeConfiguracion(
      `${op.id}: \`esperaMaximaMs\` debe ser un número de 0 a ${TIMEOUT_MAXIMO_MS}; se recibió ${describir(valor)}.`,
    );
  }
  return valor;
}

/**
 * Espera `esperaMs` antes de un reintento. Si `signal` aborta durante la espera, rechaza en el acto con
 * `ErrorDeConexion` (`tiempoAgotado: false`) y no hay otro intento.
 */
function esperar(op: Operacion, esperaMs: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const cancelado = () => {
      clearTimeout(temporizador);
      rechazar(new ErrorDeConexion(op.id, { tiempoAgotado: false, causa: signal?.reason }));
    };
    const temporizador = setTimeout(() => {
      signal?.removeEventListener('abort', cancelado);
      resolver();
    }, esperaMs);
    signal?.addEventListener('abort', cancelado, { once: true });
  });
}

/**
 * Describe un valor recibido para un mensaje de error sin copiarlo: un valor fuera de lugar puede ser un secreto.
 * Da el tipo; de un número, también el valor; de un texto, solo su largo. Nunca lanza.
 */
function describir(valor: unknown): string {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'un arreglo';
  if (typeof valor === 'number') return `number ${String(valor)}`;
  if (typeof valor === 'string') return `string de ${valor.length} caracteres`;
  return typeof valor;
}

/** El cuerpo de una respuesta 2xx: JSON si lo es, el texto si no, `undefined` si viene vacío. */
function leerDatos(texto: string): unknown {
  if (texto === '') return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}
