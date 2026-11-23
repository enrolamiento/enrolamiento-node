import { createHmac, timingSafeEqual } from 'node:crypto';
import { EnrolamientoError, ErrorDeConfiguracion, ErrorDeFirma } from './errors.js';

// Tipos escritos a mano de la guía «Webhooks» del portal: el contrato OpenAPI no describe los webhooks.

/** El bloque `respaldo` de un evento: el estado del respaldo de documentos de la empresa. */
export interface Respaldo {
  estado: 'listo' | 'fallido' | 'vencido' | 'en_proceso';
  /** La guía dice que viene siempre, con `null` explícito, pero sus propios ejemplos `listo` y `en_proceso` lo omiten. */
  codigo?: string | null;
  url: string | null;
  documentos: { emitidos: number | null; recibidos: number | null; faltantes: number | null };
  completo_hasta: string | null;
  bytes: number | null;
  catalogo: 'normalizado' | 'sin_normalizar' | null;
  disponible_hasta: string | null;
}

/** La certificación de una empresa terminó. */
export interface EventoCertificacionFinalizada {
  evento: 'certificacion.finalizada';
  /** Identificador de la entrega; es el mismo `X-Enrolamiento-Entrega`. */
  id: string;
  fecha: string;
  rut: string;
  resolucion: { numero: number; fecha: string } | null;
  respaldo: Respaldo | null;
}

/** El respaldo de documentos de una empresa terminó. */
export interface EventoRespaldoFinalizado {
  evento: 'respaldo.finalizado';
  /** Identificador de la entrega; es el mismo `X-Enrolamiento-Entrega`. */
  id: string;
  fecha: string;
  rut: string;
  respaldo: Respaldo;
}

/** Entrega de prueba, para comprobar que el receptor verifica bien. */
export interface EventoPrueba {
  evento: 'prueba';
  /** Identificador de la entrega; es el mismo `X-Enrolamiento-Entrega`. */
  id: string;
  fecha: string;
}

/**
 * Los eventos que esta versión del SDK conoce, discriminados por `evento`. La API puede agregar eventos:
 * uno que el SDK no conoce llega igual, con su `evento`, aunque el tipo no lo nombre.
 */
export type EventoDeWebhook = EventoCertificacionFinalizada | EventoRespaldoFinalizado | EventoPrueba;

export interface OpcionesDeVerificacion {
  /** Diferencia máxima entre `X-Enrolamiento-Fecha` y el reloj, en milisegundos. Por omisión, 300000 (5 minutos). */
  toleranciaMs?: number;
  /** El reloj contra el que se compara la fecha, en milisegundos desde 1970. Por omisión, `Date.now()`. */
  ahora?: number;
}

/** Cabeceras como las entrega `fetch` (`Headers`) o Node (`IncomingMessage.headers`). */
export type CabecerasDeWebhook = Headers | Record<string, string | string[] | undefined>;

const CABECERA_FECHA = 'X-Enrolamiento-Fecha';
const CABECERA_FIRMA = 'X-Enrolamiento-Firma';
const PREFIJO_FIRMA = 'sha256=';
const TOLERANCIA_MS = 300_000;
/** `yyyy-MM-ddTHH:mm:ss`, fracción de segundo opcional, con desfase (`-03:00`) o `Z`. */
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function resolverSecreto(secreto: unknown): string {
  const valor = secreto ?? process.env['ENROLAMIENTO_WEBHOOK_SECRETO'];
  if (valor !== undefined && typeof valor !== 'string') {
    throw new ErrorDeConfiguracion('El secreto de los webhooks debe ser un texto.');
  }
  if (!valor) {
    throw new ErrorDeConfiguracion(
      'Falta el secreto de los webhooks: páselo como argumento o defina ENROLAMIENTO_WEBHOOK_SECRETO en el entorno.',
    );
  }
  return valor;
}

/** HMAC-SHA256 de `fecha.cuerpo`, con el secreto como texto UTF-8 (no se decodifica de hexadecimal). */
function calcularFirma(secreto: string, fecha: string, cuerpo: Uint8Array): string {
  return createHmac('sha256', Buffer.from(secreto, 'utf8')).update(`${fecha}.`, 'utf8').update(cuerpo).digest('hex');
}

function leerCabecera(cabeceras: CabecerasDeWebhook, nombre: string): string | null {
  if (typeof cabeceras !== 'object' || cabeceras === null) {
    throw new ErrorDeConfiguracion('Las cabeceras de la entrega van en un objeto (`Headers` o `req.headers`).');
  }
  let valor: string | string[] | null | undefined;
  if (typeof cabeceras.get === 'function') {
    valor = (cabeceras as Headers).get(nombre);
  } else {
    const buscada = nombre.toLowerCase();
    const clave = Object.keys(cabeceras).find((k) => k.toLowerCase() === buscada);
    valor = clave === undefined ? undefined : (cabeceras as Record<string, string | string[] | undefined>)[clave];
  }
  const texto = (Array.isArray(valor) ? valor[0] : valor)?.trim();
  return texto ? texto : null;
}

function exigirCabecera(cabeceras: CabecerasDeWebhook, nombre: string): string {
  const valor = leerCabecera(cabeceras, nombre);
  if (valor === null) {
    throw new ErrorDeFirma(`Falta la cabecera ${nombre}: la entrega no viene firmada por Enrolamiento.`);
  }
  return valor;
}

function bytesDelCuerpo(cuerpoCrudo: unknown): Uint8Array {
  if (typeof cuerpoCrudo === 'string') return Buffer.from(cuerpoCrudo, 'utf8');
  if (cuerpoCrudo instanceof Uint8Array) return cuerpoCrudo;
  if (cuerpoCrudo instanceof ArrayBuffer) return new Uint8Array(cuerpoCrudo);
  throw new ErrorDeFirma(
    'Se necesita el cuerpo crudo de la entrega, como string, Buffer, Uint8Array o ArrayBuffer, tal como llegó: ' +
      'la firma cubre sus bytes exactos, ' +
      'y un objeto ya parseado no se puede volver a serializar igual (espacios, orden de las claves, escapes). ' +
      'En Express, por ejemplo, lea esa ruta con express.raw({ type: "application/json" }).',
  );
}

function compararFirma(recibida: string, esperada: string): boolean {
  if (!recibida.startsWith(PREFIJO_FIRMA)) return false;
  const a = Buffer.from(recibida.slice(PREFIJO_FIRMA.length), 'utf8');
  const b = Buffer.from(esperada, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Corre `fn` y convierte lo que lance sin ser del SDK (un `TypeError` de un argumento con otra forma) en
 * `ErrorDeConfiguracion`, con un mensaje fijo: el error original podría traer el secreto o el cuerpo.
 */
function sinErroresAjenos<T>(funcion: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof EnrolamientoError) throw error;
    throw new ErrorDeConfiguracion(`webhooks.${funcion}: los argumentos no tienen la forma esperada.`);
  }
}

/** La ventana contra entregas repetidas. Un valor no finito la abriría sin límite, así que se rechaza. */
function resolverVentana(opciones: OpcionesDeVerificacion): { tolerancia: number; ahora: number } {
  const tolerancia = opciones.toleranciaMs ?? TOLERANCIA_MS;
  if (!Number.isFinite(tolerancia) || tolerancia < 0) {
    throw new ErrorDeConfiguracion('`toleranciaMs` debe ser un número finito de milisegundos, mayor o igual a 0.');
  }
  const ahora = opciones.ahora ?? Date.now();
  if (!Number.isFinite(ahora)) {
    throw new ErrorDeConfiguracion('`ahora` debe ser un número finito de milisegundos desde 1970.');
  }
  return { tolerancia, ahora };
}

/** Un valor que controla el remitente, acotado para un mensaje de error: sin saltos de línea y a lo más 40 caracteres. */
function paraMensaje(valor: string): string {
  return valor.replace(/[\r\n]/g, '').slice(0, 40);
}

function comprobarFecha(fecha: string, ventana: { tolerancia: number; ahora: number }): void {
  const instante = FORMATO_FECHA.test(fecha) ? Date.parse(fecha) : Number.NaN;
  if (Number.isNaN(instante)) {
    throw new ErrorDeFirma(`La cabecera ${CABECERA_FECHA} no es una fecha legible: "${paraMensaje(fecha)}".`);
  }
  const { tolerancia } = ventana;
  const diferencia = Math.abs(ventana.ahora - instante);
  // Escrito para fallar cerrado: cualquier NaN que se cuele rechaza la entrega.
  if (!(diferencia <= tolerancia)) {
    throw new ErrorDeFirma(
      `La cabecera ${CABECERA_FECHA} (${paraMensaje(fecha)}) difiere ${Math.round(diferencia / 1000)} s del reloj de este servidor; ` +
        `la tolerancia es de ${Math.round(tolerancia / 1000)} s. Si la entrega es reciente, revise que el reloj esté ` +
        'sincronizado (NTP); si no, puede ser una entrega repetida.',
    );
  }
}

function leerEvento(bytes: Uint8Array): EventoDeWebhook {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ErrorDeFirma('El cuerpo verificado no es JSON en UTF-8 válido.');
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json) || !('evento' in json) || typeof json.evento !== 'string') {
    throw new ErrorDeFirma('El cuerpo verificado no es un evento: no es un objeto JSON con `evento` de texto.');
  }
  // Un `evento` desconocido se devuelve igual: un evento nuevo de la API no debe romper a un SDK anterior.
  return json as EventoDeWebhook;
}

export const webhooks = {
  /**
   * Verifica una entrega y devuelve su evento. Primero comprueba la firma y la fecha; solo después lee el cuerpo.
   * Lanza `ErrorDeFirma` si la entrega no pasa (responda con un 4xx) y `ErrorDeConfiguracion` si falta el secreto.
   *
   * La API puede agregar eventos nuevos. Un evento que esta versión del SDK no conoce se devuelve igual, sin
   * cambios, aunque su `evento` no figure en `EventoDeWebhook`: deje siempre una rama `default` para un `evento`
   * que no reconozca (respóndale con un 2xx e ignórelo), y no la use para afirmar que no puede ocurrir.
   *
   * @param cuerpoCrudo El cuerpo tal como llegó, sin parsear (en un handler estilo fetch, `await request.arrayBuffer()`).
   * @param secreto Por omisión, `ENROLAMIENTO_WEBHOOK_SECRETO`.
   */
  verificar(
    cuerpoCrudo: string | Uint8Array | ArrayBuffer,
    cabeceras: CabecerasDeWebhook,
    secreto?: string,
    opciones?: OpcionesDeVerificacion | null,
  ): EventoDeWebhook {
    return sinErroresAjenos('verificar', () => {
      const clave = resolverSecreto(secreto);
      const ventana = resolverVentana(opciones ?? {});
      const bytes = bytesDelCuerpo(cuerpoCrudo);
      const fecha = exigirCabecera(cabeceras, CABECERA_FECHA);
      const firma = exigirCabecera(cabeceras, CABECERA_FIRMA);
      if (!compararFirma(firma, calcularFirma(clave, fecha, bytes))) {
        throw new ErrorDeFirma(
          `La cabecera ${CABECERA_FIRMA} no corresponde al cuerpo y a ${CABECERA_FECHA}: ` +
            'revise el secreto y que el cuerpo sea el crudo, sin modificar.',
        );
      }
      comprobarFecha(fecha, ventana);
      return leerEvento(bytes);
    });
  },

  /**
   * Firma un cuerpo como lo hace la API, para las pruebas del integrador. Devuelve las dos cabeceras que
   * `verificar` exige.
   *
   * @param fecha Por omisión, la hora actual en ISO.
   */
  firmar(cuerpo: string, secreto: string, fecha: string = new Date().toISOString()): {
    'X-Enrolamiento-Fecha': string;
    'X-Enrolamiento-Firma': string;
  } {
    return sinErroresAjenos('firmar', () => {
      if (!secreto) throw new ErrorDeConfiguracion('Falta el secreto para firmar el webhook.');
      return {
        'X-Enrolamiento-Fecha': fecha,
        'X-Enrolamiento-Firma': `${PREFIJO_FIRMA}${calcularFirma(secreto, fecha, Buffer.from(cuerpo, 'utf8'))}`,
      };
    });
  },
};
