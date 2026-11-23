// Baja el contrato público de la API y lo escribe en contract/openapi.json,
// con las claves ordenadas y dos espacios de sangría, para que el diff entre
// versiones muestre solo lo que cambió.
//
// Uso: node scripts/pull-contract.mjs [--from <archivo>] [--out <archivo>]
// Sin --from, lee https://developers.enrolamiento.cl/openapi.json (las pruebas
// lo cambian con la variable de entorno CONTRACT_URL). Sin --out, escribe en
// contract/openapi.json.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const URL_CONTRATO = process.env.CONTRACT_URL || 'https://developers.enrolamiento.cl/openapi.json';
const DESTINO = 'contract/openapi.json';
const ESPERA_MS = 30_000;

/**
 * Valor de la opción `nombre` (`--from`, `--out`), o undefined si no viene.
 * @param {string[]} args
 * @param {string} nombre
 */
function leerOpcion(args, nombre) {
  const i = args.indexOf(nombre);
  if (i === -1) return undefined;
  const archivo = args[i + 1];
  if (!archivo) throw new Error(`${nombre} necesita la ruta de un archivo`);
  return archivo;
}

/** @param {string | undefined} archivo */
async function leerContrato(archivo) {
  if (archivo) return JSON.parse(await readFile(archivo, 'utf8'));
  let respuesta;
  try {
    respuesta = await fetch(URL_CONTRATO, { signal: AbortSignal.timeout(ESPERA_MS) });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`${URL_CONTRATO} no respondió en ${ESPERA_MS / 1000} s`);
    }
    throw error;
  }
  if (respuesta.status !== 200) {
    throw new Error(`${URL_CONTRATO} respondió ${respuesta.status}, se esperaba 200`);
  }
  return JSON.parse(await respuesta.text());
}

/**
 * Copia el valor con las claves de cada objeto ordenadas; los arreglos
 * conservan su orden.
 * @param {unknown} valor
 * @returns {unknown}
 */
function ordenarClaves(valor) {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (valor !== null && typeof valor === 'object') {
    /** @type {Record<string, unknown>} */
    const ordenado = {};
    for (const clave of Object.keys(valor).sort()) {
      ordenado[clave] = ordenarClaves(/** @type {Record<string, unknown>} */ (valor)[clave]);
    }
    return ordenado;
  }
  return valor;
}

async function main() {
  const args = process.argv.slice(2);
  const origen = leerOpcion(args, '--from');
  const destino = leerOpcion(args, '--out') ?? DESTINO;
  const contrato = await leerContrato(origen);
  const version = contrato?.openapi;
  if (typeof version !== 'string' || !/^3\.1(\.|$)/.test(version)) {
    throw new Error(`${origen ?? URL_CONTRATO} no es un contrato OpenAPI 3.1 (openapi: ${JSON.stringify(version)})`);
  }
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, JSON.stringify(ordenarClaves(contrato), null, 2) + '\n');
  console.log(`${destino} escrito desde ${origen ?? URL_CONTRATO} (versión ${contrato.info?.version})`);
}

main().catch((error) => {
  console.error(`pull-contract: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
