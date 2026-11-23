import type { ParamsDeOperacion } from './generated/resources.js';
import type { operations } from './generated/schema.js';

/** `operationId` de una operación con método en el cliente: las del contrato sin `x-alias-de`. */
export type IdDeOperacion = keyof ParamsDeOperacion;

/**
 * Los parámetros del método de una operación, en un solo objeto: los de ruta, los de query, los de cabecera (con su
 * nombre en el SDK, p. ej. `consultarSii`) y las propiedades del cuerpo JSON. `ambiente` es siempre opcional.
 *
 * @example
 * const params: ParamsDe<'caf_v1_descargar'> = { rut: '11111111-1', tipoDocumento: 33, cantidad: 10, ambiente: 0 };
 */
export type ParamsDe<Id extends IdDeOperacion> = ParamsDeOperacion[Id];

/** El JSON de la respuesta 200 de una operación: lo que resuelve su método. */
export type RespuestaDe<Id extends IdDeOperacion> = operations[Id]['responses'] extends {
  200: { content: { 'application/json': infer Respuesta } };
}
  ? Respuesta
  : unknown;

/**
 * Los parámetros de una operación del contrato, como los recibe su método. Lo usa `resources.ts`, que el generador
 * escribe con los argumentos que el esquema no dice:
 * - `Cabeceras`: el nombre en el SDK de cada parámetro de cabecera (`{ 'X-Consultar-Sii': 'consultarSii' }`).
 * - `QuitadosDeQuery`: los parámetros de query que el SDK fija y no ofrece (`'formato'` en `respaldos.descargar`).
 *
 * Si el cuerpo es opcional en el contrato, va entero o no va: sin ninguna de sus propiedades, o con todas las que su
 * esquema exige (`Data` y `Contrasenna` juntas). Una operación sin parámetros no acepta ninguna propiedad.
 */
export type ParamsDelContrato<
  Id extends keyof operations,
  Cabeceras extends Record<string, string> = {},
  QuitadosDeQuery extends string = never,
> = SinPropiedades<
  ConCuerpo<
    AmbienteOpcional<
      Seccion<operations[Id]['parameters']['path']> &
        Omit<Seccion<operations[Id]['parameters']['query']>, QuitadosDeQuery> &
        Renombrar<Seccion<operations[Id]['parameters']['header']>, Cabeceras>
    >,
    operations[Id]['requestBody']
  >
>;

/** Una sección de parámetros de openapi-typescript (`path`, `query`, `header`); `{}` si la operación no la tiene. */
type Seccion<T> = [NonNullable<T>] extends [never] ? {} : NonNullable<T>;

/**
 * Los parámetros con las propiedades del cuerpo JSON, en un solo objeto. Si el cuerpo es opcional, la unión de los
 * parámetros con el cuerpo entero y de los parámetros sin ninguna propiedad del cuerpo: con una, van las obligatorias.
 */
type ConCuerpo<Parametros, RequestBody> =
  Seccion<RequestBody> extends { content: { 'application/json': infer Json } }
    ? undefined extends RequestBody
      ? Aplanar<Parametros & Json> | Aplanar<Parametros & SinCuerpo<Json>>
      : Aplanar<Parametros & Json>
    : Aplanar<Parametros>;

/** Ninguna de las propiedades del cuerpo. */
type SinCuerpo<Json> = { [K in keyof Json]?: never };

/** Cambia el nombre de las propiedades según `Nombres` (nombre en el contrato → nombre en el SDK); quita las demás. */
type Renombrar<T, Nombres extends Record<string, string>> = {
  [K in keyof T as K extends keyof Nombres ? Nombres[K] : never]: T[K];
};

/** `ambiente` opcional, aunque el contrato lo exija (en la ruta): puede venir de las opciones del cliente. */
type AmbienteOpcional<T> = 'ambiente' extends keyof T ? Omit<T, 'ambiente'> & Partial<Pick<T, 'ambiente'>> : T;

/** Un solo objeto en vez de una intersección: se lee mejor al pasar el cursor. Conserva la documentación. */
type Aplanar<T> = { [K in keyof T]: T[K] };

/** Sin propiedades, un objeto que no admite ninguna: `{}` aceptaría cualquier cosa. */
type SinPropiedades<T> = [keyof T] extends [never] ? { [nombre: string]: never } : T;
