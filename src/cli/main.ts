import { VERSION_DEL_CONTRATO } from '../generated/operations.js';
import { VERSION } from '../version.js';
import { AYUDA_DE_DOCTOR, doctor } from './doctor.js';
import { AYUDA_DE_WEBHOOKS_PROBAR, webhooksProbar } from './webhooks-probar.js';

/** Lo que un comando toma del proceso. Las pruebas lo reemplazan. */
export interface Entorno {
  env: Record<string, string | undefined>;
  /** Escribe una línea en la salida estándar: los datos. */
  salida: (linea: string) => void;
  /** Escribe una línea en la salida de errores: los mensajes de uso y de falla. */
  error: (linea: string) => void;
  fetch: typeof fetch;
  /** El reloj, en milisegundos desde 1970. */
  ahora: () => number;
  /** `process.versions.node`. */
  versionDeNode: string;
  /** Cuánto se espera la respuesta de un receptor de webhooks. La API espera 10 segundos. */
  esperaDelReceptorMs: number;
}

/** Códigos de salida: todo bien, una comprobación falló, o el comando está mal escrito o le falta configuración. */
export const SALIDA = { bien: 0, falla: 1, uso: 2 } as const;

/** El comando está mal escrito o le falta configuración: sale con 2 y este mensaje. */
export class ErrorDeUso extends Error {}

const AYUDA = `enrolamiento ${VERSION}: herramientas del SDK de Enrolamiento (experimental).

Uso:
  enrolamiento webhooks probar [--url <dirección>]   Prueba su receptor de webhooks con avisos firmados
  enrolamiento doctor                                Comprueba Node, las credenciales y el reloj
  enrolamiento --version
  enrolamiento <comando> --help

Ningún comando escribe en la API ni guarda credenciales: se leen del entorno.
Documentación: https://developers.enrolamiento.cl`;

const USO_DE_OPCIONES: Record<string, string> = {
  ERR_PARSE_ARGS_UNKNOWN_OPTION: 'Hay una opción que este comando no tiene.',
  ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL: 'Sobra un argumento: este comando solo recibe opciones.',
  ERR_PARSE_ARGS_INVALID_OPTION_VALUE: 'A una opción le falta su valor, o lleva uno que no recibe.',
};

function entornoDelProceso(): Entorno {
  return {
    env: process.env,
    salida: (linea) => void process.stdout.write(`${linea}\n`),
    error: (linea) => void process.stderr.write(`${linea}\n`),
    fetch: globalThis.fetch,
    ahora: Date.now,
    versionDeNode: process.versions.node,
    esperaDelReceptorMs: 10_000,
  };
}

function pideAyuda(argumentos: string[]): boolean {
  return argumentos.includes('--help') || argumentos.includes('-h');
}

/** Corre el CLI con `argumentos` (sin `node` ni la ruta del script) y devuelve el código de salida. No lanza. */
export async function ejecutar(argumentos: string[], parcial: Partial<Entorno> = {}): Promise<number> {
  const entorno = { ...entornoDelProceso(), ...parcial };
  const [primero, segundo] = argumentos;
  try {
    if (primero === '--version' || primero === '-v') {
      entorno.salida(`${VERSION} (contrato ${VERSION_DEL_CONTRATO})`);
      return SALIDA.bien;
    }
    if (primero === 'webhooks' && segundo === 'probar') {
      const resto = argumentos.slice(2);
      if (pideAyuda(resto)) return ayuda(entorno, AYUDA_DE_WEBHOOKS_PROBAR);
      return await webhooksProbar(resto, entorno);
    }
    if (primero === 'doctor') {
      const resto = argumentos.slice(1);
      if (pideAyuda(resto)) return ayuda(entorno, AYUDA_DE_DOCTOR);
      return await doctor(resto, entorno);
    }
    if (primero === undefined || primero === '--help' || primero === '-h') return ayuda(entorno, AYUDA);
    // Lo escrito no se repite salvo que tenga forma de nombre de comando: podría ser un secreto pegado por error.
    throw new ErrorDeUso(/^[a-z-]{1,20}$/.test(primero) ? `No existe el comando «${primero}».` : 'Ese comando no existe.');
  } catch (error) {
    if (error instanceof ErrorDeUso) {
      entorno.error(`${error.message}\nVea «enrolamiento --help».`);
      return SALIDA.uso;
    }
    // `parseArgs` lanza un TypeError con `code`. Su mensaje repite lo escrito, que podría ser un secreto: no se muestra.
    const codigo = error instanceof TypeError && 'code' in error ? String(error.code) : '';
    if (codigo.startsWith('ERR_PARSE_ARGS')) {
      entorno.error(`${USO_DE_OPCIONES[codigo] ?? 'Las opciones no tienen la forma esperada.'}\nVea «enrolamiento --help».`);
      return SALIDA.uso;
    }
    // Tampoco el mensaje de un error que nadie previó: solo su clase.
    entorno.error(`Falla inesperada (${error instanceof Error ? error.name : 'sin detalle'}).`);
    return SALIDA.falla;
  }
}

function ayuda(entorno: Entorno, texto: string): number {
  entorno.salida(texto);
  return SALIDA.bien;
}
