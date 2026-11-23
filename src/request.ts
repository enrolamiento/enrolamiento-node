import { Buffer } from 'node:buffer';
import { ErrorDeConexion, ErrorDeConfiguracion, errorDeRespuesta } from './errors.js';
import { VERSION } from './version.js';

/** Lo que el SDK necesita saber de una operación del contrato para armar su pedido. Sale de `npm run generate`. */
export interface Operacion {
  /** `operationId` del contrato. */
  id: string;
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Plantilla de la ruta, p. ej. `'/v1/caf/{rut}/descargar/{tipoDocumento}/{cantidad}'`. */
  ruta: string;
  enRuta: readonly string[];
  enQuery: readonly string[];
  /** `'plano'`: lo que no es de ruta ni de query va al cuerpo JSON. `'ninguno'`: la operación no lleva cuerpo. */
  cuerpo: 'ninguno' | 'plano';
  /** `true` solo si el contrato marca la operación con `x-idempotente: true`. */
  idempotente: boolean;
  /** Dónde recibe la operación el `ambiente`: en ninguna parte, en la query o como último segmento de la ruta. */
  ambiente: 'no' | 'query' | 'ruta';
  /** Si es `true`, el SDK no envía el pedido sin `ambiente`: la API correría en producción. */
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
  /** Reintentos automáticos como máximo. Por omisión, 2. */
  maxReintentos?: number;
  /** Espera más larga que el SDK acepta antes de un reintento, en milisegundos. Por omisión, 30000. */
  esperaMaximaMs?: number;
  /** `fetch` a usar. Por omisión, el global. */
  fetch?: typeof fetch;
  /** Cabeceras que se suman a cada pedido. */
  cabeceras?: Record<string, string>;
}

/** Opciones de un pedido. Ganan a las del cliente. */
export interface OpcionesDePedido {
  timeoutMs?: number;
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

/** Un pedido listo para enviar. Se arma una vez y sirve para cada intento. */
interface PedidoArmado {
  url: string;
  metodo: Operacion['metodo'];
  cabeceras: Headers;
  cuerpo: string | undefined;
}

/** Arma y envía los pedidos a la API. `Enrolamiento` lo extiende con un método por operación. */
export class Nucleo {
  readonly #opciones: OpcionesDeCliente;
  #autorizacion: string | undefined;

  constructor(opciones: OpcionesDeCliente = {}) {
    this.#opciones = { ...opciones };
  }

  /** Envía la operación `op` con `params` (ruta, query y cuerpo en un solo objeto). */
  pedir<T>(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido = {}): PromesaDeApi<T> {
    return new PromesaDeApi<T>(this.#ejecutar<T>(op, params, opciones));
  }

  async #ejecutar<T>(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido): Promise<DatosYRespuesta<T>> {
    const pedido = this.#armar(op, params, opciones);
    return this.#intentar<T>(op, pedido, opciones);
  }

  /** Valida los parámetros y arma URL, cabeceras y cuerpo. Lanza `ErrorDeConfiguracion` sin tocar la red. */
  #armar(op: Operacion, params: Record<string, unknown>, opciones: OpcionesDePedido): PedidoArmado {
    const autorizacion = this.#resolverAutorizacion();
    const ambiente = op.ambiente === 'no' ? undefined : resolverAmbiente(op, params, this.#opciones.ambiente);
    const usados = new Set([...op.enRuta, ...op.enQuery]);
    if (op.ambiente !== 'no') usados.add('ambiente');

    let ruta = op.ruta;
    if (op.ambiente === 'ruta') {
      ruta = ambiente === undefined ? ruta.replace('/{ambiente}', '') : ruta.replace('{ambiente}', String(ambiente));
    }
    for (const nombre of op.enRuta) {
      if (nombre === 'ambiente' && op.ambiente === 'ruta') continue;
      const valor = params[nombre];
      if (valor === undefined || valor === null || valor === '') {
        throw new ErrorDeConfiguracion(`${op.id}: falta el parámetro de ruta \`${nombre}\`.`);
      }
      const codificado = encodeURIComponent(String(valor));
      ruta = ruta.replace(`{${nombre}}`, () => codificado);
    }

    const query = new URLSearchParams();
    for (const nombre of op.enQuery) {
      if (nombre === 'ambiente' && op.ambiente === 'query') continue;
      const valor = params[nombre];
      if (valor === undefined || valor === null) continue;
      query.append(nombre, String(valor));
    }
    if (op.ambiente === 'query' && ambiente !== undefined) query.append('ambiente', String(ambiente));
    for (const [nombre, valor] of Object.entries(op.queryFija)) query.set(nombre, valor);

    const delCuerpo = Object.keys(params).filter((nombre) => !usados.has(nombre));
    let cuerpo: string | undefined;
    if (op.cuerpo === 'plano') {
      cuerpo = JSON.stringify(Object.fromEntries(delCuerpo.map((nombre) => [nombre, params[nombre]])));
    } else {
      const sobrantes = delCuerpo.filter((nombre) => params[nombre] !== undefined);
      if (sobrantes.length > 0) {
        const lista = sobrantes.map((nombre) => `\`${nombre}\``).join(', ');
        throw new ErrorDeConfiguracion(`${op.id}: la operación no lleva cuerpo y no recibe ${lista}.`);
      }
    }

    const cabeceras = new Headers({ Accept: 'application/json', 'User-Agent': `enrolamiento-node/${VERSION}` });
    for (const extra of [this.#opciones.cabeceras, opciones.cabeceras]) {
      for (const [nombre, valor] of Object.entries(extra ?? {})) cabeceras.set(nombre, valor);
    }
    if (cuerpo !== undefined) cabeceras.set('Content-Type', 'application/json');
    cabeceras.set('Authorization', autorizacion);

    const urlBase = (this.#opciones.urlBase ?? URL_BASE).replace(/\/+$/, '');
    const textoQuery = query.toString();
    const url = `${urlBase}${ruta}${textoQuery === '' ? '' : `?${textoQuery}`}`;
    return { url, metodo: op.metodo, cabeceras, cuerpo };
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
    const timeoutMs = opciones.timeoutMs ?? this.#opciones.timeoutMs ?? TIMEOUT_MS;
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

/** El `ambiente` del pedido: el de la llamada o, si falta, el del cliente. Solo 0, 1 o ninguno. */
function resolverAmbiente(op: Operacion, params: Record<string, unknown>, delCliente: unknown): 0 | 1 | undefined {
  const valor = params['ambiente'] !== undefined ? params['ambiente'] : delCliente;
  if (valor === undefined) {
    if (op.ambienteObligatorio) {
      throw new ErrorDeConfiguracion(
        `${op.id}: falta \`ambiente\`. Sin él la API opera en producción; ` +
          'páselo en la llamada o en las opciones del cliente (0 = homologación, 1 = producción).',
      );
    }
    return undefined;
  }
  if (valor !== 0 && valor !== 1) {
    const recibido = typeof valor === 'string' ? JSON.stringify(valor) : String(valor);
    throw new ErrorDeConfiguracion(
      `${op.id}: \`ambiente\` debe ser 0 (homologación) o 1 (producción); se recibió ${recibido}.`,
    );
  }
  return valor;
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
