import { ErrorDeApi, ErrorDeConexion, ErrorDeLimite, ErrorDeTiempoAgotado } from './errors.js';
import type { Operacion } from './request.js';

/** Lo que decide la política para un intento fallido. `esperaMs` vale 0 cuando no se reintenta. */
export interface DecisionDeReintento {
  reintentar: boolean;
  esperaMs: number;
}

/** Límites de la política. `azar` devuelve un número en [0, 1); por omisión, `Math.random`. */
export interface OpcionesDeReintento {
  maxReintentos: number;
  esperaMaximaMs: number;
  azar?: () => number;
}

const NO: DecisionDeReintento = { reintentar: false, esperaMs: 0 };
/** Lo que se suma, al azar, a la espera de un `ErrorDeLimite`. */
const AZAR_DEL_LIMITE_MS = 10000;
const RETROCESO_BASE_MS = 500;
const RETROCESO_TOPE_MS = 8000;

/**
 * Decide si se reintenta la operación `op` tras `error` y cuánto se espera antes. `intento` es el número del
 * intento que falló (1 = el primero). Sigue `x-idempotente` y `x-reintentable` del contrato; la primera regla
 * que calza decide. Nunca reintenta si `intento > maxReintentos` ni si la espera supera `esperaMaximaMs`.
 */
export function decidirReintento(
  op: Operacion,
  error: ErrorDeApi | ErrorDeConexion,
  intento: number,
  opciones: OpcionesDeReintento,
): DecisionDeReintento {
  const azar = opciones.azar ?? Math.random;
  const esperaMs = esperaSegunLaRegla(op, error, intento, azar);
  if (esperaMs === null || intento > opciones.maxReintentos || esperaMs > opciones.esperaMaximaMs) return NO;
  return { reintentar: true, esperaMs };
}

/** La espera que pide la primera regla que calza, o `null` si esa regla dice que no se reintenta. */
function esperaSegunLaRegla(op: Operacion, error: ErrorDeApi | ErrorDeConexion, intento: number, azar: () => number): number | null {
  // Sin respuesta, o la capa de entrada cortó: el pedido pudo ejecutarse. Solo se repite lo idempotente.
  if (error instanceof ErrorDeConexion || error instanceof ErrorDeTiempoAgotado) {
    return op.idempotente ? retroceso(intento, azar) : null;
  }
  // El límite de tasa rechaza antes de ejecutar: repetir es seguro en cualquier operación.
  if (error instanceof ErrorDeLimite) return error.reintentarEnMs + AZAR_DEL_LIMITE_MS * azar();

  const { codigo } = error;
  const { automatico, manual, nunca } = op.reintentable;
  if (codigo !== null && (nunca.includes(codigo) || manual.includes(codigo))) return null;
  if ((codigo !== null && automatico.includes(codigo)) || automatico.includes(String(error.status))) {
    return retryAfter(error) ?? retroceso(intento, azar);
  }
  // Un código que la operación no lista: decide la cabecera X-Reintentable, y solo si repetir es seguro.
  if (codigo !== null && error.reintentable === 'si' && op.idempotente) {
    return retryAfter(error) ?? retroceso(intento, azar);
  }
  return null;
}

/** `500 * 2^(intento-1)` ms con tope de 8000, por un factor al azar entre 0.75 y 1.25. */
function retroceso(intento: number, azar: () => number): number {
  const base = Math.min(RETROCESO_BASE_MS * 2 ** (intento - 1), RETROCESO_TOPE_MS);
  return base * (0.75 + 0.5 * azar());
}

/** La cabecera `Retry-After` en milisegundos si trae segundos enteros no negativos; si no, `null`. */
function retryAfter(error: ErrorDeApi): number | null {
  const valor = error.cabeceras.get('Retry-After')?.trim();
  if (valor === undefined || !/^\d+$/.test(valor)) return null;
  return Number(valor) * 1000;
}
