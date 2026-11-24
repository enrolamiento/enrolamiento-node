import { parseArgs } from 'node:util';
import Enrolamiento from '../client.js';
import { ErrorDeApi, ErrorDeAutenticacion, ErrorDeConexion, ErrorDeLimite } from '../errors.js';
import { VERSION_DEL_CONTRATO } from '../generated/operations.js';
import { VERSION } from '../version.js';
import { SALIDA, type Entorno } from './main.js';

export const AYUDA_DE_DOCTOR = `enrolamiento doctor: comprueba que esta máquina puede usar la API.

Revisa la versión de Node, que estén las credenciales, que la API las acepte (con una lectura, sin escribir
nada), que el reloj esté en hora y el secreto de los webhooks. No imprime ni guarda ninguna credencial.

Uso:
  ENROLAMIENTO_USUARIO=<usuario> ENROLAMIENTO_APIKEY=<apikey> enrolamiento doctor [--json]

Con las credenciales en un archivo .env:
  node --env-file=.env node_modules/enrolamiento/dist/cli.js doctor

Sale con 0 si nada falla (un aviso no es una falla), con 1 si algo falla.`;

/** `ok`: bien. `aviso`: funciona, pero conviene mirarlo. `falla`: hay que arreglarlo. `omitida`: no se pudo o no hizo falta comprobar. */
export type EstadoDeComprobacion = 'ok' | 'aviso' | 'falla' | 'omitida';

export interface Comprobacion {
  nombre: 'node' | 'credenciales' | 'api' | 'reloj' | 'secreto-de-webhooks';
  estado: EstadoDeComprobacion;
  detalle: string;
}

const NODE_MINIMO = [22, 12] as const;
/** La tolerancia con la que se verifica la fecha de un webhook. */
const TOLERANCIA_DEL_RELOJ_MS = 300_000;
const AVISO_DEL_RELOJ_MS = 60_000;
const ESPERA_DE_LA_API_MS = 30_000;

function comprobarNode(version: string): Comprobacion {
  const [mayor = 0, menor = 0] = version.split('.').map(Number);
  const alcanza = mayor > NODE_MINIMO[0] || (mayor === NODE_MINIMO[0] && menor >= NODE_MINIMO[1]);
  return alcanza
    ? { nombre: 'node', estado: 'ok', detalle: `Node ${version}` }
    : { nombre: 'node', estado: 'falla', detalle: `Node ${version}: el SDK necesita ${NODE_MINIMO.join('.')} o posterior` };
}

function comprobarSecreto(secreto: string | undefined): Comprobacion {
  const nombre = 'secreto-de-webhooks';
  if (!secreto) {
    return { nombre, estado: 'omitida', detalle: 'ENROLAMIENTO_WEBHOOK_SECRETO no está definido; hace falta solo si recibe webhooks' };
  }
  if (secreto !== secreto.trim()) {
    return { nombre, estado: 'falla', detalle: 'ENROLAMIENTO_WEBHOOK_SECRETO tiene espacios o saltos de línea al principio o al final' };
  }
  if (!/^[0-9a-f]{64}$/.test(secreto)) {
    return {
      nombre,
      estado: 'aviso',
      detalle: 'ENROLAMIENTO_WEBHOOK_SECRETO no tiene la forma del secreto del portal (64 caracteres hexadecimales en minúsculas)',
    };
  }
  return { nombre, estado: 'ok', detalle: 'ENROLAMIENTO_WEBHOOK_SECRETO tiene la forma del secreto del portal' };
}

function comprobarReloj(fechaDeLaApi: string | null, enviado: number, recibido: number): Comprobacion {
  const nombre = 'reloj';
  const instante = fechaDeLaApi === null ? Number.NaN : Date.parse(fechaDeLaApi);
  if (Number.isNaN(instante)) return { nombre, estado: 'omitida', detalle: 'la respuesta no trae una fecha contra la que comparar' };
  // La cabecera `Date` no trae fracción de segundo: se compara con la mitad del pedido.
  const segundos = Math.round(Math.abs((enviado + recibido) / 2 - instante) / 1000);
  if (segundos * 1000 > TOLERANCIA_DEL_RELOJ_MS) {
    return {
      nombre,
      estado: 'falla',
      detalle: `el reloj difiere ${segundos} s del de la API: con más de 300 s la verificación de los webhooks los rechaza. Sincronícelo (NTP)`,
    };
  }
  if (segundos * 1000 > AVISO_DEL_RELOJ_MS) {
    return { nombre, estado: 'aviso', detalle: `el reloj difiere ${segundos} s del de la API; los webhooks toleran 300 s. Sincronícelo (NTP)` };
  }
  return { nombre, estado: 'ok', detalle: `el reloj difiere ${segundos} s del de la API` };
}

async function comprobarApi(entorno: Entorno): Promise<[Comprobacion, Comprobacion]> {
  const sinReloj: Comprobacion = { nombre: 'reloj', estado: 'omitida', detalle: 'no hubo respuesta de la API contra la que comparar' };
  const cliente = new Enrolamiento({
    usuario: entorno.env['ENROLAMIENTO_USUARIO'],
    apikey: entorno.env['ENROLAMIENTO_APIKEY'],
    fetch: entorno.fetch,
    timeoutMs: ESPERA_DE_LA_API_MS,
    maxReintentos: 0,
  });
  const enviado = entorno.ahora();
  try {
    // Una lectura de la cuenta, sin RUT ni ambiente: no toca al SII ni escribe nada.
    const { respuesta } = await cliente.certificaciones.v1.stats().conRespuesta();
    const reloj = comprobarReloj(respuesta.headers.get('Date'), enviado, entorno.ahora());
    return [{ nombre: 'api', estado: 'ok', detalle: 'la API aceptó las credenciales' }, reloj];
  } catch (error) {
    const falla = (detalle: string): Comprobacion => ({ nombre: 'api', estado: 'falla', detalle });
    if (!(error instanceof ErrorDeApi)) {
      const detalle =
        error instanceof ErrorDeConexion
          ? error.tiempoAgotado
            ? `la API no respondió en ${ESPERA_DE_LA_API_MS / 1000} s. La lectura que se usa tarda más en una cuenta con muchas certificaciones: repita antes de sospechar de la red`
            : 'no se pudo conectar con api.enrolamiento.cl: revise la red, el proxy y el cortafuegos'
          : 'no se pudo armar el pedido: revise ENROLAMIENTO_USUARIO y ENROLAMIENTO_APIKEY';
      return [falla(detalle), sinReloj];
    }
    const reloj = comprobarReloj(error.cabeceras.get('Date'), enviado, entorno.ahora());
    if (error instanceof ErrorDeAutenticacion) {
      return [falla('la API rechazó las credenciales (HTTP 401): revise el usuario y la APIKey en Mi Cuenta, pestaña Integración'), reloj];
    }
    if (error instanceof ErrorDeLimite) {
      return [{ nombre: 'api', estado: 'aviso', detalle: 'la API respondió, pero la cuenta excedió el límite de pedidos: repita en un minuto' }, reloj];
    }
    const codigo = error.codigo === null ? '' : `, código ${error.codigo}`;
    return [falla(`la API respondió HTTP ${error.status}${codigo}. Vea ${error.urlDeAyuda}`), reloj];
  }
}

export async function doctor(argumentos: string[], entorno: Entorno): Promise<number> {
  const { values } = parseArgs({ args: argumentos, options: { json: { type: 'boolean', default: false } }, allowPositionals: false, strict: true });

  const comprobaciones: Comprobacion[] = [comprobarNode(entorno.versionDeNode)];
  const faltan = ['ENROLAMIENTO_USUARIO', 'ENROLAMIENTO_APIKEY'].filter((nombre) => !entorno.env[nombre]);
  if (faltan.length > 0) {
    const sinCredenciales = 'no se comprobó: faltan las credenciales';
    comprobaciones.push(
      { nombre: 'credenciales', estado: 'falla', detalle: `falta ${faltan.join(' y ')} en el entorno` },
      { nombre: 'api', estado: 'omitida', detalle: sinCredenciales },
      { nombre: 'reloj', estado: 'omitida', detalle: sinCredenciales },
    );
  } else {
    comprobaciones.push({ nombre: 'credenciales', estado: 'ok', detalle: 'ENROLAMIENTO_USUARIO y ENROLAMIENTO_APIKEY están definidos' });
    comprobaciones.push(...(await comprobarApi(entorno)));
  }
  comprobaciones.push(comprobarSecreto(entorno.env['ENROLAMIENTO_WEBHOOK_SECRETO']));

  const fallas = comprobaciones.filter((c) => c.estado === 'falla').length;
  if (values.json) {
    entorno.salida(JSON.stringify({ sdk: VERSION, contrato: VERSION_DEL_CONTRATO, fallas, comprobaciones }, null, 2));
  } else {
    entorno.salida(`SDK ${VERSION}, contrato ${VERSION_DEL_CONTRATO}\n`);
    const etiqueta = { ok: 'ok     ', aviso: 'AVISO  ', falla: 'FALLA  ', omitida: 'omitida' };
    for (const c of comprobaciones) entorno.salida(`  ${etiqueta[c.estado]}  ${c.nombre.padEnd(19)}  ${c.detalle}`);
    entorno.salida(fallas === 0 ? '\nTodo en orden.' : `\n${fallas} ${fallas === 1 ? 'comprobación falló' : 'comprobaciones fallaron'}.`);
  }
  return fallas === 0 ? SALIDA.bien : SALIDA.falla;
}
