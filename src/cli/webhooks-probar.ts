import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { VERSION } from '../version.js';
import { webhooks } from '../webhooks.js';
import { ErrorDeUso, SALIDA, type Entorno } from './main.js';

export const AYUDA_DE_WEBHOOKS_PROBAR = `enrolamiento webhooks probar: prueba su receptor de webhooks, en su máquina.

Envía avisos firmados como los firma Enrolamiento: los que su receptor debe aceptar (un 2xx en menos de
10 segundos) y los que debe rechazar (firma de otro secreto, cuerpo alterado, fecha vencida, sin firma).
Sirve para un receptor en cualquier lenguaje.

Uso:
  ENROLAMIENTO_WEBHOOK_SECRETO=<secreto> enrolamiento webhooks probar [opciones]

Opciones:
  --url <dirección>     Dónde escucha su receptor. Por omisión, http://127.0.0.1:3000
  --caso <nombre>       Corre solo ese caso; se puede repetir. Los nombres salen con --listar
  --listar              Lista los casos y termina, sin enviar nada
  --permitir-remoto     Permite una dirección que no sea de esta máquina
  --json                Imprime el resultado como JSON

El secreto se lee solo de ENROLAMIENTO_WEBHOOK_SECRETO, el mismo valor con el que corre su receptor: en
una opción quedaría en el historial de la consola. Para probar puede ser cualquier texto.

Sale con 0 si cada caso respondió como se esperaba, con 1 si alguno no, y con 2 si falta configuración.

Ejemplo:
  ENROLAMIENTO_WEBHOOK_SECRETO=secreto-de-prueba npx enrolamiento webhooks probar --url http://localhost:8080/webhooks`;

const URL_POR_OMISION = 'http://127.0.0.1:3000';
const RUT = '11111111-1';
const SIN_DATOS = { emitidos: null, recibidos: null, faltantes: null };

/** El bloque `respaldo` con las claves en el orden de la guía «Webhooks». */
function respaldo(estado: string, cambios: Record<string, unknown> = {}): Record<string, unknown> {
  const base = { url: null, documentos: SIN_DATOS, completo_hasta: null, bytes: null, catalogo: null, disponible_hasta: null };
  const { codigo, ...resto } = cambios;
  return { estado, ...(codigo === undefined ? {} : { codigo }), ...base, ...resto };
}

const RESPALDO_LISTO = respaldo('listo', {
  url: 'https://api.enrolamiento.cl/v1/respaldos/3f9c2a7e5b1d4c08a6e2f0b9d7c41e53/descargar',
  documentos: { emitidos: 1253, recibidos: 1793, faltantes: 0 },
  completo_hasta: '2026-11-13',
  bytes: 636000000,
  catalogo: 'normalizado',
  disponible_hasta: '2027-02-15',
});
const RESOLUCION = { numero: 80, fecha: '2026-11-13' };

type Alteracion = 'ninguna' | 'otro-secreto' | 'cuerpo-alterado' | 'fecha-vencida' | 'sin-firma';

interface Caso {
  nombre: string;
  descripcion: string;
  espera: 'aceptar' | 'rechazar';
  evento: string;
  /** Los campos del aviso después de `evento`, `id` y `fecha`. */
  campos: Record<string, unknown>;
  alteracion: Alteracion;
  /** Cuántas veces se envía la misma entrega, con el mismo `id`. */
  veces: number;
}

function caso(nombre: string, descripcion: string, evento: string, campos: Record<string, unknown>, extra: Partial<Caso> = {}): Caso {
  return { nombre, descripcion, espera: 'aceptar', evento, campos, alteracion: 'ninguna', veces: 1, ...extra };
}

const CERTIFICACION = { rut: RUT, resolucion: RESOLUCION, respaldo: null };

export const CASOS: readonly Caso[] = [
  caso('prueba', 'El aviso del botón «Enviar prueba»', 'prueba', {}),
  caso('certificacion-sin-respaldo', 'Certificación finalizada, sin respaldo', 'certificacion.finalizada', CERTIFICACION),
  caso('certificacion-sin-resolucion', 'Certificación finalizada, con la resolución en null', 'certificacion.finalizada', {
    ...CERTIFICACION,
    resolucion: null,
  }),
  caso('certificacion-respaldo-listo', 'Certificación finalizada, con el respaldo listo', 'certificacion.finalizada', {
    ...CERTIFICACION,
    respaldo: RESPALDO_LISTO,
  }),
  caso('certificacion-respaldo-en-proceso', 'Certificación finalizada, con el respaldo aún en proceso', 'certificacion.finalizada', {
    ...CERTIFICACION,
    respaldo: respaldo('en_proceso', { documentos: { emitidos: 1253, recibidos: null, faltantes: null } }),
  }),
  caso('certificacion-respaldo-fallido', 'Certificación finalizada, con el respaldo fallido', 'certificacion.finalizada', {
    ...CERTIFICACION,
    respaldo: respaldo('fallido', { codigo: 'SIN_ACCESO_MIPYME' }),
  }),
  caso('certificacion-respaldo-vencido', 'Certificación finalizada, con el respaldo vencido', 'certificacion.finalizada', {
    ...CERTIFICACION,
    respaldo: respaldo('vencido', { disponible_hasta: '2026-08-15' }),
  }),
  caso('respaldo-listo', 'Respaldo finalizado: listo', 'respaldo.finalizado', { rut: RUT, respaldo: RESPALDO_LISTO }),
  caso('respaldo-fallido', 'Respaldo finalizado: fallido, con su código', 'respaldo.finalizado', {
    rut: RUT,
    respaldo: respaldo('fallido', { codigo: 'SIN_ACCESO_MIPYME' }),
  }),
  caso('respaldo-vencido', 'Respaldo finalizado: vencido', 'respaldo.finalizado', {
    rut: RUT,
    respaldo: respaldo('vencido', { disponible_hasta: '2026-08-15' }),
  }),
  caso('repetida', 'La misma entrega dos veces, como en un reintento', 'prueba', {}, { veces: 2 }),
  caso('firma-de-otro-secreto', 'Firmado con otro secreto', 'prueba', {}, { espera: 'rechazar', alteracion: 'otro-secreto' }),
  caso('cuerpo-alterado', 'El cuerpo cambió después de firmar', 'certificacion.finalizada', CERTIFICACION, {
    espera: 'rechazar',
    alteracion: 'cuerpo-alterado',
  }),
  caso('fecha-vencida', 'Firma válida, con una fecha de hace 10 minutos', 'prueba', {}, { espera: 'rechazar', alteracion: 'fecha-vencida' }),
  caso('sin-firma', 'Sin las cabeceras de la firma', 'prueba', {}, { espera: 'rechazar', alteracion: 'sin-firma' }),
];

/** El resultado de un caso. `status` es `null` si el receptor no respondió. */
export interface ResultadoDeCaso {
  caso: string;
  descripcion: string;
  espera: 'aceptar' | 'rechazar';
  status: number | null;
  ms: number;
  correcto: boolean;
  detalle: string;
}

/**
 * `yyyy-MM-ddTHH:mm:ss-03:00`: el formato de `fecha` y de `X-Enrolamiento-Fecha` en un aviso real, sin fracción
 * de segundo y con desfase. Un aviso real lleva el desfase de la hora de Chile del momento; aquí va fijo.
 */
export function fechaDeAviso(ms: number): string {
  return `${new Date(ms - 3 * 3_600_000).toISOString().slice(0, 19)}-03:00`;
}

/**
 * Solo esta máquina: `localhost`, 127.0.0.0/8 y `::1`. Ningún otro nombre, tampoco `algo.localhost`: a dónde
 * lleva lo decide el DNS de la máquina, y puede ser afuera.
 */
function esDeEstaMaquina(host: string): boolean {
  return host === 'localhost' || /^127(?:\.\d{1,3}){3}$/.test(host) || host === '[::1]';
}

/** La dirección para mostrar: sin query ni fragmento, que pueden llevar un token del receptor. */
function paraMostrar(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function leerDestino(texto: string, permitirRemoto: boolean): URL {
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new ErrorDeUso('--url no es una dirección: escríbala completa, como http://127.0.0.1:3000');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ErrorDeUso('--url debe empezar con http:// o https://');
  if (url.username !== '' || url.password !== '') throw new ErrorDeUso('--url no lleva usuario ni contraseña.');
  if (!esDeEstaMaquina(url.hostname) && !permitirRemoto) {
    throw new ErrorDeUso(
      `--url no es de esta máquina (localhost, 127.x.x.x o [::1]). Este comando envía avisos de prueba que un receptor real procesaría como ` +
        'verdaderos: si es lo que quiere, repita con --permitir-remoto.',
    );
  }
  return url;
}

interface Envio {
  cuerpo: string;
  cabeceras: Record<string, string>;
}

/** `ocurrio` es cuándo pasó lo que se avisa: va en el cuerpo y no cambia entre intentos. `enviado` fecha este intento. */
function armarEnvio(elCaso: Caso, id: string, secreto: string, ocurrio: number, enviado: number): Envio {
  const cuerpo = JSON.stringify({ evento: elCaso.evento, id, fecha: fechaDeAviso(ocurrio), ...elCaso.campos });
  const cabeceras: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': `Enrolamiento-Webhooks/1.0 (prueba; enrolamiento-node/${VERSION})`,
    'X-Enrolamiento-Evento': elCaso.evento,
    'X-Enrolamiento-Entrega': id,
  };
  if (elCaso.alteracion === 'sin-firma') return { cuerpo, cabeceras };
  const clave = elCaso.alteracion === 'otro-secreto' ? `${secreto}-otro` : secreto;
  const fecha = fechaDeAviso(elCaso.alteracion === 'fecha-vencida' ? enviado - 600_000 : enviado);
  Object.assign(cabeceras, webhooks.firmar(cuerpo, clave, fecha));
  if (elCaso.alteracion === 'cuerpo-alterado') return { cuerpo: cuerpo.replace(RUT, '22222222-2'), cabeceras };
  return { cuerpo, cabeceras };
}

/** Lo que pasó con un envío. Sin `status`, `sinRespuesta` dice por qué: venció la espera o se cortó la conexión. */
interface Respuesta {
  status: number | null;
  ms: number;
  sinRespuesta?: 'espera' | 'conexion';
}

async function enviar(url: URL, envio: Envio, entorno: Entorno): Promise<Respuesta> {
  const inicio = entorno.ahora();
  try {
    const respuesta = await entorno.fetch(url, {
      method: 'POST',
      headers: envio.cabeceras,
      body: envio.cuerpo,
      redirect: 'manual',
      signal: AbortSignal.timeout(entorno.esperaDelReceptorMs),
    });
    await respuesta.body?.cancel();
    return { status: respuesta.status, ms: entorno.ahora() - inicio };
  } catch (error) {
    const espera = error instanceof Error && error.name === 'TimeoutError';
    return { status: null, ms: entorno.ahora() - inicio, sinRespuesta: espera ? 'espera' : 'conexion' };
  }
}

function juzgar(elCaso: Caso, { status, sinRespuesta }: Respuesta, entorno: Entorno): { correcto: boolean; detalle: string } {
  if (status === null && sinRespuesta === 'espera') {
    return { correcto: false, detalle: `no respondió en ${entorno.esperaDelReceptorMs / 1000} s: la entrega cuenta como fallida` };
  }
  if (status === null) {
    return elCaso.espera === 'aceptar'
      ? { correcto: false, detalle: 'cortó la conexión sin responder: la entrega cuenta como fallida' }
      : { correcto: true, detalle: 'cortó la conexión sin responder; un 4xx dice mejor que el aviso es inválido' };
  }
  const acepto = status >= 200 && status < 300;
  if (elCaso.espera === 'aceptar') {
    if (acepto) return { correcto: true, detalle: '' };
    if (status >= 300 && status < 400) return { correcto: false, detalle: 'redirige: las redirecciones no se siguen y cuentan como falla' };
    return { correcto: false, detalle: 'se esperaba un 2xx: Enrolamiento reintentaría esta entrega' };
  }
  if (acepto) return { correcto: false, detalle: 'aceptó un aviso que no viene de Enrolamiento: verifique la firma y la fecha' };
  if (status >= 500) return { correcto: true, detalle: 'lo rechazó con un 5xx; un 4xx dice mejor que el aviso es inválido' };
  return { correcto: true, detalle: '' };
}

async function correr(elCaso: Caso, url: URL, secreto: string, entorno: Entorno): Promise<ResultadoDeCaso & { sinRespuesta?: string }> {
  const id = randomUUID();
  const ocurrio = entorno.ahora();
  let ultimo: Respuesta = { status: null, ms: 0 };
  let juicio = { correcto: true, detalle: '' };
  for (let vez = 0; vez < elCaso.veces && juicio.correcto; vez++) {
    // Cada intento de una entrega lleva su fecha y su firma; el cuerpo y el `id` no cambian. Un reintento real
    // llega al menos un minuto después: los intentos se fechan con un minuto de diferencia, el último ahora.
    const enviado = entorno.ahora() - (elCaso.veces - 1 - vez) * 60_000;
    ultimo = await enviar(url, armarEnvio(elCaso, id, secreto, ocurrio, enviado), entorno);
    juicio = juzgar(elCaso, ultimo, entorno);
  }
  const { nombre, descripcion, espera } = elCaso;
  return { caso: nombre, descripcion, espera, status: ultimo.status, ms: ultimo.ms, ...juicio, sinRespuesta: ultimo.sinRespuesta };
}

function elegirCasos(pedidos: string[] | undefined): readonly Caso[] {
  if (pedidos === undefined || pedidos.length === 0) return CASOS;
  const desconocidos = pedidos.filter((nombre) => !CASOS.some((c) => c.nombre === nombre));
  if (desconocidos.length > 0) {
    // Sin repetir lo escrito: podría ser un secreto pegado en la opción equivocada.
    throw new ErrorDeUso('--caso lleva un nombre que no existe. Vea los nombres con --listar.');
  }
  return CASOS.filter((c) => pedidos.includes(c.nombre));
}

function imprimir(url: URL, resultados: ResultadoDeCaso[], entorno: Entorno): void {
  const ancho = Math.max(...resultados.map((r) => r.caso.length));
  entorno.salida(`Receptor: ${paraMostrar(url)}`);
  for (const espera of ['aceptar', 'rechazar'] as const) {
    const grupo = resultados.filter((r) => r.espera === espera);
    if (grupo.length === 0) continue;
    entorno.salida(espera === 'aceptar' ? '\nAvisos que debe aceptar (2xx):' : '\nAvisos que debe rechazar:');
    for (const r of grupo) {
      const status = r.status === null ? '---' : String(r.status);
      const detalle = r.detalle === '' ? '' : `  ${r.detalle}`;
      entorno.salida(`  ${r.correcto ? 'ok   ' : 'FALLA'}  ${r.caso.padEnd(ancho)}  ${status}  ${String(r.ms).padStart(5)} ms${detalle}`);
    }
  }
  const correctos = resultados.filter((r) => r.correcto).length;
  entorno.salida(`\n${correctos} de ${resultados.length} casos respondieron como se esperaba.`);
  if (resultados.some((r) => r.caso === 'repetida' && r.correcto)) {
    entorno.salida('El caso «repetida» envió dos veces la misma entrega: revise en su registro que la procesó una sola vez.');
  }
}

export async function webhooksProbar(argumentos: string[], entorno: Entorno): Promise<number> {
  if (argumentos.some((a) => a === '--secreto' || a.startsWith('--secreto='))) {
    throw new ErrorDeUso('El secreto no va en una opción: defínalo en ENROLAMIENTO_WEBHOOK_SECRETO.');
  }
  const { values } = parseArgs({
    args: argumentos,
    options: {
      url: { type: 'string', default: URL_POR_OMISION },
      caso: { type: 'string', multiple: true },
      listar: { type: 'boolean', default: false },
      'permitir-remoto': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: false,
    strict: true,
  });

  const casos = elegirCasos(values.caso);
  if (values.listar) {
    const lista = casos.map(({ nombre, espera, descripcion }) => ({ caso: nombre, espera, descripcion }));
    if (values.json) entorno.salida(JSON.stringify(lista, null, 2));
    else for (const c of lista) entorno.salida(`${c.caso.padEnd(34)} ${c.espera.padEnd(9)} ${c.descripcion}`);
    return SALIDA.bien;
  }

  const url = leerDestino(values.url, values['permitir-remoto']);
  const secreto = entorno.env['ENROLAMIENTO_WEBHOOK_SECRETO'];
  if (!secreto) {
    throw new ErrorDeUso(
      'Falta ENROLAMIENTO_WEBHOOK_SECRETO: use el mismo valor con el que corre su receptor. Para probar puede ser cualquier texto.',
    );
  }

  const resultados: ResultadoDeCaso[] = [];
  let sinReceptor = false;
  for (const elCaso of casos) {
    const { sinRespuesta, ...resultado } = await correr(elCaso, url, secreto, entorno);
    // Si el primer envío no conecta, no hay nadie escuchando: no tiene sentido seguir. Después del primero, una
    // conexión cortada es la respuesta del receptor a ese caso.
    sinReceptor = resultados.length === 0 && sinRespuesta === 'conexion';
    if (sinReceptor) break;
    resultados.push(resultado);
  }

  const correctos = resultados.filter((r) => r.correcto).length;
  const informe = { url: paraMostrar(url), conecto: !sinReceptor, correctos, total: resultados.length, casos: resultados };
  if (sinReceptor) entorno.error(`No se pudo conectar con ${paraMostrar(url)}: ¿está corriendo su receptor en esa dirección?`);
  if (values.json) entorno.salida(JSON.stringify(informe, null, 2));
  else if (!sinReceptor) imprimir(url, resultados, entorno);
  return !sinReceptor && correctos === resultados.length ? SALIDA.bien : SALIDA.falla;
}
