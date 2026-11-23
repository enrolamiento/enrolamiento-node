/** Raíz de todos los errores que lanza el SDK. */
export class EnrolamientoError extends Error {
  override name = 'EnrolamientoError';
}

/** El SDK no puede armar el pedido: faltan credenciales, un parámetro de ruta o el ambiente. No se llamó a la API. */
export class ErrorDeConfiguracion extends EnrolamientoError {
  override name = 'ErrorDeConfiguracion';
}

/** No llegó respuesta de la API: la conexión falló o se agotó el tiempo de espera del SDK. */
export class ErrorDeConexion extends EnrolamientoError {
  override name = 'ErrorDeConexion';
  /** `true` si el SDK abortó el pedido al vencer su tiempo de espera; el pedido puede seguir en curso en la API. */
  readonly tiempoAgotado: boolean;
  /** `operationId` de la operación que se llamó. */
  readonly operacion: string;

  constructor(operacion: string, opciones: { tiempoAgotado: boolean; causa?: unknown }) {
    const detalle = opciones.tiempoAgotado
      ? 'se agotó el tiempo de espera sin respuesta de la API'
      : 'no se pudo conectar con la API';
    super(`${operacion}: ${detalle}`, opciones.causa === undefined ? undefined : { cause: opciones.causa });
    this.tiempoAgotado = opciones.tiempoAgotado;
    this.operacion = operacion;
  }
}

/** Valores de la cabecera `X-Reintentable`: la clasificación del código en el catálogo. */
export type Reintentable = 'si' | 'no' | 'desconocido';

/** Lo que `errorDeRespuesta` extrae de una respuesta de error. */
export interface DatosDeErrorDeApi {
  operacion: string;
  status: number;
  codigo: string | null;
  subcodigo: string | null;
  mensaje: string;
  reintentable: Reintentable | null;
  cabeceras: Headers;
  cuerpo: string;
}

/** La API respondió con un status que no es 2xx. Las subclases dicen de qué familia es. */
export class ErrorDeApi extends EnrolamientoError {
  override name = 'ErrorDeApi';
  readonly status: number;
  /** Código del error (`X-Codigo-Error` o lo que abre el cuerpo `CODIGO:…`); `null` si no trae. */
  readonly codigo: string | null;
  /** Segundo segmento de `CODIGO:SUBCODIGO:mensaje`, si lo hay. */
  readonly subcodigo: string | null;
  /** Mensaje para mostrar a una persona. No decida por él: decida por `codigo`. */
  readonly mensaje: string;
  /** Cabecera `X-Reintentable`; `null` si no vino. Es la clasificación del catálogo, no la decisión de la operación. */
  readonly reintentable: Reintentable | null;
  /** Cabeceras de la respuesta. */
  readonly cabeceras: Headers;
  /** Cuerpo de la respuesta, completo, como texto. */
  readonly cuerpo: string;
  /** `operationId` de la operación que se llamó. */
  readonly operacion: string;

  constructor(datos: DatosDeErrorDeApi) {
    const codigo = datos.codigo === null ? '' : ` ${datos.codigo}${datos.subcodigo === null ? '' : `:${datos.subcodigo}`}`;
    super(`${datos.operacion} (HTTP ${datos.status})${codigo}: ${datos.mensaje}`);
    this.status = datos.status;
    this.codigo = datos.codigo;
    this.subcodigo = datos.subcodigo;
    this.mensaje = datos.mensaje;
    this.reintentable = datos.reintentable;
    this.cabeceras = datos.cabeceras;
    this.cuerpo = datos.cuerpo;
    this.operacion = datos.operacion;
  }
}

/** 401: la API rechazó las credenciales o no las recibió. */
export class ErrorDeAutenticacion extends ErrorDeApi {
  override name = 'ErrorDeAutenticacion';
}

/** 409 sin `X-Codigo-Error`: se excedió el límite de pedidos. El pedido no se ejecutó. */
export class ErrorDeLimite extends ErrorDeApi {
  override name = 'ErrorDeLimite';
  /** Espera antes de reintentar, en milisegundos. */
  readonly reintentarEnMs = 60000 as const;
}

/** 504 sin `X-Codigo-Error`: la capa de entrada cortó el pedido a los 60 s. El pedido puede seguir en curso. */
export class ErrorDeTiempoAgotado extends ErrorDeApi {
  override name = 'ErrorDeTiempoAgotado';
}

/** Error de la plataforma web (cuerpo JSON con `Message`): ruta, verbo o parámetro inválido, o excepción no controlada. */
export class ErrorDeFramework extends ErrorDeApi {
  override name = 'ErrorDeFramework';
}

/** Error de negocio, con código o sin él; también cualquier respuesta que no calza en las otras familias. */
export class ErrorDeNegocio extends ErrorDeApi {
  override name = 'ErrorDeNegocio';
}

const CODIGO = /^([A-Z][A-Z0-9_]*):(.*)$/s;

/**
 * Clasifica una respuesta de error de la API en su familia, en el orden de la guía
 * «Errores y reintentos», sección «Cómo leer un error». Nunca lanza.
 */
export function errorDeRespuesta(operacion: string, status: number, cabeceras: Headers, cuerpo: string): ErrorDeApi {
  const codigoEnCabecera = cabeceras.get('X-Codigo-Error')?.trim() || null;
  const comun = { operacion, status, cabeceras, cuerpo, codigo: null, subcodigo: null, reintentable: null };
  const texto = cuerpo.trim();

  if (status === 409 && codigoEnCabecera === null) {
    return new ErrorDeLimite({ ...comun, mensaje: texto || 'Se excedió el número de pedidos permitido.' });
  }
  if (status === 401) {
    const mensaje = mensajeNoVacio(mensajeDeFramework(cuerpo) ?? texto, 'La API rechazó las credenciales.');
    return new ErrorDeAutenticacion({ ...comun, mensaje });
  }
  if (status === 504 && codigoEnCabecera === null) {
    return new ErrorDeTiempoAgotado({
      ...comun,
      mensaje: 'La capa de entrada cortó el pedido a los 60 segundos; el pedido puede seguir en curso.',
    });
  }
  if (codigoEnCabecera !== null) {
    const reintentable = leerReintentable(cabeceras.get('X-Reintentable'));
    const resto = cuerpo.startsWith(`${codigoEnCabecera}:`) ? cuerpo.slice(codigoEnCabecera.length + 1) : null;
    const { subcodigo, mensaje } = resto === null ? { subcodigo: null, mensaje: cuerpo } : separarSubcodigo(resto);
    return new ErrorDeNegocio({ ...comun, codigo: codigoEnCabecera, subcodigo, reintentable, mensaje: mensajeNoVacio(mensaje) });
  }
  const mensajeFramework = mensajeDeFramework(cuerpo);
  if (mensajeFramework !== null) {
    return new ErrorDeFramework({ ...comun, mensaje: mensajeNoVacio(mensajeFramework) });
  }
  const conCodigo = CODIGO.exec(cuerpo);
  if (conCodigo) {
    const { subcodigo, mensaje } = separarSubcodigo(conCodigo[2]!);
    return new ErrorDeNegocio({ ...comun, codigo: conCodigo[1]!, subcodigo, mensaje: mensajeNoVacio(mensaje) });
  }
  return new ErrorDeNegocio({ ...comun, mensaje: mensajeNoVacio(cuerpo) });
}

/** `SUBCODIGO:mensaje` → los dos; cualquier otro texto es mensaje sin subcódigo. */
function separarSubcodigo(resto: string): { subcodigo: string | null; mensaje: string } {
  const conSubcodigo = CODIGO.exec(resto);
  return conSubcodigo ? { subcodigo: conSubcodigo[1]!, mensaje: conSubcodigo[2]! } : { subcodigo: null, mensaje: resto };
}

/** El `Message` de un cuerpo JSON del framework, o `null` si el cuerpo no es un objeto JSON con `Message` de texto. */
function mensajeDeFramework(cuerpo: string): string | null {
  if (!cuerpo.trimStart().startsWith('{')) return null;
  try {
    const json: unknown = JSON.parse(cuerpo);
    if (typeof json === 'object' && json !== null && 'Message' in json && typeof json.Message === 'string') {
      return json.Message;
    }
  } catch {
    // No era JSON: se sigue como texto plano.
  }
  return null;
}

function leerReintentable(valor: string | null): Reintentable | null {
  const v = valor?.trim().toLowerCase();
  return v === 'si' || v === 'no' || v === 'desconocido' ? v : null;
}

/** `mensaje`, o `porOmision` si está vacío o en blanco: `mensaje` nunca queda vacío. */
function mensajeNoVacio(mensaje: string, porOmision = 'La API respondió con un error sin mensaje.'): string {
  return mensaje.trim() === '' ? porOmision : mensaje;
}

/**
 * Un webhook no pasó la verificación: falta una cabecera, la firma no corresponde, la fecha está fuera
 * de la tolerancia o el cuerpo no es un evento. Responda con un 4xx y no procese la entrega.
 */
export class ErrorDeFirma extends EnrolamientoError {
  override name = 'ErrorDeFirma';
}
