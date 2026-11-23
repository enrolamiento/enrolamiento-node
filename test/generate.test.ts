import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { MIEMBROS_DEL_CLIENTE, generar } from '../scripts/generate.mjs';
import Enrolamiento from '../src/client.js';
import { NOMBRES_DE_ENUM, OVERRIDES } from '../scripts/overrides.mjs';
import * as enums from '../src/generated/enums.js';
import { Ambiente } from '../src/generated/enums.js';
import { OPERACIONES, VERSION_DEL_CONTRATO } from '../src/generated/operations.js';
import { EJEMPLOS } from './smoke/examples.generated.js';

const CONTRATO = JSON.parse(readFileSync('contract/openapi.json', 'utf8'));

/** Sigue los `$ref` locales del contrato hasta el objeto que nombran. */
function resolver(valor: any): any {
  while (valor && typeof valor.$ref === 'string') {
    valor = valor.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((objeto: any, clave: string) => objeto[clave], CONTRATO);
  }
  return valor;
}

/** Cada operación del contrato con sus parámetros (los del path item y los propios) ya resueltos. */
function operacionesDelContrato(): { id: string; op: any; parametros: any[] }[] {
  const lista = [];
  for (const item of Object.values<any>(CONTRATO.paths)) {
    for (const op of Object.values<any>(item)) {
      if (!op?.operationId) continue;
      const parametros = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolver);
      lista.push({ id: op.operationId as string, op, parametros });
    }
  }
  return lista;
}

test('una entrada por operación sin alias', () => {
  const sinAlias = operacionesDelContrato().filter(({ op }) => op['x-alias-de'] === undefined);
  expect(Object.keys(OPERACIONES)).toHaveLength(34);
  expect(Object.keys(OPERACIONES).sort()).toEqual(sinAlias.map(({ id }) => id).sort());
  expect(OPERACIONES).not.toHaveProperty('empresas_v1_consultar');
  for (const [id, op] of Object.entries(OPERACIONES)) expect(op.id).toBe(id);
});

test('caf_v1_descargar', () =>
  expect(OPERACIONES.caf_v1_descargar).toMatchObject({
    metodo: 'POST',
    ruta: '/v1/caf/{rut}/descargar/{tipoDocumento}/{cantidad}',
    enRuta: ['rut', 'tipoDocumento', 'cantidad'],
    enQuery: ['ambiente', 'descargarCafAntiguos', 'ultimoFolio'],
    enCabecera: { consultarSii: 'X-Consultar-Sii' },
    cuerpo: 'plano',
    idempotente: false,
    ambiente: 'query',
    ambienteObligatorio: true,
    queryFija: {},
  }));

test('x-idempotente "desconocido" es idempotente false', () => {
  expect(OPERACIONES.certificaciones_v2_iniciar!.idempotente).toBe(false);
  for (const { id, op } of operacionesDelContrato()) {
    if (OPERACIONES[id]) expect(OPERACIONES[id].idempotente, id).toBe(op['x-idempotente'] === true);
  }
});

test('empresas_v1_permisos lleva ambiente en la ruta', () => {
  expect(OPERACIONES.empresas_v1_permisos).toMatchObject({
    ruta: '/v1/empresas/{rutEmpresa}/permisos/{rutUsuario}/{ambiente}',
    enRuta: ['rutEmpresa', 'rutUsuario', 'ambiente'],
    enQuery: [],
    ambiente: 'ruta',
  });
});

test('ambiente: query o ruta en toda operación que tiene un parámetro ambiente, no en las demás', () => {
  const cuenta = { no: 0, query: 0, ruta: 0 };
  for (const { id, parametros } of operacionesDelContrato()) {
    if (!OPERACIONES[id]) continue;
    const lugar = parametros.find((p) => p.name === 'ambiente' && (p.in === 'query' || p.in === 'path'))?.in;
    const esperado = lugar === 'query' ? 'query' : lugar === 'path' ? 'ruta' : 'no';
    expect(OPERACIONES[id].ambiente, id).toBe(esperado);
    cuenta[esperado]++;
  }
  expect(cuenta).toEqual({ no: 20, query: 13, ruta: 1 });
});

test('ambienteObligatorio es true en toda operación que recibe ambiente, la marque el contrato o no', () => {
  let marcadas = 0;
  for (const { id, op } of operacionesDelContrato()) {
    if (!OPERACIONES[id]) continue;
    expect(OPERACIONES[id].ambienteObligatorio, id).toBe(OPERACIONES[id].ambiente !== 'no');
    if (op['x-sdk-ambiente-obligatorio'] === true) {
      marcadas++;
      expect(OPERACIONES[id].ambienteObligatorio, id).toBe(true);
    }
  }
  expect(marcadas).toBe(3);
  expect(Object.values(OPERACIONES).filter((op) => op.ambienteObligatorio)).toHaveLength(14);
});

test('enCuerpo: las propiedades del esquema del cuerpo, ordenadas; [] sin cuerpo', () => {
  for (const { id, op } of operacionesDelContrato()) {
    if (!OPERACIONES[id]) continue;
    const esquema = resolver(resolver(op.requestBody)?.content?.['application/json']?.schema);
    const esperadas = Object.keys(esquema?.properties ?? {}).sort();
    expect(OPERACIONES[id].enCuerpo, id).toEqual(esperadas);
    if (!op.requestBody) expect(OPERACIONES[id].enCuerpo, id).toEqual([]);
  }
  expect(OPERACIONES.caf_v1_descargar!.enCuerpo).toEqual(['Contrasenna', 'Data']);
  expect(OPERACIONES.certificaciones_v1_consultar!.enCuerpo).toEqual([]);
});

test('enCabecera: los parámetros de cabecera, sin X- y en camelCase', () => {
  expect(OPERACIONES.caf_v1_anulacion_masiva_anular!.enCabecera).toEqual({ consultarSii: 'X-Consultar-Sii' });
  expect(OPERACIONES.caf_v1_descargar!.enCabecera).toEqual({ consultarSii: 'X-Consultar-Sii' });
  for (const { id, parametros } of operacionesDelContrato()) {
    if (!OPERACIONES[id]) continue;
    const cabeceras = parametros.filter((p) => p.in === 'header').map((p) => p.name);
    expect(Object.values(OPERACIONES[id].enCabecera).sort(), id).toEqual(cabeceras.sort());
  }
});

test('reintentable copia las tres listas del contrato', () => {
  expect(OPERACIONES.caf_v1_descargar!.reintentable.automatico).toEqual(expect.arrayContaining(['409', '429']));
  for (const { id, op } of operacionesDelContrato()) {
    if (OPERACIONES[id]) expect(OPERACIONES[id].reintentable, id).toEqual(op['x-reintentable']);
  }
});

test('enRuta sigue el orden de la plantilla y enQuery va ordenado', () => {
  for (const op of Object.values(OPERACIONES)) {
    expect(op.enRuta, op.id).toEqual([...op.ruta.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]));
    expect(op.enQuery, op.id).toEqual([...op.enQuery].sort());
  }
});

test('respaldos_v1_descargar: queryFija { formato: "json" } y formato fuera de enQuery', () => {
  expect(OPERACIONES.respaldos_v1_descargar).toMatchObject({ queryFija: { formato: 'json' }, enQuery: [] });
  for (const op of Object.values(OPERACIONES)) {
    if (op.id !== 'respaldos_v1_descargar') expect(op.queryFija, op.id).toEqual({});
  }
});

test('cuerpo plano en las operaciones con cuerpo JSON, ninguno en las demás', () => {
  const cuenta = { ninguno: 0, plano: 0 };
  for (const { id, op } of operacionesDelContrato()) {
    if (!OPERACIONES[id]) continue;
    expect(OPERACIONES[id].cuerpo, id).toBe(op.requestBody ? 'plano' : 'ninguno');
    cuenta[OPERACIONES[id].cuerpo]++;
  }
  expect(cuenta).toEqual({ ninguno: 7, plano: 27 });
});

test('VERSION_DEL_CONTRATO es info.version del contrato', () => {
  expect(VERSION_DEL_CONTRATO).toBe(CONTRATO.info.version);
});

test('Ambiente.Homologacion es 0 y Ambiente.Produccion es 1', () => {
  expect(Ambiente).toEqual({ Homologacion: 0, Produccion: 1 });
  const homologacion: Ambiente = Ambiente.Homologacion;
  expect(homologacion).toBe(0);
});

test('un objeto por esquema con x-enum-varnames, con los valores del contrato', () => {
  const conNombres = Object.entries<any>(CONTRATO.components.schemas)
    .filter(([, s]) => s['x-enum-varnames'])
    .map(([nombre, esquema]) => [NOMBRES_DE_ENUM[nombre] ?? nombre, esquema] as const);
  expect(Object.keys(enums).sort()).toEqual(conNombres.map(([nombre]) => nombre).sort());
  for (const [nombre, esquema] of conNombres) {
    const esperado = Object.fromEntries(esquema['x-enum-varnames'].map((n: string, i: number) => [n, esquema.enum[i]]));
    expect((enums as Record<string, unknown>)[nombre], nombre).toEqual(esperado);
  }
});

test('el esquema Set se exporta como SetDePruebas', () => {
  expect(enums).not.toHaveProperty('Set');
  expect(enums.SetDePruebas.SetBasico).toBe(33);
  expect(enums.SetDePruebas.SetExportacion).toBe(110);
});

test('el código generado importa Operacion con import type, lleva el encabezado y no usa enum', () => {
  const operaciones = readFileSync('src/generated/operations.ts', 'utf8');
  expect(operaciones).toContain("import type { Operacion } from '../request.js';");
  for (const archivo of readdirSync('src/generated')) {
    const texto = readFileSync(join('src/generated', archivo), 'utf8');
    expect(texto.startsWith('// Generado por scripts/generate.mjs'), archivo).toBe(true);
    expect(texto, archivo).not.toMatch(/\benum\s+[A-Za-z_]/);
  }
});

test('regenerar no cambia nada', () => {
  const directorio = mkdtempSync(join(tmpdir(), 'enrolamiento-generate-'));
  try {
    execFileSync(process.execPath, ['scripts/generate.mjs', '--out', directorio], { stdio: 'pipe' });
    expect(readdirSync(directorio).sort()).toEqual(['src', 'test']);
    const generados = readdirSync(join(directorio, 'src/generated')).sort();
    expect(generados).toEqual(['enums.ts', 'operations.ts', 'resources.ts', 'schema.ts']);
    expect(readdirSync('src/generated').sort()).toEqual(generados);
    const archivos = [
      ...generados.map((archivo) => join('src/generated', archivo)),
      'test/smoke/examples.generated.ts',
    ];
    expect(readdirSync(join(directorio, 'test/smoke'))).toEqual(['examples.generated.ts']);
    for (const archivo of archivos) {
      const nuevo = readFileSync(join(directorio, archivo));
      expect(nuevo.equals(readFileSync(archivo)), archivo).toBe(true);
    }
  } finally {
    rmSync(directorio, { recursive: true, force: true });
  }
}, 60000);

/** Un contrato mínimo con una operación `x_v1_op` en `POST /v1/x/{rut}`; `op` pisa lo que haga falta. */
function contratoArmado(op: Record<string, unknown>, esquemas: Record<string, unknown> = {}) {
  return {
    openapi: '3.1.0',
    info: { title: 'x', version: '0.0.1' },
    paths: {
      '/v1/x/{rut}': {
        post: {
          operationId: 'x_v1_op',
          'x-sdk-group': 'x',
          'x-sdk-name': 'op',
          summary: 'Operación de prueba.',
          'x-idempotente': true,
          'x-reintentable': { automatico: [], manual: [], nunca: [] },
          parameters: [
            { in: 'path', name: 'rut', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'ambiente', schema: { $ref: '#/components/schemas/Ambiente' } },
          ],
          responses: { '200': { description: 'ok' } },
          ...op,
        },
      },
    },
    components: {
      schemas: {
        Ambiente: { type: 'integer', enum: [0, 1], 'x-enum-varnames': ['Homologacion', 'Produccion'] },
        ...esquemas,
      },
    },
  };
}

function conCuerpo(schema: unknown) {
  return { requestBody: { content: { 'application/json': { schema } } } };
}

test('un contrato armado a mano que no choca genera sin errores', () => {
  const archivos = generar(contratoArmado(conCuerpo({ type: 'object', properties: { Data: { type: 'string' } } })), {});
  expect(archivos['operations.ts']).toContain("cuerpo: 'plano'");
  expect(archivos['operations.ts']).toContain("enCuerpo: ['Data'],");
  expect(archivos['operations.ts']).toContain('ambienteObligatorio: true,');
  expect(archivos['operations.ts']).toContain("ambiente: 'query'");
  expect(archivos['enums.ts']).toContain('Homologacion: 0,');
});

test('falla si una propiedad del cuerpo choca con un parámetro, o si el cuerpo no es un objeto', () => {
  const chocaConRuta = contratoArmado(conCuerpo({ type: 'object', properties: { rut: { type: 'string' } } }));
  expect(() => generar(chocaConRuta, {})).toThrow(/x_v1_op.*`rut`/);

  const chocaConQuery = contratoArmado(conCuerpo({ $ref: '#/components/schemas/Cuerpo' }), {
    Cuerpo: { type: 'object', properties: { ambiente: { type: 'integer' } } },
  });
  expect(() => generar(chocaConQuery, {})).toThrow(/x_v1_op.*`ambiente`/);

  const noEsObjeto = contratoArmado(conCuerpo({ $ref: '#/components/schemas/Lista' }), {
    Lista: { type: 'array', items: { type: 'string' } },
  });
  expect(() => generar(noEsObjeto, {})).toThrow(/x_v1_op.*no es un objeto/);

  // Una entrada en los overrides acepta el cuerpo tal como venga.
  expect(() => generar(noEsObjeto, { x_v1_op: { motivo: 'prueba' } })).not.toThrow();
});

test('falla si una propiedad del cuerpo se llama `ambiente` sin distinguir mayúsculas, aun con override', () => {
  for (const nombre of ['Ambiente', 'AMBIENTE']) {
    const contrato = contratoArmado(conCuerpo({ type: 'object', properties: { [nombre]: { type: 'integer' } } }));
    expect(() => generar(contrato, {}), nombre).toThrow(new RegExp(`x_v1_op.*\`${nombre}\`.*ambiente`));
    expect(() => generar(contrato, { x_v1_op: { motivo: 'prueba' } }), nombre).toThrow(/x_v1_op.*ambiente/);
  }
  // También en una operación que no recibe ambiente.
  const sinAmbiente = contratoArmado({
    parameters: [{ in: 'path', name: 'rut', required: true, schema: { type: 'string' } }],
    ...conCuerpo({ type: 'object', properties: { ambiente: { type: 'integer' } } }),
  });
  expect(() => generar(sinAmbiente, {})).toThrow(/x_v1_op.*`ambiente`/);
});

test('falla si un grupo de primer nivel se llama como un miembro del cliente', () => {
  for (const grupo of ['constructor', 'then', 'toString', 'hasOwnProperty', '__proto__']) {
    expect(() => generar(contratoArmado({ 'x-sdk-group': grupo }), {}), grupo).toThrow(new RegExp(`x_v1_op.*${grupo}`));
  }
  // Más abajo no choca: los subgrupos son objetos comunes.
  expect(() => generar(contratoArmado({ 'x-sdk-group': 'x.then' }), {})).not.toThrow();
  // `__proto__` no sirve en ningún nivel: en un literal cambia el prototipo en vez de crear la propiedad.
  expect(() => generar(contratoArmado({ 'x-sdk-group': 'x.__proto__' }), {})).toThrow(/x_v1_op.*__proto__/);
});

test('MIEMBROS_DEL_CLIENTE cubre los miembros de Enrolamiento y de Object.prototype', () => {
  for (const nombre of [...Object.getOwnPropertyNames(Enrolamiento.prototype), ...Object.getOwnPropertyNames(Object.prototype)]) {
    expect(MIEMBROS_DEL_CLIENTE, nombre).toContain(nombre);
  }
  expect(MIEMBROS_DEL_CLIENTE).toContain('then');
});

test('falla si un override nombra una operación que no existe', () => {
  const contrato = contratoArmado({});
  expect(() => generar(contrato, { x_v1_otra: { motivo: 'prueba' } })).toThrow(/x_v1_otra/);
  expect(() => generar(contrato, { x_v1_op: { quitarDeQuery: ['formato'], motivo: 'prueba' } })).toThrow(/x_v1_op.*`formato`/);
});

test('los overrides del repo nombran operaciones generadas', () => {
  for (const id of Object.keys(OVERRIDES)) expect(OPERACIONES, id).toHaveProperty(id);
});

test('falla si el nombre de una cabecera en el SDK choca con un parámetro o con el cuerpo', () => {
  const cabecera = (name: string) => ({ in: 'header', name, schema: { type: 'string' } });
  const rutaYQuery = contratoArmado({});
  const parametros = rutaYQuery.paths['/v1/x/{rut}'].post.parameters;

  const conRut = contratoArmado({ parameters: [...parametros, cabecera('X-Rut')] });
  expect(() => generar(conRut, {})).toThrow(/x_v1_op.*X-Rut.*`rut`/);

  const conAmbiente = contratoArmado({ parameters: [...parametros, cabecera('Ambiente')] });
  expect(() => generar(conAmbiente, {})).toThrow(/x_v1_op.*Ambiente.*`ambiente`/);

  const conCuerpoQueChoca = contratoArmado({
    parameters: [...parametros, cabecera('X-Data')],
    ...conCuerpo({ type: 'object', properties: { data: { type: 'string' } } }),
  });
  expect(() => generar(conCuerpoQueChoca, {})).toThrow(/x_v1_op.*X-Data.*`data`/);
  // Aunque un override acepte el cuerpo, el choque con la cabecera sigue fallando.
  expect(() => generar(conCuerpoQueChoca, { x_v1_op: { motivo: 'prueba' } })).toThrow(/x_v1_op.*X-Data/);

  const sinChoque = contratoArmado({ parameters: [...parametros, cabecera('X-Consultar-Sii')] });
  expect(generar(sinChoque, {})['operations.ts']).toContain("consultarSii: 'X-Consultar-Sii',");
});

test('falla si un enum se exportaría con el nombre de un global de JavaScript', () => {
  const conSet = contratoArmado({}, { Set: { type: 'integer', enum: [33], 'x-enum-varnames': ['SetBasico'] } });
  expect(() => generar(conSet, {})).toThrow(/Set.*global/);
  const archivos = generar(conSet, {}, { Set: 'SetDePruebas' });
  expect(archivos['enums.ts']).toContain('export const SetDePruebas = {');
  expect(archivos['enums.ts']).not.toMatch(/export (const|type) Set\b/);
  expect(() => generar(conSet, {}, { Set: 'Map' })).toThrow(/Map.*global/);
  expect(() => generar(conSet, {}, { Set: 'SetDePruebas', Otro: 'Otro' })).toThrow(/Otro/);
});

test('resources.ts: un método por operación, con el summary, el operationId y el @see a la referencia', () => {
  const contrato = contratoArmado({
    'x-sdk-group': 'x.v1',
    'x-sdk-name': 'detalle_folios.todos',
    parameters: [
      ...contratoArmado({}).paths['/v1/x/{rut}'].post.parameters,
      { in: 'header', name: 'X-Consultar-Sii', schema: { type: 'string' } },
      { in: 'query', name: 'formato', schema: { type: 'string' } },
    ],
  });
  const archivos = generar(contrato, { x_v1_op: { queryFija: { formato: 'json' }, quitarDeQuery: ['formato'], motivo: 'prueba' } });
  const recursos = archivos['resources.ts']!;
  expect(recursos.startsWith('// Generado por scripts/generate.mjs')).toBe(true);
  expect(recursos).toContain('    detalleFoliosTodos(');
  expect(recursos).toContain('Operación de prueba.');
  expect(recursos).toContain('Operación `x_v1_op` del contrato.');
  expect(recursos).toContain('@see https://developers.enrolamiento.cl/docs/referencia/');
  expect(recursos).toContain("x_v1_op: ParamsDelContrato<'x_v1_op', { 'X-Consultar-Sii': 'consultarSii' }, 'formato'>;");
  expect(recursos).toContain(
    "detalleFoliosTodos: (params, opciones) =>\n          pedir(OPERACIONES['x_v1_op'], params ?? {}, opciones),",
  );
  // `rut` es de ruta: el método exige el objeto de parámetros.
  expect(recursos).toContain("      params: ParamsDe<'x_v1_op'>,");
});

test('resources.ts: params es opcional si la operación no tiene nada obligatorio', () => {
  const sinRuta = contratoArmado({ parameters: [{ in: 'query', name: 'ambiente', schema: { $ref: '#/components/schemas/Ambiente' } }] });
  const texto = JSON.stringify(sinRuta).replaceAll('/v1/x/{rut}', '/v1/x');
  const recursos = generar(JSON.parse(texto), {})['resources.ts']!;
  expect(recursos).toContain("    params?: ParamsDe<'x_v1_op'>,");

  const conCuerpoObligatorio = JSON.parse(texto);
  conCuerpoObligatorio.paths['/v1/x'].post.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object', required: ['Data'], properties: { Data: { type: 'string' } } },
        example: { Data: 'MIIC' },
      },
    },
  };
  expect(generar(conCuerpoObligatorio, {})['resources.ts']).toContain("    params: ParamsDe<'x_v1_op'>,");
});

test('falla sin x-sdk-group, x-sdk-name o summary, o si dos métodos quedan en el mismo lugar', () => {
  expect(() => generar(contratoArmado({ 'x-sdk-group': undefined }), {})).toThrow(/x_v1_op.*x-sdk-group/);
  expect(() => generar(contratoArmado({ 'x-sdk-name': 'no-vale' }), {})).toThrow(/x_v1_op.*x-sdk-name/);
  expect(() => generar(contratoArmado({ summary: undefined }), {})).toThrow(/x_v1_op.*summary/);

  const dos = contratoArmado({ 'x-sdk-name': 'detalle_folios' });
  (dos.paths as any)['/v1/y/{rut}'] = {
    post: { ...dos.paths['/v1/x/{rut}'].post, operationId: 'x_v1_otra', 'x-sdk-name': 'detalle.folios' },
  };
  expect(() => generar(dos, {})).toThrow(/x_v1_otra.*x\.detalleFolios.*x_v1_op/);

  const grupoYMetodo = contratoArmado({ 'x-sdk-name': 'v1' });
  (grupoYMetodo.paths as any)['/v1/y/{rut}'] = {
    post: { ...grupoYMetodo.paths['/v1/x/{rut}'].post, operationId: 'x_v1_otra', 'x-sdk-group': 'x.v1', 'x-sdk-name': 'op' },
  };
  expect(() => generar(grupoYMetodo, {})).toThrow(/x\.v1/);
});

test('examples.generated.ts: el ejemplo del contrato o uno por tipo, ambiente 0 y el cuerpo aplanado', () => {
  const parametro = (lugar: string, name: string, schema: unknown, extra: Record<string, unknown> = {}) => ({
    in: lugar,
    name,
    schema,
    ...extra,
  });
  const contrato = contratoArmado({
    parameters: [
      parametro('path', 'rut', { type: 'string' }, { required: true }),
      parametro('query', 'ambiente', { $ref: '#/components/schemas/Ambiente' }, { example: 1 }),
      parametro('query', 'cantidad', { type: 'integer' }),
      parametro('query', 'antiguos', { type: 'boolean' }),
      parametro('query', 'mensaje', { type: 'string' }),
      parametro('query', 'rutUsuario', { type: 'string' }),
      parametro('query', 'conEjemplo', { type: 'integer' }, { example: 36 }),
      parametro('query', 'conExamples', { type: 'string' }, { examples: { uno: { value: 'r33-1101' }, dos: { value: 'otro' } } }),
      parametro('query', 'enEsquema', { type: 'string', examples: ['del-esquema'] }),
      parametro('header', 'X-Consultar-Sii', { type: 'string' }, { example: 'forzar' }),
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: { type: 'object', properties: { Data: { type: 'string' }, Contrasenna: { type: 'string' } } },
          example: { Contrasenna: '********', Data: 'MIIC', Extra: null },
        },
      },
    },
  });
  expect(generar(contrato, {})['examples.generated.ts']).toBe(
    [
      '// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.',
      '',
      '/**',
      ' * Parámetros de ejemplo de cada operación, por `operationId`, en el objeto que recibe su método: el `example` del',
      " * contrato, o `'11111111-1'` para un RUT, `1` para un entero, `true` para un booleano y `'x'` para lo demás;",
      ' * `ambiente` siempre 0, y las propiedades del ejemplo del cuerpo. Los usa el humo contra Prism.',
      ' */',
      'export const EJEMPLOS: { readonly [id: string]: Readonly<Record<string, unknown>> } = {',
      '  x_v1_op: {',
      "    rut: '11111111-1',",
      '    ambiente: 0,',
      '    antiguos: true,',
      '    cantidad: 1,',
      '    conEjemplo: 36,',
      "    conExamples: 'r33-1101',",
      "    enEsquema: 'del-esquema',",
      "    mensaje: 'x',",
      "    rutUsuario: '11111111-1',",
      "    consultarSii: 'forzar',",
      "    Contrasenna: '********',",
      "    Data: 'MIIC',",
      '    Extra: null,',
      '  },',
      '};',
      '',
    ].join('\n'),
  );
});

test('examples.generated.ts: sin parámetros, un objeto vacío; el ambiente en la ruta también es 0', () => {
  const sinParametros = contratoArmado({ parameters: [] });
  const texto = JSON.stringify(sinParametros).replaceAll('/v1/x/{rut}', '/v1/x');
  expect(generar(JSON.parse(texto), {})['examples.generated.ts']).toContain('  x_v1_op: {},\n');

  const enRuta = JSON.parse(JSON.stringify(contratoArmado({})).replaceAll('/v1/x/{rut}', '/v1/x/{rut}/{ambiente}'));
  enRuta.paths['/v1/x/{rut}/{ambiente}'].post.parameters[1] = {
    in: 'path',
    name: 'ambiente',
    required: true,
    schema: { $ref: '#/components/schemas/Ambiente' },
  };
  expect(generar(enRuta, {})['examples.generated.ts']).toContain("  x_v1_op: {\n    rut: '11111111-1',\n    ambiente: 0,\n  },\n");
});

test('examples.generated.ts: un cuerpo opcional sin ejemplo se omite; uno obligatorio sin ejemplo hace fallar', () => {
  const esquema = { type: 'object', properties: { Data: { type: 'string' } } };
  const opcional = contratoArmado(conCuerpo(esquema));
  expect(generar(opcional, {})['examples.generated.ts']).toContain("  x_v1_op: {\n    rut: '11111111-1',\n    ambiente: 0,\n  },\n");

  const obligatorio = contratoArmado({ requestBody: { required: true, content: { 'application/json': { schema: esquema } } } });
  expect(() => generar(obligatorio, {})).toThrow(/x_v1_op.*cuerpo.*obligatorio.*ejemplo/);

  const conExamples = contratoArmado({
    requestBody: {
      required: true,
      content: { 'application/json': { schema: esquema, examples: { uno: { value: { Data: 'MIIC' } } } } },
    },
  });
  expect(generar(conExamples, {})['examples.generated.ts']).toContain("    Data: 'MIIC',\n");

  const noEsObjeto = contratoArmado({
    requestBody: { content: { 'application/json': { schema: esquema, example: ['MIIC'] } } },
  });
  expect(() => generar(noEsObjeto, {})).toThrow(/x_v1_op.*ejemplo del cuerpo.*objeto/);

  const choca = contratoArmado({
    requestBody: { content: { 'application/json': { schema: esquema, example: { rut: '22222222-2' } } } },
  });
  expect(() => generar(choca, {})).toThrow(/x_v1_op.*ejemplo del cuerpo.*`rut`/);
});

test('EJEMPLOS: una entrada por operación, con los nombres del SDK', () => {
  expect(Object.keys(EJEMPLOS).sort()).toEqual(Object.keys(OPERACIONES).sort());
  expect(EJEMPLOS.caf_v1_descargar).toMatchObject({ rut: '11111111-1', ambiente: 0, consultarSii: 'forzar', Data: 'MIIC' });
  expect(EJEMPLOS.empresas_v1_permisos).toMatchObject({ rutEmpresa: '11111111-1', rutUsuario: '11111111-1', ambiente: 0 });
  // `formato` lo fija el override: el método no lo recibe.
  expect(EJEMPLOS.respaldos_v1_descargar).toEqual({ id: '3f9c2a7e5b1d4c08a6e2f0b9d7c41e53' });
  expect(EJEMPLOS.certificaciones_v1_stats).toEqual({});
  for (const [id, op] of Object.entries(OPERACIONES)) {
    expect(Object.hasOwn(EJEMPLOS[id]!, 'ambiente'), id).toBe(op.ambiente !== 'no');
    if (op.ambiente !== 'no') expect(EJEMPLOS[id]!['ambiente'], id).toBe(0);
  }
});
