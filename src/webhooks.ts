import { createHmac, timingSafeEqual } from 'node:crypto';
import { ErrorDeConfiguracion, ErrorDeFirma } from './errors.js';

// Tipos escritos a mano de la guía «Webhooks» del portal: el contrato OpenAPI no describe los webhooks.

/** El bloque `respaldo` de un evento: el estado del respaldo de documentos de la empresa. */
export interface Respaldo {
  estado: 'listo' | 'fallido' | 'vencido' | 'en_proceso';
  codigo: string | null;
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

/** Los eventos que esta versión del SDK conoce, discriminados por `evento`. */
export type EventoDeWebhook = EventoCertificacionFinalizada | EventoRespaldoFinalizado | EventoPrueba;

/**
 * Un evento que esta versión del SDK no conoce: se devuelve tal como llegó, para que un evento nuevo
 * de la API no rompa a un receptor con un SDK anterior.
 */
export interface EventoDesconocido {
  evento: string;
  id: string;
  fecha: string;
  [campo: string]: unknown;
}

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

function resolverSecreto(secreto: string | undefined): string {
  const valor = secreto ?? process.env['ENROLAMIENTO_WEBHOOK_SECRETO'];
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
  throw new ErrorDeFirma(
    'Se necesita el cuerpo crudo de la entrega, como string o Buffer, tal como llegó: la firma cubre sus bytes exactos, ' +
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

function comprobarFecha(fecha: string, opciones: OpcionesDeVerificacion): void {
  const instante = FORMATO_FECHA.test(fecha) ? Date.parse(fecha) : Number.NaN;
  if (Number.isNaN(instante)) {
    throw new ErrorDeFirma(`La cabecera ${CABECERA_FECHA} no es una fecha legible: "${fecha}".`);
  }
  const tolerancia = opciones.toleranciaMs ?? TOLERANCIA_MS;
  const diferencia = Math.abs((opciones.ahora ?? Date.now()) - instante);
  if (diferencia > tolerancia) {
    throw new ErrorDeFirma(
      `La cabecera ${CABECERA_FECHA} (${fecha}) difiere ${Math.round(diferencia / 1000)} s del reloj de este servidor; ` +
        `la tolerancia es de ${Math.round(tolerancia / 1000)} s. Si la entrega es reciente, revise que el reloj esté ` +
        'sincronizado (NTP); si no, puede ser una entrega repetida.',
    );
  }
}

function leerEvento(bytes: Uint8Array): EventoDeWebhook | EventoDesconocido {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ErrorDeFirma('El cuerpo verificado no es JSON en UTF-8 válido.');
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json) || !('evento' in json) || typeof json.evento !== 'string') {
    throw new ErrorDeFirma('El cuerpo verificado no es un evento: no es un objeto JSON con `evento` de texto.');
  }
  return json as EventoDeWebhook | EventoDesconocido;
}

export const webhooks = {
  /**
   * Verifica una entrega y devuelve su evento. Primero comprueba la firma y la fecha; solo después lee el cuerpo.
   * Lanza `ErrorDeFirma` si la entrega no pasa (responda con un 4xx) y `ErrorDeConfiguracion` si falta el secreto.
   *
   * @param cuerpoCrudo El cuerpo tal como llegó, sin parsear.
   * @param secreto Por omisión, `ENROLAMIENTO_WEBHOOK_SECRETO`.
   */
  verificar(
    cuerpoCrudo: string | Uint8Array,
    cabeceras: CabecerasDeWebhook,
    secreto?: string,
    opciones: OpcionesDeVerificacion = {},
  ): EventoDeWebhook | EventoDesconocido {
    const clave = resolverSecreto(secreto);
    const bytes = bytesDelCuerpo(cuerpoCrudo);
    const fecha = exigirCabecera(cabeceras, CABECERA_FECHA);
    const firma = exigirCabecera(cabeceras, CABECERA_FIRMA);
    if (!compararFirma(firma, calcularFirma(clave, fecha, bytes))) {
      throw new ErrorDeFirma(
        `La cabecera ${CABECERA_FIRMA} no corresponde al cuerpo y a ${CABECERA_FECHA}: ` +
          'revise el secreto y que el cuerpo sea el crudo, sin modificar.',
      );
    }
    comprobarFecha(fecha, opciones);
    return leerEvento(bytes);
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
    if (!secreto) throw new ErrorDeConfiguracion('Falta el secreto para firmar el webhook.');
    return {
      'X-Enrolamiento-Fecha': fecha,
      'X-Enrolamiento-Firma': `${PREFIJO_FIRMA}${calcularFirma(secreto, fecha, Buffer.from(cuerpo, 'utf8'))}`,
    };
  },
};
