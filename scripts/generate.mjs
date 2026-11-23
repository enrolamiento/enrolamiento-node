// Genera src/generated desde contract/openapi.json:
// - operations.ts: lo que el SDK necesita saber de cada operación (tipo `Operacion`).
// - enums.ts: un objeto `as const` y su tipo por cada esquema con `x-enum-varnames`.
// - schema.ts: los tipos de esquemas y operaciones, con openapi-typescript (solo tipos).
// - resources.ts: un método por operación, agrupados por x-sdk-group, y los parámetros de cada uno.
// - test/smoke/examples.generated.ts: parámetros de ejemplo de cada operación, para el humo contra Prism.
//
// Uso: node scripts/generate.mjs [--out <directorio>]
// Escribe src/generated/* y test/smoke/examples.generated.ts debajo de la raíz
// del repositorio o, con --out, debajo de <directorio>. La salida es
// determinista: el mismo contrato produce los mismos bytes.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NOMBRES_DE_ENUM, OVERRIDES } from './overrides.mjs';

/** @typedef {import('./overrides.mjs').Override} Override */

const CONTRATO = fileURLToPath(new URL('../contract/openapi.json', import.meta.url));
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
/**
 * Carpeta de cada archivo generado, relativa a la raíz; los que no están aquí van a `src/generated`.
 * @type {Readonly<Record<string, string>>}
 */
const CARPETAS = { 'examples.generated.ts': 'test/smoke' };
const ENCABEZADO =
  '// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.\n';

const METODOS = ['get', 'post', 'put', 'delete'];
const REFERENCIA = 'https://developers.enrolamiento.cl/docs/referencia/';
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
 * Nombres que un grupo de primer nivel no puede tomar: los miembros de la clase `Enrolamiento` (solo
 * `constructor`), los de `Object.prototype` y `then` (un cliente con `then` sería una promesa para `await`).
 * Una prueba comprueba que la lista cubre `Enrolamiento.prototype` y `Object.prototype`.
 */
export const MIEMBROS_DEL_CLIENTE = Object.freeze([
  ...new Set(['constructor', 'then', ...Object.getOwnPropertyNames(Object.prototype)]),
]);

/**
 * Genera `operations.ts`, `enums.ts`, `resources.ts` y `examples.generated.ts` desde el contrato. Lanza un `Error`
 * que lista todo lo que el contrato tiene y el generador no sabe traducir, con la operación de cada problema.
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
  const arbol = armarArbol(operaciones, errores);
  if (errores.length > 0) {
    throw new Error(`El contrato no se puede generar:\n- ${errores.join('\n- ')}`);
  }
  return {
    'operations.ts': escribirOperaciones(String(contrato.info?.version), operaciones),
    'enums.ts': escribirEnums(enums),
    'resources.ts': escribirRecursos(operaciones, arbol),
    'examples.generated.ts': escribirEjemplos(operaciones),
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
 * @property {string[]} enCuerpo
 * @property {'ninguno' | 'plano'} cuerpo
 * @property {boolean} idempotente
 * @property {'no' | 'query' | 'ruta'} ambiente
 * @property {boolean} ambienteObligatorio
 * @property {Readonly<Record<string, string>>} queryFija
 * @property {{ automatico: string[], manual: string[], nunca: string[] }} reintentable
 * @property {MetodoLeido} sdk lo que hace falta para el método del cliente; no va a `operations.ts`
 * @property {Record<string, unknown>} ejemplo los parámetros de ejemplo del método; no va a `operations.ts`
 */

/**
 * @typedef {object} MetodoLeido
 * @property {string[]} grupo `x-sdk-group` partido en sus puntos: `['certificaciones', 'v1']`
 * @property {string} nombre `x-sdk-name` en camelCase, sin puntos: `anulacionMasivaAnular`
 * @property {string} resumen el `summary` del contrato
 * @property {string[]} quitadosDeQuery los parámetros de query que el override no ofrece
 * @property {boolean} conObligatorios si la operación tiene algún parámetro obligatorio (fuera de `ambiente`)
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
  if (op['x-sdk-ambiente-obligatorio'] === true && ambiente === 'no') {
    errores.push(`${id}: x-sdk-ambiente-obligatorio sin un parámetro \`ambiente\``);
  }
  // Toda operación que recibe `ambiente` lo exige, la marque el contrato o no: sin él la API opera en producción.
  const ambienteObligatorio = ambiente !== 'no';

  /** @type {OperacionLeida['cuerpo']} */
  let cuerpo = 'ninguno';
  /** @type {string[]} */
  let delCuerpo = [];
  if (op.requestBody !== undefined) {
    cuerpo = 'plano';
    // Una entrada en los overrides acepta el cuerpo tal como venga: sus problemas no se anotan.
    const erroresDelCuerpo = override === undefined ? errores : [];
    delCuerpo = revisarCuerpo(contrato, id, op.requestBody, [...deRuta, ...deQuery], erroresDelCuerpo);
    // Esto falla aun con override: una propiedad `Ambiente` haría pasar una errata de `ambiente` por el cuerpo.
    for (const nombre of delCuerpo) {
      if (nombre.toLowerCase() === 'ambiente') {
        errores.push(`${id}: la propiedad del cuerpo \`${nombre}\` se llama como \`ambiente\` (sin distinguir mayúsculas)`);
      }
    }
  }

  const cabeceras = [...parametros.values()].filter((p) => p.in === 'header').map((p) => String(p.name));
  const enCabecera = leerCabeceras(id, cabeceras, [...deRuta, ...deQuery, ...delCuerpo], errores);

  const reintentable = leerReintentable(id, op['x-reintentable'], errores);
  const sdk = leerMetodo(contrato, id, op, [...parametros.values()], quitar, errores);
  if (errores.length > cantidadDeErrores || !reintentable || !sdk) return undefined;

  // Con los parámetros ya revisados: cada nombre de ruta, de query y de cabecera tiene su parámetro.
  const ejemplo = armarEjemplo(contrato, id, parametros, { enRuta, enQuery, enCabecera }, op.requestBody, errores);
  if (errores.length > cantidadDeErrores) return undefined;
  return {
    id,
    metodo,
    ruta,
    enRuta,
    enQuery,
    enCabecera,
    enCuerpo: delCuerpo,
    cuerpo,
    idempotente: op['x-idempotente'] === true,
    ambiente,
    ambienteObligatorio,
    queryFija: override?.queryFija ?? {},
    reintentable,
    sdk,
    ejemplo,
  };
}

/**
 * Los parámetros de ejemplo de una operación, en el objeto que recibe su método: los de ruta (en el orden de la
 * plantilla), los de query (ordenados), los de cabecera (por su nombre en el SDK) y las propiedades del ejemplo del
 * cuerpo. `ambiente` vale siempre 0 (homologación). Anota un error si el cuerpo es obligatorio y no trae ejemplo,
 * si su ejemplo no es un objeto o si una de sus propiedades se llama como un parámetro.
 * @param {any} contrato
 * @param {string} id
 * @param {Map<string, any>} parametros ya resueltos, por `lugar:nombre`
 * @param {{ enRuta: string[], enQuery: string[], enCabecera: Record<string, string> }} lugares
 * @param {any} requestBody
 * @param {string[]} errores
 * @returns {Record<string, unknown>}
 */
function armarEjemplo(contrato, id, parametros, { enRuta, enQuery, enCabecera }, requestBody, errores) {
  /** @type {[string, string][]} nombre en el SDK y clave del parámetro */
  const claves = [
    ...enRuta.map((nombre) => /** @type {[string, string]} */ ([nombre, `path:${nombre}`])),
    ...enQuery.map((nombre) => /** @type {[string, string]} */ ([nombre, `query:${nombre}`])),
    ...Object.entries(enCabecera).map(
      ([nombre, cabecera]) => /** @type {[string, string]} */ ([nombre, `header:${cabecera}`]),
    ),
  ];
  /** @type {Record<string, unknown>} */
  const ejemplo = {};
  for (const [nombre, claveDelParametro] of claves) {
    ejemplo[nombre] = valorDeEjemplo(contrato, id, parametros.get(claveDelParametro), errores);
  }

  if (requestBody === undefined) return ejemplo;
  const cuerpo = resolver(contrato, requestBody, id, []);
  const contenido = cuerpo?.content?.['application/json'];
  const delCuerpo = contenido === undefined ? undefined : primerEjemplo(contrato, id, contenido, errores);
  if (delCuerpo === undefined) {
    if (cuerpo?.required === true) {
      errores.push(`${id}: el cuerpo es obligatorio y el contrato no trae un ejemplo de él para examples.generated.ts`);
    }
    return ejemplo;
  }
  if (delCuerpo === null || typeof delCuerpo !== 'object' || Array.isArray(delCuerpo)) {
    errores.push(`${id}: el ejemplo del cuerpo no es un objeto`);
    return ejemplo;
  }
  for (const [nombre, valor] of Object.entries(delCuerpo)) {
    if (Object.hasOwn(ejemplo, nombre)) {
      errores.push(`${id}: el ejemplo del cuerpo trae \`${nombre}\`, que se llama como un parámetro`);
    } else {
      ejemplo[nombre] = valor;
    }
  }
  return ejemplo;
}

/**
 * El valor de ejemplo de un parámetro: 0 para `ambiente`; si no, el `example` del parámetro o de su esquema (o el
 * primero de sus `examples`); si no hay, `'11111111-1'` si el nombre contiene «rut», 1 para un entero, `true` para
 * un booleano y `'x'` para lo demás.
 * @param {any} contrato
 * @param {string} id
 * @param {any} parametro ya resuelto
 * @param {string[]} errores
 * @returns {unknown}
 */
function valorDeEjemplo(contrato, id, parametro, errores) {
  if (parametro.name === 'ambiente') return 0;
  const esquema = resolver(contrato, parametro.schema, id, []);
  const delContrato = primerEjemplo(contrato, id, parametro, errores) ?? primerEjemplo(contrato, id, esquema, errores);
  if (delContrato !== undefined) return delContrato;
  if (/rut/i.test(parametro.name)) return '11111111-1';
  if (esquema?.type === 'integer') return 1;
  if (esquema?.type === 'boolean') return true;
  return 'x';
}

/**
 * El `example` de un objeto del contrato (parámetro, esquema o media type) o el primero de sus `examples`: el
 * primer elemento si es una lista (JSON Schema) o el `value` del primero si es un mapa (OpenAPI).
 * @param {any} contrato
 * @param {string} id
 * @param {any} objeto
 * @param {string[]} errores
 * @returns {unknown} `undefined` si no trae ninguno
 */
function primerEjemplo(contrato, id, objeto, errores) {
  if (objeto === null || typeof objeto !== 'object') return undefined;
  if (objeto.example !== undefined) return objeto.example;
  const { examples } = objeto;
  if (Array.isArray(examples)) return examples[0];
  if (examples === null || typeof examples !== 'object') return undefined;
  const primero = Object.values(examples)[0];
  return primero === undefined ? undefined : resolver(contrato, primero, id, errores)?.value;
}

/**
 * Dónde queda el método en el cliente (`x-sdk-group` y `x-sdk-name`), su JSDoc y si exige parámetros.
 * Obligatorio es todo parámetro de ruta, todo parámetro de query o de cabecera con `required: true` y el
 * cuerpo con `required: true` si su esquema tiene propiedades obligatorias. `ambiente` nunca lo es: el núcleo
 * lo exige donde hace falta y puede venir de las opciones del cliente.
 * @param {any} contrato
 * @param {string} id
 * @param {any} op
 * @param {any[]} parametros ya resueltos
 * @param {readonly string[]} quitados de la query por el override
 * @param {string[]} errores
 * @returns {MetodoLeido | undefined}
 */
function leerMetodo(contrato, id, op, parametros, quitados, errores) {
  const cantidadDeErrores = errores.length;
  const grupoCrudo = op['x-sdk-group'];
  const grupo = typeof grupoCrudo === 'string' ? grupoCrudo.split('.') : [];
  if (grupo.length === 0 || !grupo.every((parte) => IDENTIFICADOR.test(parte))) {
    errores.push(`${id}: x-sdk-group ${JSON.stringify(grupoCrudo)} no da un grupo válido en el SDK`);
  }
  const nombreCrudo = op['x-sdk-name'];
  const nombre =
    typeof nombreCrudo === 'string'
      ? nombreCrudo
          .split(/[._]/)
          .map((parte, i) => (i === 0 ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
          .join('')
      : '';
  if (!IDENTIFICADOR.test(nombre)) {
    errores.push(`${id}: x-sdk-name ${JSON.stringify(nombreCrudo)} no da un nombre de método válido en el SDK`);
  }
  const resumen = typeof op.summary === 'string' ? op.summary.trim() : '';
  if (resumen === '') errores.push(`${id}: falta el summary, que es la documentación del método`);

  const parametroObligatorio = parametros.some(
    (p) =>
      p.name !== 'ambiente' &&
      !quitados.includes(p.name) &&
      (p.in === 'path' || ((p.in === 'query' || p.in === 'header') && p.required === true)),
  );
  const cuerpo = op.requestBody === undefined ? undefined : resolver(contrato, op.requestBody, id, []);
  const esquema = resolver(contrato, cuerpo?.content?.['application/json']?.schema, id, []);
  const cuerpoObligatorio =
    cuerpo?.required === true && Array.isArray(esquema?.required) && esquema.required.length > 0;

  if (errores.length > cantidadDeErrores) return undefined;
  return {
    grupo,
    nombre,
    resumen,
    quitadosDeQuery: [...quitados],
    conObligatorios: parametroObligatorio || cuerpoObligatorio,
  };
}

/**
 * @typedef {object} Grupo
 * @property {Map<string, Grupo>} grupos
 * @property {Map<string, OperacionLeida>} metodos
 */

/**
 * Los grupos del cliente con sus métodos. Anota un error si dos operaciones dan el mismo método, si un método
 * se llama como un grupo del mismo nivel, si un grupo de primer nivel se llama como un miembro del cliente
 * (`MIEMBROS_DEL_CLIENTE`) o si un grupo o un método se llama `__proto__`.
 * @param {OperacionLeida[]} operaciones
 * @param {string[]} errores
 * @returns {Grupo}
 */
function armarArbol(operaciones, errores) {
  /** @type {Grupo} */
  const raiz = { grupos: new Map(), metodos: new Map() };
  for (const op of operaciones) {
    const primero = op.sdk.grupo[0] ?? '';
    if (MIEMBROS_DEL_CLIENTE.includes(primero)) {
      errores.push(`${op.id}: el grupo ${primero} se llama como un miembro del cliente`);
      continue;
    }
    if ([...op.sdk.grupo, op.sdk.nombre].includes('__proto__')) {
      errores.push(`${op.id}: __proto__ no sirve como grupo ni como método`);
      continue;
    }
    let grupo = raiz;
    for (const parte of op.sdk.grupo) {
      let hijo = grupo.grupos.get(parte);
      if (!hijo) {
        hijo = { grupos: new Map(), metodos: new Map() };
        grupo.grupos.set(parte, hijo);
      }
      grupo = hijo;
    }
    const camino = [...op.sdk.grupo, op.sdk.nombre].join('.');
    const otra = grupo.metodos.get(op.sdk.nombre);
    if (otra) errores.push(`${op.id}: el método ${camino} ya es de ${otra.id}`);
    else grupo.metodos.set(op.sdk.nombre, op);
  }
  /** @param {Grupo} grupo @param {string[]} prefijo */
  const revisar = (grupo, prefijo) => {
    for (const [nombre, hijo] of grupo.grupos) {
      const metodo = grupo.metodos.get(nombre);
      if (metodo) errores.push(`${metodo.id}: el método ${[...prefijo, nombre].join('.')} se llama como un grupo`);
      revisar(hijo, [...prefijo, nombre]);
    }
  };
  revisar(raiz, []);
  return raiz;
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
  for (const { sdk, ejemplo, ...op } of operaciones) lineas.push(`  ${clave(op.id)}: ${literal(op, '  ')},`);
  lineas.push('};', '');
  return lineas.join('\n');
}

/**
 * `resources.ts`: los parámetros de cada operación (`ParamsDeOperacion`), la forma del cliente (`Recursos`, con la
 * documentación de cada método) y `recursos(pedir)`, que la arma.
 * @param {OperacionLeida[]} operaciones
 * @param {Grupo} arbol
 */
function escribirRecursos(operaciones, arbol) {
  const lineas = [
    ENCABEZADO,
    "import type { OpcionesDePedido, Pedir, PromesaDeApi } from '../request.js';",
    "import type { ParamsDe, ParamsDelContrato, RespuestaDe } from '../types.js';",
    "import { OPERACIONES } from './operations.js';",
    '',
    '/**',
    ' * Los parámetros de cada método, por `operationId`: ruta, query, cabeceras (por su nombre en el SDK) y las',
    ' * propiedades del cuerpo, en un solo objeto. Se leen con `ParamsDe<Id>`.',
    ' */',
    'export interface ParamsDeOperacion {',
  ];
  for (const op of operaciones) {
    const argumentos = [cadena(op.id)];
    const cabeceras = Object.entries(op.enCabecera).map(([sdk, http]) => `${cadena(http)}: ${cadena(sdk)}`);
    const quitados = op.sdk.quitadosDeQuery.map(cadena).join(' | ');
    // Los argumentos opcionales van en orden: si hay quitados, las cabeceras se escriben aunque sean `{}`.
    if (cabeceras.length > 0 || quitados !== '') {
      argumentos.push(cabeceras.length > 0 ? `{ ${cabeceras.join(', ')} }` : '{}');
    }
    if (quitados !== '') argumentos.push(quitados);
    lineas.push(`  ${clave(op.id)}: ParamsDelContrato<${argumentos.join(', ')}>;`);
  }
  lineas.push('}', '');

  lineas.push(
    '/** Los grupos de métodos del cliente, uno por `x-sdk-group` del contrato. */',
    'export interface Recursos {',
  );
  escribirFormaDeGrupo(arbol, '  ', lineas);
  lineas.push('}', '');

  lineas.push(
    '/** Arma los grupos de métodos del cliente sobre `pedir`, que envía cada operación. */',
    'export function recursos(pedir: Pedir): Recursos {',
    '  return {',
  );
  escribirGrupo(arbol, '    ', lineas);
  lineas.push('  };', '}', '');
  return lineas.join('\n');
}

/**
 * Los miembros de un grupo en la interfaz `Recursos`: sus subgrupos (de solo lectura) y sus métodos con su JSDoc.
 * @param {Grupo} grupo
 * @param {string} sangria
 * @param {string[]} lineas
 */
function escribirFormaDeGrupo(grupo, sangria, lineas) {
  for (const [nombre, hijo] of ordenadas(grupo.grupos)) {
    lineas.push(`${sangria}readonly ${clave(nombre)}: {`);
    escribirFormaDeGrupo(hijo, `${sangria}  `, lineas);
    lineas.push(`${sangria}};`);
  }
  for (const [nombre, op] of ordenadas(grupo.metodos)) {
    const id = cadena(op.id);
    lineas.push(
      comentario(`${op.sdk.resumen}\n\nOperación \`${op.id}\` del contrato.\n\n@see ${REFERENCIA}`, sangria),
      `${sangria}${clave(nombre)}(`,
      `${sangria}  params${op.sdk.conObligatorios ? '' : '?'}: ParamsDe<${id}>,`,
      `${sangria}  opciones?: OpcionesDePedido,`,
      `${sangria}): PromesaDeApi<RespuestaDe<${id}>>;`,
    );
  }
}

/**
 * Los miembros de un grupo en el objeto que devuelve `recursos(pedir)`.
 * @param {Grupo} grupo
 * @param {string} sangria
 * @param {string[]} lineas
 */
function escribirGrupo(grupo, sangria, lineas) {
  for (const [nombre, hijo] of ordenadas(grupo.grupos)) {
    lineas.push(`${sangria}${clave(nombre)}: {`);
    escribirGrupo(hijo, `${sangria}  `, lineas);
    lineas.push(`${sangria}},`);
  }
  for (const [nombre, op] of ordenadas(grupo.metodos)) {
    // `?? {}`: quien llama desde JavaScript sin argumentos recibe el ErrorDeConfiguracion del núcleo.
    lineas.push(
      `${sangria}${clave(nombre)}: (params, opciones) =>`,
      `${sangria}  pedir(OPERACIONES[${cadena(op.id)}], params ?? {}, opciones),`,
    );
  }
}

/**
 * Las entradas de un mapa ordenadas por clave, para que la salida no dependa del orden del contrato.
 * @template T
 * @param {Map<string, T>} mapa
 * @returns {[string, T][]}
 */
function ordenadas(mapa) {
  return [...mapa].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * `examples.generated.ts`: los parámetros de ejemplo de cada operación (`EJEMPLOS`), por `operationId`.
 * @param {OperacionLeida[]} operaciones
 */
function escribirEjemplos(operaciones) {
  const lineas = [
    ENCABEZADO,
    '/**',
    ' * Parámetros de ejemplo de cada operación, por `operationId`, en el objeto que recibe su método: el `example` del',
    " * contrato, o `'11111111-1'` para un RUT, `1` para un entero, `true` para un booleano y `'x'` para lo demás;",
    ' * `ambiente` siempre 0, y las propiedades del ejemplo del cuerpo. Los usa el humo contra Prism.',
    ' */',
    'export const EJEMPLOS: { readonly [id: string]: Readonly<Record<string, unknown>> } = {',
  ];
  for (const op of operaciones) lineas.push(`  ${clave(op.id)}: ${literal(op.ejemplo, '  ')},`);
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
 * El valor como literal de TypeScript. Los arreglos van en una línea si caben en 100 columnas y ningún elemento
 * ocupa más de una.
 * @param {unknown} valor
 * @param {string} sangria la de la línea donde empieza el valor
 * @returns {string}
 */
function literal(valor, sangria) {
  if (valor === null) return 'null';
  if (typeof valor === 'string') return cadena(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  const interior = `${sangria}  `;
  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]';
    const enLinea = `[${valor.map((v) => literal(v, interior)).join(', ')}]`;
    if (!enLinea.includes('\n') && sangria.length + enLinea.length <= 100) return enLinea;
    return `[\n${valor.map((v) => `${interior}${literal(v, interior)},`).join('\n')}\n${sangria}]`;
  }
  if (valor !== null && typeof valor === 'object') {
    const entradas = Object.entries(valor);
    if (entradas.length === 0) return '{}';
    return `{\n${entradas.map(([k, v]) => `${interior}${clave(k)}: ${literal(v, interior)},`).join('\n')}\n${sangria}}`;
  }
  throw new Error(`no se puede escribir ${String(valor)} como literal`);
}

/**
 * La raíz debajo de la que se escriben los archivos: la del repositorio o la de `--out`.
 * @param {string[]} args
 */
function leerSalida(args) {
  const i = args.indexOf('--out');
  if (i === -1) return RAIZ;
  const directorio = args[i + 1];
  if (!directorio) throw new Error('--out necesita un directorio');
  return resolve(directorio);
}

async function main() {
  const salida = leerSalida(process.argv.slice(2));
  const contrato = JSON.parse(await readFile(CONTRATO, 'utf8'));
  const archivos = { ...generar(contrato, OVERRIDES, NOMBRES_DE_ENUM), 'schema.ts': await generarEsquema(contrato) };
  for (const [nombre, texto] of Object.entries(archivos)) {
    const carpeta = join(salida, CARPETAS[nombre] ?? 'src/generated');
    await mkdir(carpeta, { recursive: true });
    await writeFile(join(carpeta, nombre), texto);
  }
  console.log(`Archivos generados debajo de ${salida} desde el contrato ${contrato.info?.version}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`generate: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
