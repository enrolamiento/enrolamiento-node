// Pruebas de tipos: las corre `vitest` con typecheck (npm test) y también `npm run typecheck`.
// Ninguna llamada de este archivo se ejecuta.
import { expectTypeOf, test } from 'vitest';
import Enrolamiento, {
  Ambiente,
  EstadoCertificacion,
  type EventoPrueba,
  type OpcionesDePedido,
  type ParamsDe,
  type PromesaDeApi,
  type Respaldo,
  type RespuestaDe,
  webhooks,
} from '../src/index.js';

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

test('el cuerpo obligatorio exige sus propiedades obligatorias; el opcional las deja opcionales', () => {
  expectTypeOf(cliente.portabilidad.sesiones).toBeCallableWith({ rut });
  // @ts-expect-error el cuerpo de sesiones es obligatorio y `rut` también
  expectTypeOf(cliente.portabilidad.sesiones).toBeCallableWith({});
  expectTypeOf<ParamsDe<'caf_v1_descargar'>['Data']>().toEqualTypeOf<string | undefined>();
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

test('el evento de un webhook se discrimina por `evento` sin conversiones', () => {
  const e = webhooks.verificar('', {});
  if (e.evento === 'certificacion.finalizada') {
    expectTypeOf(e.resolucion).toEqualTypeOf<{ numero: number; fecha: string } | null>();
    expectTypeOf(e.respaldo).toEqualTypeOf<Respaldo | null>();
  }
  if (e.evento === 'prueba') {
    expectTypeOf(e).toEqualTypeOf<EventoPrueba>();
    // @ts-expect-error `prueba` no trae `rut`
    void e.rut;
  }
});

test('`respaldo.codigo` es opcional y nullable (los ejemplos de la guía lo omiten)', () => {
  expectTypeOf<Respaldo['codigo']>().toEqualTypeOf<string | null | undefined>();
  expectTypeOf<{
    estado: 'listo';
    url: null;
    documentos: { emitidos: null; recibidos: null; faltantes: null };
    completo_hasta: null;
    bytes: null;
    catalogo: null;
    disponible_hasta: null;
  }>().toExtend<Respaldo>();
});
