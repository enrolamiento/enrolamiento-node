// Genera src/generated desde contract/openapi.json:
// - operations.ts: lo que el SDK necesita saber de cada operación (tipo `Operacion`).
// - enums.ts: un objeto `as const` y su tipo por cada esquema con `x-enum-varnames`.
// - schema.ts: los tipos de esquemas y operaciones, con openapi-typescript (solo tipos).
//
// Uso: node scripts/generate.mjs [--out <directorio>]
// Sin --out escribe en src/generated. La salida es determinista: el mismo
// contrato produce los mismos bytes.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NOMBRES_DE_ENUM, OVERRIDES } from './overrides.mjs';

/** @typedef {import('./overrides.mjs').Override} Override */

const CONTRATO = fileURLToPath(new URL('../contract/openapi.json', import.meta.url));
const SALIDA = fileURLToPath(new URL('../src/generated', import.meta.url));
const ENCABEZADO =
  '// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.\n';

const METODOS = ['get', 'post', 'put', 'delete'];
const IDENTIFICADOR = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
/** Globales de JavaScript que un enum exportado taparía en el módulo que lo importe por nombre. */
const GLOBALES = new Set([
  'Set',
  'Map',
  'Object',
  'Array',
  'Promise',
  'Error',
  'Date',
  'Symbol',
  'Number',
  'String',
  'Boolean',
]);

/**
 * Genera `operations.ts` y `enums.ts` desde el contrato. Lanza un `Error` que lista todo lo que el contrato
 * tiene y el generador no sabe traducir, con la operación de cada problema.
 * @param {any} contrato el contrato OpenAPI ya parseado
 * @param {Readonly<Record<string, Override>>} overrides
 * @param {Readonly<Record<string, string>>} [nombresDeEnum] nombre de exportación de un enum, por nombre de esquema
 * @returns {Record<string, string>} contenido de cada archivo, por nombre
 */
export function generar(contrato, overrides, nombresDeEnum = {}) {
  /** @type {string[]} */
  const errores = [];
  const operaciones = leerOperaciones(contrato, overrides, errores);
  const ids = new Set(operaciones.map((op) => op.id));
  for (const id of Object.keys(overrides).sort()) {
    if (!ids.has(id)) errores.push(`${id}: el override nombra una operación que no existe en el contrato (o es un alias)`);
  }
  const enums = leerEnums(contrato, nombresDeEnum, errores);
  if (errores.length > 0) {
    throw new Error(`El contrato no se puede generar:\n- ${errores.join('\n- ')}`);
  }
  return {
    'operations.ts': escribirOperaciones(String(contrato.info?.version), operaciones),
    'enums.ts': escribirEnums(enums),
  };
}

/**
 * Genera `schema.ts` con openapi-typescript: solo tipos, para que `tsc` emita su declaración en `dist`.
 * @param {any} contrato
 * @returns {Promise<string>}
 */
export async function generarEsquema(contrato) {
  const { default: openapiTS, astToString } = await import('openapi-typescript');
  const texto = astToString(await openapiTS(structuredClone(contrato)));
  return ENCABEZADO + '\n' + (texto.endsWith('\n') ? texto : texto + '\n');
}

/**
 * Sigue un `$ref` local (`#/...`) hasta el objeto que nombra. Devuelve `undefined` y anota el error si no existe.
 * @param {any} contrato
 * @param {any} valor
 * @param {string} contexto para el mensaje de error
 * @param {string[]} errores
 * @returns {any}
 */
function resolver(contrato, valor, contexto, errores) {
  for (let saltos = 0; valor && typeof valor.$ref === 'string'; saltos++) {
    const ref = valor.$ref;
    if (!ref.startsWith('#/') || saltos > 20) {
      errores.push(`${contexto}: no se puede resolver ${ref}`);
      return undefined;
    }
    valor = ref
      .slice(2)
      .split('/')
      .map((/** @type {string} */ parte) => parte.replaceAll('~1', '/').replaceAll('~0', '~'))
      .reduce(
        (/** @type {any} */ objeto, /** @type {string} */ clave) => (objeto == null ? undefined : objeto[clave]),
        contrato,
      );
    if (valor === undefined) {
      errores.push(`${contexto}: ${ref} no existe`);
      return undefined;
    }
  }
  return valor;
}

/**
 * @typedef {object} OperacionLeida
 * @property {string} id
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE'} metodo
 * @property {string} ruta
 * @property {string[]} enRuta
 * @property {string[]} enQuery
 * @property {Record<string, string>} enCabecera
 * @property {'ninguno' | 'plano'} cuerpo
 * @property {boolean} idempotente
 * @property {'no' | 'query' | 'ruta'} ambiente
 * @property {boolean} ambienteObligatorio
 * @property {Readonly<Record<string, string>>} queryFija
 * @property {{ automatico: string[], manual: string[], nunca: string[] }} reintentable
 */

/**
 * Las operaciones del contrato sin alias, ordenadas por `operationId`.
 * @param {any} contrato
 * @param {Readonly<Record<string, Override>>} overrides
 * @param {string[]} errores
 * @returns {OperacionLeida[]}
 */
function leerOperaciones(contrato, overrides, errores) {
  /** @type {OperacionLeida[]} */
  const operaciones = [];
  for (const [ruta, item] of Object.entries(contrato.paths ?? {})) {
    for (const [clave, op] of Object.entries(item ?? {})) {
      if (!op || typeof op !== 'object' || typeof op.operationId !== 'string') continue;
      if (op['x-alias-de'] !== undefined) continue;
      const id = op.operationId;
      if (!METODOS.includes(clave)) {
        errores.push(`${id}: método ${clave.toUpperCase()} no soportado`);
        continue;
      }
      const metodo = /** @type {OperacionLeida['metodo']} */ (clave.toUpperCase());
      const leida = leerOperacion(contrato, id, metodo, ruta, item, op, overrides[id], errores);
      if (leida) operaciones.push(leida);
    }
  }
  return operaciones.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * @param {any} contrato
 * @param {string} id
 * @param {OperacionLeida['metodo']} metodo
 * @param {string} ruta
 * @param {any} item el path item, por sus parámetros comunes
 * @param {any} op
 * @param {Override | undefined} override
 * @param {string[]} errores
 * @returns {OperacionLeida | undefined}
 */
function leerOperacion(contrato, id, metodo, ruta, item, op, override, errores) {
  const cantidadDeErrores = errores.length;

  // Los parámetros de la operación pisan a los del path item con el mismo nombre y lugar.
  /** @type {Map<string, any>} */
  const parametros = new Map();
  for (const crudo of [...(item.parameters ?? []), ...(op.parameters ?? [])]) {
    const p = resolver(contrato, crudo, id, errores);
    if (p && typeof p.name === 'string' && typeof p.in === 'string') parametros.set(`${p.in}:${p.name}`, p);
  }
  const deRuta = new Set([...parametros.values()].filter((p) => p.in === 'path').map((p) => String(p.name)));
  const deQuery = [...parametros.values()].filter((p) => p.in === 'query').map((p) => String(p.name));

  const enRuta = [...ruta.matchAll(/\{([^}]+)\}/g)].map((m) => String(m[1]));
  for (const nombre of enRuta) {
    if (!deRuta.has(nombre)) errores.push(`${id}: {${nombre}} está en la ruta pero no es un parámetro de ruta`);
  }
  for (const nombre of deRuta) {
    if (!enRuta.includes(nombre)) errores.push(`${id}: el parámetro de ruta \`${nombre}\` no está en ${ruta}`);
  }

  const quitar = override?.quitarDeQuery ?? [];
  for (const nombre of quitar) {
    if (!deQuery.includes(nombre)) {
      errores.push(`${id}: el override quita \`${nombre}\` de la query, pero no es un parámetro de query`);
    }
  }
  const enQuery = deQuery.filter((nombre) => !quitar.includes(nombre)).sort();

  const ambienteEnRuta = deRuta.has('ambiente');
  const ambienteEnQuery = deQuery.includes('ambiente');
  if (ambienteEnRuta && ambienteEnQuery) errores.push(`${id}: \`ambiente\` está en la ruta y en la query`);
  /** @type {OperacionLeida['ambiente']} */
  const ambiente = ambienteEnRuta ? 'ruta' : ambienteEnQuery ? 'query' : 'no';
  const ambienteObligatorio = op['x-sdk-ambiente-obligatorio'] === true;
  if (ambienteObligatorio && ambiente === 'no') {
    errores.push(`${id}: x-sdk-ambiente-obligatorio sin un parámetro \`ambiente\``);
  }

  /** @type {OperacionLeida['cuerpo']} */
  let cuerpo = 'ninguno';
  /** @type {string[]} */
  let delCuerpo = [];
  if (op.requestBody !== undefined) {
    cuerpo = 'plano';
    // Una entrada en los overrides acepta el cuerpo tal como venga: sus problemas no se anotan.
    const erroresDelCuerpo = override === undefined ? errores : [];
    delCuerpo = revisarCuerpo(contrato, id, op.requestBody, [...deRuta, ...deQuery], erroresDelCuerpo);
  }

  const cabeceras = [...parametros.values()].filter((p) => p.in === 'header').map((p) => String(p.name));
  const enCabecera = leerCabeceras(id, cabeceras, [...deRuta, ...deQuery, ...delCuerpo], errores);

  const reintentable = leerReintentable(id, op['x-reintentable'], errores);

  if (errores.length > cantidadDeErrores || !reintentable) return undefined;
  return {
    id,
    metodo,
    ruta,
    enRuta,
    enQuery,
    enCabecera,
    cuerpo,
    idempotente: op['x-idempotente'] === true,
    ambiente,
    ambienteObligatorio,
    queryFija: override?.queryFija ?? {},
    reintentable,
  };
}

/**
 * El cuerpo tiene que ser un objeto JSON y ninguna de sus propiedades puede llamarse como un parámetro de ruta o
 * de query: el SDK recibe todo en un solo objeto y manda al cuerpo lo que no es de ruta ni de query.
 * @param {any} contrato
 * @param {string} id
 * @param {any} requestBody
 * @param {string[]} parametros
 * @param {string[]} errores
 * @returns {string[]} los nombres de las propiedades del cuerpo, si es un objeto
 */
function revisarCuerpo(contrato, id, requestBody, parametros, errores) {
  const cuerpo = resolver(contrato, requestBody, id, errores);
  const crudo = cuerpo?.content?.['application/json']?.schema;
  if (crudo === undefined) {
    if (cuerpo) errores.push(`${id}: el cuerpo no es application/json`);
    return [];
  }
  const esquema = resolver(contrato, crudo, id, errores);
  if (!esquema) return [];
  if (esquema.type !== 'object') {
    errores.push(`${id}: el cuerpo no es un objeto (type: ${JSON.stringify(esquema.type)})`);
    return [];
  }
  const propiedades = Object.keys(esquema.properties ?? {}).sort();
  for (const nombre of propiedades) {
    if (parametros.includes(nombre)) {
      errores.push(`${id}: la propiedad del cuerpo \`${nombre}\` se llama como un parámetro de ruta o de query`);
    }
  }
  return propiedades;
}

/**
 * Los parámetros de cabecera, por su nombre en el SDK: la cabecera sin `X-` inicial, en camelCase
 * (`X-Consultar-Sii` → `consultarSii`). Ese nombre no puede chocar con uno de ruta, de query o del cuerpo.
 * @param {string} id
 * @param {string[]} cabeceras nombres de las cabeceras en el contrato
 * @param {string[]} otros nombres de ruta, de query y del cuerpo
 * @param {string[]} errores
 * @returns {Record<string, string>} cabecera HTTP, por nombre en el SDK, con las claves ordenadas
 */
function leerCabeceras(id, cabeceras, otros, errores) {
  /** @type {[string, string][]} */
  const pares = [];
  for (const cabecera of cabeceras) {
    const nombre = cabecera
      .replace(/^x-/i, '')
      .split(/[-_]+/)
      .filter((parte) => parte !== '')
      .map((parte, i) => {
        const minusculas = parte.toLowerCase();
        return i === 0 ? minusculas : minusculas.charAt(0).toUpperCase() + minusculas.slice(1);
      })
      .join('');
    if (!IDENTIFICADOR.test(nombre)) {
      errores.push(`${id}: la cabecera ${cabecera} no da un nombre válido en el SDK (${JSON.stringify(nombre)})`);
    } else if (otros.includes(nombre) || pares.some(([otro]) => otro === nombre)) {
      errores.push(`${id}: la cabecera ${cabecera} se llamaría \`${nombre}\`, como otro parámetro o propiedad del cuerpo`);
    } else {
      pares.push([nombre, cabecera]);
    }
  }
  return Object.fromEntries(pares.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/**
 * Copia las tres listas de `x-reintentable`.
 * @param {string} id
 * @param {any} valor
 * @param {string[]} errores
 * @returns {OperacionLeida['reintentable'] | undefined}
 */
function leerReintentable(id, valor, errores) {
  /** @type {Record<string, string[]>} */
  const listas = {};
  for (const lista of ['automatico', 'manual', 'nunca']) {
    const codigos = valor?.[lista];
    if (!Array.isArray(codigos) || !codigos.every((codigo) => typeof codigo === 'string')) {
      errores.push(`${id}: x-reintentable.${lista} no es una lista de textos`);
      return undefined;
    }
    listas[lista] = [...codigos];
  }
  return { automatico: listas['automatico'] ?? [], manual: listas['manual'] ?? [], nunca: listas['nunca'] ?? [] };
}

/**
 * @typedef {object} EnumLeido
 * @property {string} nombre el de exportación
 * @property {string} esquema el del contrato
 * @property {string | undefined} descripcion
 * @property {{ nombre: string, valor: number | string, descripcion: string | undefined }[]} miembros
 */

/**
 * Los esquemas con `x-enum-varnames`, ordenados por nombre de esquema.
 * @param {any} contrato
 * @param {Readonly<Record<string, string>>} nombresDeEnum nombre de exportación, por nombre de esquema
 * @param {string[]} errores
 * @returns {EnumLeido[]}
 */
function leerEnums(contrato, nombresDeEnum, errores) {
  /** @type {EnumLeido[]} */
  const enums = [];
  const esquemas = contrato.components?.schemas ?? {};
  for (const renombrado of Object.keys(nombresDeEnum).sort()) {
    if (esquemas[renombrado]?.['x-enum-varnames'] === undefined) {
      errores.push(`esquema ${renombrado}: NOMBRES_DE_ENUM lo nombra, pero no es un enum del contrato`);
    }
  }
  /** @type {Set<string>} */
  const exportados = new Set();
  for (const nombreDeEsquema of Object.keys(esquemas).sort()) {
    const esquema = esquemas[nombreDeEsquema];
    const nombres = esquema?.['x-enum-varnames'];
    if (nombres === undefined) continue;
    const valores = esquema.enum;
    const descripciones = esquema['x-enum-descriptions'];
    const nombre = nombresDeEnum[nombreDeEsquema] ?? nombreDeEsquema;
    if (!IDENTIFICADOR.test(nombre)) {
      errores.push(`esquema ${nombreDeEsquema}: ${nombre} no sirve como identificador`);
      continue;
    }
    if (GLOBALES.has(nombre)) {
      errores.push(
        `esquema ${nombreDeEsquema}: se exportaría como ${nombre}, un global de JavaScript; ` +
          'darle otro nombre en NOMBRES_DE_ENUM',
      );
      continue;
    }
    if (exportados.has(nombre)) {
      errores.push(`esquema ${nombreDeEsquema}: otro enum ya se exporta como ${nombre}`);
      continue;
    }
    exportados.add(nombre);
    if (!Array.isArray(nombres) || !Array.isArray(valores) || nombres.length !== valores.length) {
      errores.push(`esquema ${nombreDeEsquema}: x-enum-varnames y enum no tienen el mismo largo`);
      continue;
    }
    const malNombrados = nombres.filter((n, i) => typeof n !== 'string' || !IDENTIFICADOR.test(n) || nombres.indexOf(n) !== i);
    if (malNombrados.length > 0) {
      errores.push(
        `esquema ${nombreDeEsquema}: x-enum-varnames repetidos o que no sirven como identificador: ` +
          malNombrados.join(', '),
      );
      continue;
    }
    if (!valores.every((v) => typeof v === 'number' || typeof v === 'string')) {
      errores.push(`esquema ${nombreDeEsquema}: enum tiene valores que no son números ni textos`);
      continue;
    }
    enums.push({
      nombre,
      esquema: nombreDeEsquema,
      descripcion: typeof esquema.description === 'string' ? esquema.description : undefined,
      miembros: nombres.map((n, i) => ({
        nombre: n,
        valor: valores[i],
        descripcion: Array.isArray(descripciones) && typeof descripciones[i] === 'string' ? descripciones[i] : undefined,
      })),
    });
  }
  return enums;
}

/**
 * @param {string} version
 * @param {OperacionLeida[]} operaciones
 */
function escribirOperaciones(version, operaciones) {
  const lineas = [
    ENCABEZADO,
    "import type { Operacion } from '../request.js';",
    '',
    '/** `info.version` del contrato del que salieron estas operaciones. */',
    `export const VERSION_DEL_CONTRATO = ${cadena(version)};`,
    '',
    '/** Una entrada por operación del contrato, por `operationId`. Los alias (`x-alias-de`) no están. */',
    'export const OPERACIONES: { readonly [id: string]: Operacion } = {',
  ];
  for (const op of operaciones) lineas.push(`  ${clave(op.id)}: ${literal(op, '  ')},`);
  lineas.push('};', '');
  return lineas.join('\n');
}

/** @param {EnumLeido[]} enums */
function escribirEnums(enums) {
  const lineas = [ENCABEZADO.trimEnd()];
  for (const { nombre, esquema, descripcion, miembros } of enums) {
    lineas.push('');
    const renombrado = nombre === esquema ? '' : `Esquema \`${esquema}\` del contrato.`;
    const texto = [descripcion, renombrado].filter(Boolean).join('\n\n');
    if (texto) lineas.push(comentario(texto, ''));
    lineas.push(`export const ${nombre} = {`);
    for (const miembro of miembros) {
      if (miembro.descripcion) lineas.push(comentario(miembro.descripcion, '  '));
      lineas.push(`  ${miembro.nombre}: ${literal(miembro.valor, '  ')},`);
    }
    lineas.push('} as const;', `export type ${nombre} = (typeof ${nombre})[keyof typeof ${nombre}];`);
  }
  lineas.push('');
  return lineas.join('\n');
}

/**
 * @param {string} texto
 * @param {string} sangria
 */
function comentario(texto, sangria) {
  const lineas = texto.replaceAll('*/', '*\\/').trim().split(/\r?\n/);
  if (lineas.length === 1) return `${sangria}/** ${lineas[0]} */`;
  return [`${sangria}/**`, ...lineas.map((l) => `${sangria} *${l === '' ? '' : ` ${l}`}`), `${sangria} */`].join('\n');
}

/** @param {string} texto */
function cadena(texto) {
  return `'${texto.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\r', '\\r')}'`;
}

/** @param {string} nombre */
function clave(nombre) {
  return IDENTIFICADOR.test(nombre) ? nombre : cadena(nombre);
}

/**
 * El valor como literal de TypeScript. Los arreglos van en una línea si caben en 100 columnas.
 * @param {unknown} valor
 * @param {string} sangria la de la línea donde empieza el valor
 * @returns {string}
 */
function literal(valor, sangria) {
  if (typeof valor === 'string') return cadena(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  const interior = `${sangria}  `;
  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]';
    const enLinea = `[${valor.map((v) => literal(v, interior)).join(', ')}]`;
    if (sangria.length + enLinea.length <= 100) return enLinea;
    return `[\n${valor.map((v) => `${interior}${literal(v, interior)},`).join('\n')}\n${sangria}]`;
  }
  if (valor !== null && typeof valor === 'object') {
    const entradas = Object.entries(valor);
    if (entradas.length === 0) return '{}';
    return `{\n${entradas.map(([k, v]) => `${interior}${clave(k)}: ${literal(v, interior)},`).join('\n')}\n${sangria}}`;
  }
  throw new Error(`no se puede escribir ${String(valor)} como literal`);
}

/** @param {string[]} args */
function leerSalida(args) {
  const i = args.indexOf('--out');
  if (i === -1) return SALIDA;
  const directorio = args[i + 1];
  if (!directorio) throw new Error('--out necesita un directorio');
  return resolve(directorio);
}

async function main() {
  const salida = leerSalida(process.argv.slice(2));
  const contrato = JSON.parse(await readFile(CONTRATO, 'utf8'));
  const archivos = { ...generar(contrato, OVERRIDES, NOMBRES_DE_ENUM), 'schema.ts': await generarEsquema(contrato) };
  await mkdir(salida, { recursive: true });
  for (const [nombre, texto] of Object.entries(archivos)) await writeFile(join(salida, nombre), texto);
  console.log(`${salida} escrito desde el contrato ${contrato.info?.version}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`generate: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
