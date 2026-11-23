import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { generar } from '../scripts/generate.mjs';
import { NOMBRES_DE_ENUM, OVERRIDES } from '../scripts/overrides.mjs';
import * as enums from '../src/generated/enums.js';
import { Ambiente } from '../src/generated/enums.js';
import { OPERACIONES, VERSION_DEL_CONTRATO } from '../src/generated/operations.js';

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

test('ambienteObligatorio sale de x-sdk-ambiente-obligatorio', () => {
  for (const { id, op } of operacionesDelContrato()) {
    if (OPERACIONES[id]) expect(OPERACIONES[id].ambienteObligatorio, id).toBe(op['x-sdk-ambiente-obligatorio'] === true);
  }
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
    const generados = readdirSync(directorio).sort();
    expect(generados).toEqual(['enums.ts', 'operations.ts', 'schema.ts']);
    expect(readdirSync('src/generated').sort()).toEqual(generados);
    for (const archivo of generados) {
      const nuevo = readFileSync(join(directorio, archivo));
      expect(nuevo.equals(readFileSync(join('src/generated', archivo))), archivo).toBe(true);
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
