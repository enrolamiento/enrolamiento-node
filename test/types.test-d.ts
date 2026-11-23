// Pruebas de tipos: las corre `npm run typecheck` (tsc sobre tsconfig.test.json); `npm test` no las toma.
// Cada `expectTypeOf` y cada `@ts-expect-error` que no se cumple es un error de tsc. Nada de este archivo se ejecuta.
import { expectTypeOf, test } from 'vitest';
import Enrolamiento, {
  Ambiente,
  EstadoCertificacion,
  type OpcionesDePedido,
  type ParamsDe,
  type PromesaDeApi,
  type RespuestaDe,
} from '../src/index.js';
import type { components } from '../src/generated/schema.js';
import type { IdDeOperacion } from '../src/types.js';

const cliente = new Enrolamiento();
const rut = '11111111-1';

test('consultar sin rut no compila', () => {
  // @ts-expect-error falta `rut`
  expectTypeOf(cliente.certificaciones.v1.consultar).toBeCallableWith({});
  // @ts-expect-error falta el objeto de parámetros
  expectTypeOf(cliente.certificaciones.v1.consultar).toBeCallableWith();
  expectTypeOf(cliente.certificaciones.v1.consultar).toBeCallableWith({ rut });
});

test('caf.descargar compila sin cuerpo ni ambiente', () => {
  expectTypeOf(cliente.caf.descargar).toBeCallableWith({ rut, tipoDocumento: 33, cantidad: 1 });
  expectTypeOf(cliente.caf.descargar).toBeCallableWith({
    rut,
    tipoDocumento: 33,
    cantidad: 1,
    ambiente: Ambiente.Homologacion,
    ultimoFolio: 100,
    descargarCafAntiguos: true,
    consultarSii: 'forzar',
    Data: 'MIIC',
    Contrasenna: 'secreta',
  });
  // @ts-expect-error falta `cantidad`
  expectTypeOf(cliente.caf.descargar).toBeCallableWith({ rut, tipoDocumento: 33 });
  // @ts-expect-error `cantidad` es un número
  expectTypeOf(cliente.caf.descargar).toBeCallableWith({ rut, tipoDocumento: 33, cantidad: '1' });
});

test('el resultado de certificaciones.v1.consultar tiene Estado', () => {
  expectTypeOf(cliente.certificaciones.v1.consultar).returns.toEqualTypeOf<
    PromesaDeApi<RespuestaDe<'certificaciones_v1_consultar'>>
  >();
  expectTypeOf(cliente.certificaciones.v1.consultar).returns.resolves.toHaveProperty('Estado');
  expectTypeOf<RespuestaDe<'certificaciones_v1_consultar'>['Estado']>().toEqualTypeOf<
    EstadoCertificacion | undefined
  >();
});

test('un parámetro que no existe no compila', () => {
  // Llamadas directas: `toBeCallableWith` no hace el chequeo de propiedades de más de un literal.
  // @ts-expect-error `rutt` no es un parámetro
  void cliente.certificaciones.v1.consultar({ rut, rutt: rut });
  // @ts-expect-error la cabecera se llama `consultarSii` en el SDK
  void cliente.caf.descargar({ rut, tipoDocumento: 33, cantidad: 1, 'X-Consultar-Sii': 'forzar' });
  // @ts-expect-error stats no recibe parámetros
  void cliente.certificaciones.v1.stats({ pagina: 1 });
  // @ts-expect-error `data` no es `Data`: los nombres del contrato no se traducen
  void cliente.caf.descargar({ rut, tipoDocumento: 33, cantidad: 1, data: 'MIIC' });
});

test('ambiente es opcional en toda operación que lo recibe, también en la ruta, y solo 0 o 1', () => {
  expectTypeOf(cliente.empresas.permisos).toBeCallableWith({ rutEmpresa: rut, rutUsuario: rut });
  expectTypeOf(cliente.empresas.permisos).toBeCallableWith({ rutEmpresa: rut, rutUsuario: rut, ambiente: 1 });
  expectTypeOf(cliente.caf.anulacionMasivaAnular).toBeCallableWith({ rut, tipoDocumento: 33, folioInicial: 1, folioFinal: 2 });
  // @ts-expect-error ambiente es 0 o 1
  expectTypeOf(cliente.empresas.permisos).toBeCallableWith({ rutEmpresa: rut, rutUsuario: rut, ambiente: 2 });
  expectTypeOf<ParamsDe<'caf_v1_reobtener'>['ambiente']>().toEqualTypeOf<Ambiente | undefined>();
});

test('el cuerpo obligatorio exige sus propiedades obligatorias, y su tipo es el del esquema', () => {
  expectTypeOf(cliente.portabilidad.sesiones).toBeCallableWith({ rut });
  // @ts-expect-error el cuerpo de sesiones es obligatorio y `rut` también
  expectTypeOf(cliente.portabilidad.sesiones).toBeCallableWith({});
  expectTypeOf<ParamsDe<'portabilidad_v1_sesiones'>>().toEqualTypeOf<components['schemas']['NuevaSesionDePortabilidad']>();
});

test('el cuerpo opcional va entero o no va', () => {
  // Sin cuerpo.
  void cliente.caf.descargar({ rut, tipoDocumento: 33, cantidad: 1 });
  void cliente.certificaciones.v1.crear({ rut });
  // Con el cuerpo completo.
  void cliente.caf.descargar({ rut, tipoDocumento: 33, cantidad: 1, Data: 'MIIC', Contrasenna: 'secreta' });
  void cliente.certificaciones.v1.crear({ rut, CertData: 'MIIC', Contrasenna: 'secreta', TodosSets: true });
  // @ts-expect-error con `Data` el cuerpo va entero: falta `Contrasenna`
  void cliente.caf.descargar({ rut, tipoDocumento: 33, cantidad: 1, Data: 'MIIC' });
  // @ts-expect-error con `Contrasenna` el cuerpo va entero: falta `CertData`
  void cliente.certificaciones.v1.crear({ rut, Contrasenna: 'x' });
  // @ts-expect-error una propiedad opcional del cuerpo también lo trae entero
  void cliente.certificaciones.v1.crear({ rut, TodosSets: true });
  // Un cuerpo sin propiedades obligatorias se manda en parte.
  void cliente.certificaciones.v1.actualizar({ rut, Giro: 'Comercio' });
});

test('ningún ParamsDe es never ni any', () => {
  type EsAny<T> = 0 extends 1 & T ? true : false;
  type Malos = {
    [Id in IdDeOperacion]: EsAny<ParamsDe<Id>> extends true ? Id : [ParamsDe<Id>] extends [never] ? Id : never;
  }[IdDeOperacion];
  expectTypeOf<Malos>().toEqualTypeOf<never>();
  expectTypeOf<IdDeOperacion>().not.toBeNever();
});

test('los parámetros de query obligatorios se exigen', () => {
  expectTypeOf(cliente.certificaciones.v1.actualizarCasillasIntercambio).toBeCallableWith({
    rut,
    correoContactoSii: 'sii@ejemplo.cl',
    correoContactoEmpresa: 'empresa@ejemplo.cl',
  });
  // @ts-expect-error faltan los correos
  expectTypeOf(cliente.certificaciones.v1.actualizarCasillasIntercambio).toBeCallableWith({ rut });
});

test('respaldos.descargar devuelve la forma JSON y no recibe formato', () => {
  expectTypeOf(cliente.respaldos.descargar).returns.resolves.toEqualTypeOf<{ url: string; vence: string }>();
  // @ts-expect-error `formato` lo fija el SDK
  void cliente.respaldos.descargar({ id: 'r-1', formato: 'zip' });
});

test('los métodos sin parámetros obligatorios se llaman sin argumentos', () => {
  expectTypeOf(cliente.certificaciones.v1.stats).toBeCallableWith();
  expectTypeOf(cliente.respaldos.listar).toBeCallableWith();
  expectTypeOf(cliente.respaldos.listar).toBeCallableWith({ rut });
  expectTypeOf(cliente.certificados.descargarECert).toBeCallableWith();
  expectTypeOf(cliente.certificados.solicitar).toBeCallableWith();
});

test('el segundo argumento es OpcionesDePedido', () => {
  expectTypeOf(cliente.caf.descargar).parameter(1).toEqualTypeOf<OpcionesDePedido | undefined>();
  expectTypeOf(cliente.certificaciones.v1.consultar).toBeCallableWith({ rut }, { timeoutMs: 1000 });
});

test('los grupos son de solo lectura', () => {
  // @ts-expect-error `caf` es readonly
  cliente.caf = cliente.caf;
  // @ts-expect-error `v1` es readonly
  cliente.certificaciones.v1 = cliente.certificaciones.v1;
});
