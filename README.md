# enrolamiento

SDK oficial de la [API de Enrolamiento](https://developers.enrolamiento.cl) para Node: certificación de emisores
de documentos tributarios electrónicos ante el SII, folios (CAF), certificados digitales, datos de empresas,
portabilidad y respaldos MiPyme. Arma la autenticación, clasifica los errores, reintenta lo que el contrato de la
API permite reintentar y verifica los webhooks. No tiene dependencias de runtime.

## Instalación

```sh
npm install enrolamiento
```

Requiere Node 22.12 o posterior.

## Cómo se usa

```ts
import { readFileSync } from 'node:fs';
import Enrolamiento, { Ambiente, ErrorDeApi, ErrorDeNegocio } from 'enrolamiento';

// Lee ENROLAMIENTO_USUARIO y ENROLAMIENTO_APIKEY del entorno. Sin `ambiente`, ninguna operación que lo recibe sale.
const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion });

try {
  const certificacion = await enrolamiento.certificaciones.v1.consultar({ rut: '11111111-1' });
  console.log(certificacion.Estado);
} catch (error) {
  // Una empresa que todavía no se certifica con usted no tiene certificación: la API responde 404.
  if (error instanceof ErrorDeApi && error.status === 404) console.log('Esa empresa no tiene certificación.');
  else throw error;
}

const certificado = { Data: readFileSync('certificado.pfx', 'base64'), Contrasenna: process.env.CLAVE_DEL_PFX! };
try {
  const caf = await enrolamiento.caf.descargar({ rut: '11111111-1', tipoDocumento: 33, cantidad: 100, ...certificado });
} catch (error) {
  if (error instanceof ErrorDeNegocio) console.error(error.codigo, error.reintentable);
  else throw error;
}
```

El cliente tiene un método por operación de la API, agrupados como en la
[referencia](https://developers.enrolamiento.cl/docs/referencia/):

| Grupo | Métodos |
|---|---|
| `certificaciones.v1` | `actualizar`, `actualizarCasillasIntercambio`, `buscar`, `consultar`, `crear`, `declararCumplimiento`, `iniciar`, `reiniciar`, `stats` |
| `certificaciones.v2` | `actualizar`, `crear`, `iniciar` |
| `caf` | `anulacionMasivaAnular`, `anulacionMasivaListar`, `anulados`, `anular`, `consulta`, `descargar`, `detalleFolios`, `detalleFoliosTodos`, `estadoFolios`, `listar`, `olvidarMemoria`, `reobtener`, `vencidos` |
| `certificados` | `descargarECert`, `solicitar`, `validar` |
| `empresas` | `datos`, `permisos` |
| `portabilidad` | `sesiones` |
| `respaldos` | `consultar`, `descargar`, `listar` |

`caf.olvidarMemoria` está reservado a la credencial de operaciones de Enrolamiento: con cualquier otra, la API
responde 403. Para que la API le vuelva a preguntar al SII, use `consultarSii: 'forzar'` (vea `conRespuesta()`).

Cada método recibe un solo objeto de parámetros con los nombres de campo de la API, sin traducir (`rut`,
`tipoDocumento`, `Data`, `Contrasenna`): los de la ruta, los de la query y las propiedades del cuerpo JSON, juntos.
Una clave que la operación no recibe (`Ambiente`, `ambiete`, `data`) lanza `ErrorDeConfiguracion` sin enviar el
pedido; el mensaje nombra la clave y sugiere la parecida. Una clave con valor `undefined` se ignora.
El JSDoc de cada método nombra su operación en el contrato (`caf_v1_descargar`), y `ParamsDe<'caf_v1_descargar'>`
y `RespuestaDe<'caf_v1_descargar'>` dan sus tipos. El método devuelve el JSON de la respuesta 200, ya parseado.

Un segundo argumento, opcional, cambia las opciones de esa llamada:

| Opción | Qué hace |
|---|---|
| `timeoutMs` | Tiempo de espera de cada intento, en milisegundos. |
| `maxReintentos` | Reintentos automáticos como máximo, de 0 a 10. |
| `signal` | Un `AbortSignal` para cancelar la llamada. Lo cancelado no se reintenta. |
| `cabeceras` | Cabeceras que se suman al pedido. |

`respaldos.descargar` pide siempre la URL en JSON y devuelve `{ url, vence }`: una URL firmada del archivo `.zip`
y hasta cuándo sirve. Bájela con un `GET` sin `Authorization`. El SDK no usa la redirección de la API para que
ningún cliente HTTP reenvíe su credencial al almacenamiento.

## Credenciales y `ambiente`

El cliente lee las credenciales de `ENROLAMIENTO_USUARIO` y `ENROLAMIENTO_APIKEY`, o de las opciones `usuario` y
`apikey`. Las lee en el primer pedido, no al crearlo; si faltan, ese pedido lanza `ErrorDeConfiguracion`.

En la API conviven dos RUT. El usuario es el RUT de su empresa, como proveedor de software, el mismo con el que
entra al portal del cliente; la APIKey es la «Llave de acceso» de **Mi Cuenta**, **Mis Datos**, pestaña **Integración**. El RUT
de cada llamada es el de la empresa cliente que usted certifica.

No escriba la APIKey en el código ni la mande al navegador.

**Advertencia:** una operación que recibe `ambiente` corre en **producción** del SII si `ambiente` falta o la API no
lo reconoce. Por eso el SDK:

- acepta solo `Ambiente.Homologacion` (0) y `Ambiente.Produccion` (1), y lanza `ErrorDeConfiguracion` ante
  cualquier otro valor, sin enviar el pedido;
- toma el `ambiente` de la llamada o, si falta, el de las opciones del cliente;
- no envía sin `ambiente` ninguna de las 14 operaciones que lo reciben (las de `caf` salvo `olvidarMemoria`,
  `certificaciones.v1.actualizarCasillasIntercambio` y `empresas.permisos`): lanza `ErrorDeConfiguracion`;
- rechaza una errata como `Ambiente` o `ambiete`, que de otro modo dejaría el pedido sin `ambiente`.

Defina `ambiente` en el cliente, siempre explícito: así ninguna llamada queda sin él. Cámbielo a
`Ambiente.Produccion` solo donde corresponde:

```ts
import Enrolamiento, { Ambiente } from 'enrolamiento';

const enrolamiento = new Enrolamiento({
  usuario: process.env.MI_USUARIO,
  apikey: process.env.MI_APIKEY,
  ambiente: Ambiente.Homologacion,
});

// El de la llamada gana al del cliente.
const cafs = await enrolamiento.caf.listar({ rut: '11111111-1', tipoDocumento: 33, ambiente: Ambiente.Produccion });
```

Las opciones del cliente:

| Opción | Por omisión |
|---|---|
| `usuario` | `ENROLAMIENTO_USUARIO` |
| `apikey` | `ENROLAMIENTO_APIKEY` |
| `ambiente` | ninguno |
| `timeoutMs` | `65000` |
| `maxReintentos` | `2` |
| `esperaMaximaMs` | `30000` |
| `urlBase` | `https://api.enrolamiento.cl` |
| `fetch` | el `fetch` global |
| `cabeceras` | ninguna |

`urlBase` acepta solo `https:`, o `http:` hacia `localhost`, `127.0.0.1` o `[::1]`, sin credenciales, query ni
fragmento: la cabecera `Authorization` viajaría en claro. Un `fetch` propio recibe esa cabecera, con las
credenciales; lo que lance llega como `error.cause` de un `ErrorDeConexion`.

## Errores

Lo que lanza el SDK hereda de `EnrolamientoError`, también ante un argumento con otra forma: lo que falla
antes de llamar a la API es `ErrorDeConfiguracion`. Ningún mensaje copia el texto de un parámetro (de un texto
dice solo su largo; sí nombra las claves y muestra los números). La excepción es un `fetch` propio que no
devuelva una `Response`: lo que eso provoque sale tal cual. Cuando la API respondió con un status que no es 2xx, el
error hereda además de `ErrorDeApi`, con `status`, `codigo`, `subcodigo`, `mensaje`, `reintentable` (la cabecera
`X-Reintentable`), `cabeceras`, `cuerpo` y `operacion`.

| Clase | Cuándo |
|---|---|
| `ErrorDeNegocio` | La API rechazó el pedido, con código o sin él. También cualquier respuesta que no calza en las demás familias. |
| `ErrorDeAutenticacion` | HTTP 401: credenciales inválidas o ausentes. |
| `ErrorDeLimite` | HTTP 409 sin `X-Codigo-Error`: se excedió el límite de pedidos. El pedido no se ejecutó. |
| `ErrorDeTiempoAgotado` | HTTP 504 sin `X-Codigo-Error`: la capa de entrada cortó a los 60 segundos. El pedido puede seguir en curso. |
| `ErrorDeFramework` | Cuerpo JSON con `Message`: ruta, verbo o parámetro inválido, o una excepción no controlada. |
| `ErrorDeConexion` | No llegó respuesta: la conexión falló, venció `timeoutMs` (`tiempoAgotado: true`) o se canceló con `signal` (`tiempoAgotado: false`). |
| `ErrorDeConfiguracion` | El SDK no pudo armar el pedido (faltan credenciales o un parámetro, falta `ambiente` o no es 0 ni 1, una clave que la operación no recibe, una opción fuera de rango) y no llamó a la API. También si falta el secreto de los webhooks. |
| `ErrorDeFirma` | Un webhook no pasó la verificación. |

**Decida por `codigo`, nunca por el status HTTP ni por el texto del mensaje.** Los rechazos de negocio llegan casi
siempre como HTTP 500, también los que no son fallas, y el mensaje puede cambiar. La acción que corresponde a
cada código está en la guía [Errores y reintentos](https://developers.enrolamiento.cl/docs/errores-y-reintentos/).

```ts
import Enrolamiento, { Ambiente, ErrorDeConexion, ErrorDeNegocio } from 'enrolamiento';

const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion });

try {
  await enrolamiento.certificaciones.v1.iniciar({ rut: '11111111-1' });
} catch (error) {
  if (error instanceof ErrorDeNegocio) {
    switch (error.codigo) {
      case 'CERT_EXPIRADO':
        // El certificado está vencido: pida uno vigente a la empresa.
        break;
      case 'SET_REQUERIDO':
        // Indique al menos un set con certificaciones.v1.actualizar.
        break;
      default:
        console.error(error.codigo, error.mensaje);
    }
  } else if (error instanceof ErrorDeConexion && error.tiempoAgotado) {
    // Sin respuesta: el pedido puede haberse ejecutado. Consulte antes de repetirlo.
  } else {
    throw error;
  }
}
```

## Reintentos

El SDK reintenta solo, con espera exponencial, lo que el contrato de la API dice que se puede repetir sin riesgo.
La decisión es por operación: cada una declara en el contrato si es idempotente y qué códigos se reintentan
solos, cuáles con cuidado y cuáles nunca.

- **Sin respuesta** (`ErrorDeConexion` por una falla de red o por `timeoutMs`) **o HTTP 504 sin
  `X-Codigo-Error`**: se reintenta solo si la operación es idempotente, porque el primer intento pudo ejecutarse.
- **Un error con código**: se reintenta si la operación lo lista entre los automáticos, respetando `Retry-After`.
  Un código que la operación no lista se reintenta solo si `X-Reintentable` es `si` y la operación es idempotente.
- **El límite de pedidos** (HTTP 409 sin código): no se reintenta por omisión. La API pide esperar 60 segundos y
  el SDK le suma hasta 10 al azar; eso supera `esperaMaximaMs`. Con `esperaMaximaMs: 70000` sí se reintenta.
- **Lo que cancela `signal`** no se reintenta nunca.

Dos opciones lo regulan:

- `maxReintentos` (por omisión, 2; de 0 a 10): reintentos como máximo, en el cliente o en cada llamada. Con `0` no
  se reintenta nada.
- `esperaMaximaMs` (por omisión, 30000), solo en el cliente: la espera más larga que el SDK acepta antes de un
  reintento. Un error que pide esperar más se lanza sin reintentar.

### Por qué `caf.descargar` no se repite solo

`caf.descargar` timbra folios en el SII. Si falla la red, vence `timeoutMs` o llega un 504 sin `X-Codigo-Error`, el primer intento pudo
timbrar un CAF aunque la respuesta no llegara, y repetirlo timbraría otro. Por eso el SDK no lo repite tras esos
errores: los lanza. Haga esto:

1. Llame a `caf.reobtener` sin `folioInicial`, con el mismo `rut`, `tipoDocumento` y `ambiente`. Devuelve el CAF
   más reciente que el SII timbró para la empresa.
2. Si ese CAF es más nuevo que los que usted tenía, es el que timbró el intento original: úselo. Si no, repita
   `caf.descargar`.
3. Si `caf.reobtener` falla con otro error (por ejemplo `UNKNOWN_ERROR_CAF`), no repita la descarga: el CAF pudo
   quedar timbrado sin poder bajarse. Reintente `caf.reobtener` más tarde o escriba a soporte.

Un `CAF_REQUEST_IN_PROGRESS` (HTTP 429: hay otra solicitud de folios en curso para el mismo RUT y tipo) sí se
reintenta solo, tras los segundos de `Retry-After`: ese pedido no se ejecutó.

## Tiempos de espera

`timeoutMs` es el tiempo de espera de cada intento, incluida la lectura de la respuesta: por omisión, 65000 ms.
Vence un poco después de los 60 segundos en que la capa de entrada de la API corta un pedido. Se define en el
cliente o en cada llamada.

Al vencer, el SDK aborta el pedido y lanza `ErrorDeConexion` con `tiempoAgotado: true`. Igual que con
`ErrorDeTiempoAgotado` (el 504 de la capa de entrada), la API puede seguir ejecutando el pedido: antes de
repetir una operación que cambia algo, consulte su estado.

```ts
import Enrolamiento, { Ambiente } from 'enrolamiento';

const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion, timeoutMs: 30000 });

// Una llamada con su propio plazo, sin reintentos y cancelable.
const controlador = new AbortController();
const estadisticas = await enrolamiento.certificaciones.v1.stats(
  {},
  { timeoutMs: 10000, maxReintentos: 0, signal: controlador.signal },
);
```

## Webhooks

`webhooks.verificar(cuerpoCrudo, cabeceras, opciones?)` comprueba la firma de una entrega y devuelve su evento.
Lanza `ErrorDeFirma` si la entrega no pasa (responda con un 4xx y no la procese) y `ErrorDeConfiguracion` si falta
el secreto o una opción no sirve.

| Opción | Por omisión |
|---|---|
| `secreto` | `ENROLAMIENTO_WEBHOOK_SECRETO`: el secreto de la suscripción en el portal |
| `toleranciaMs` | `300000` (5 minutos): diferencia máxima entre `X-Enrolamiento-Fecha` y el reloj |
| `ahora` | `Date.now()`: el reloj contra el que se compara la fecha, en milisegundos desde 1970 |

- **Use el cuerpo crudo**, tal como llegó: `string`, `Buffer`, `Uint8Array` o `ArrayBuffer`. La firma cubre sus
  bytes exactos; un objeto ya parseado no sirve.
- La fecha de la entrega (`X-Enrolamiento-Fecha`) puede diferir a lo más `toleranciaMs` del reloj de su servidor.
- Responda con un 2xx en menos de 10 segundos; si el trabajo es lento, conteste primero y procese después.
- La misma entrega puede llegar más de una vez: deduplique por `evento.id`, el identificador de la entrega.
- La API puede agregar eventos. Deje una rama `default` que responda 2xx y no haga nada.

Un receptor mínimo con `node:http`:

```ts
import { createServer } from 'node:http';
import { ErrorDeFirma, webhooks } from 'enrolamiento';

// En producción, guarde las entregas procesadas en su base de datos.
const procesadas = new Set<string>();

createServer((req, res) => {
  const trozos: Buffer[] = [];
  req.on('data', (trozo: Buffer) => trozos.push(trozo));
  req.on('end', () => {
    let evento;
    try {
      evento = webhooks.verificar(Buffer.concat(trozos), req.headers);
    } catch (error) {
      res.writeHead(error instanceof ErrorDeFirma ? 400 : 500).end();
      return;
    }
    res.writeHead(204).end();

    if (procesadas.has(evento.id)) return;
    procesadas.add(evento.id);

    switch (evento.evento) {
      case 'certificacion.finalizada':
        console.log('Certificación terminada:', evento.rut, evento.resolucion);
        break;
      case 'respaldo.finalizado':
        console.log('Respaldo terminado:', evento.rut, evento.respaldo.estado);
        break;
      case 'prueba':
        break;
      default:
        // Un evento que esta versión del SDK no conoce: ignórelo.
        break;
    }
  });
}).listen(3000);
```

`webhooks.firmar(cuerpo, secreto, fecha?)` firma un cuerpo como lo hace la API, para probar su receptor: devuelve
`X-Enrolamiento-Fecha` y `X-Enrolamiento-Firma`. La fecha es, por omisión, la hora actual.

## Crear una sesión del widget

El widget de portabilidad corre en el navegador de su usuario, pero la sesión la crea su servidor:
`portabilidad.sesiones` devuelve un `client_secret` que usted le pasa al widget. La APIKey nunca llega al
navegador; el `client_secret` sirve solo para esa empresa y vence a los 60 minutos.

```ts
import Enrolamiento from 'enrolamiento';

const enrolamiento = new Enrolamiento();

const sesion = await enrolamiento.portabilidad.sesiones({
  rut: '11111111-1',
  referencia_externa: 'cliente-4821',
  url_retorno: 'https://erp.ejemplo.cl/portabilidad/volver',
});

// Entregue sesion.client_secret al widget en el navegador; no lo guarde ni lo registre.
console.log(sesion.id, sesion.expira);
```

- La API entrega el `client_secret` una sola vez. Cada llamada crea otra sesión, y hay un máximo de 20 vigentes por
  empresa (`DEMASIADAS_SESIONES`): reutilice la sesión mientras no venza.
- Tome el RUT de lo que su sistema ya sabe del usuario; no deje que lo escriba.
- La operación requiere el respaldo MiPyme contratado (si no, `FUNCION_NO_CONTRATADA`).
- Mientras el widget no esté habilitado en el servidor, la operación responde HTTP 404 sin cuerpo
  (`ErrorDeNegocio` con `status` 404 y `codigo` `null`): no lo reintente. La API anuncia su habilitación en el
  [registro de cambios](https://developers.enrolamiento.cl/docs/changelog/).

## `conRespuesta()`

Cada método devuelve una promesa que, además, tiene `conRespuesta()`: resuelve con los datos y la `Response` de
la API, cuyo cuerpo ya fue leído. Sirve para leer las cabeceras, como las del límite de pedidos.

```ts
import Enrolamiento, { Ambiente } from 'enrolamiento';

const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion });

const { datos, respuesta } = await enrolamiento.certificaciones.v1
  .consultar({ rut: '11111111-1' })
  .conRespuesta();
console.log(datos.Estado, respuesta.status, respuesta.headers.get('RateLimit-Remaining'));
```

Un error no tiene `Response`: sus cabeceras están en `error.cabeceras`. Así se lee `X-Respuesta-De-Memoria`, que
`caf.descargar` y `caf.anulacionMasivaAnular` traen cuando la API repite de memoria un rechazo del SII (solo con la
memoria de rechazos activa para su cuenta). Su valor es la fecha, en ISO-8601 y UTC, de la respuesta original del
SII. Para que la API le vuelva a preguntar al SII, pase `consultarSii: 'forzar'`.

```ts
import { readFileSync } from 'node:fs';
import Enrolamiento, { Ambiente, ErrorDeApi } from 'enrolamiento';

const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion });
const certificado = { Data: readFileSync('certificado.pfx', 'base64'), Contrasenna: process.env.CLAVE_DEL_PFX! };

try {
  await enrolamiento.caf.descargar({ rut: '11111111-1', tipoDocumento: 33, cantidad: 10, ...certificado });
} catch (error) {
  const deMemoria = error instanceof ErrorDeApi ? error.cabeceras.get('X-Respuesta-De-Memoria') : null;
  if (deMemoria !== null) {
    // El SII contestó esto en la fecha `deMemoria` (ISO-8601, UTC). Si la empresa ya lo corrigió:
    await enrolamiento.caf.descargar({
      rut: '11111111-1',
      tipoDocumento: 33,
      cantidad: 10,
      consultarSii: 'forzar',
      ...certificado,
    });
  }
}
```

## Requisitos

- Node 22.12 o posterior.
- El paquete es solo ESM. Desde CommonJS, `require()` también funciona, porque Node 22.12 o posterior puede cargar
  ESM con `require()`; la clase viene con nombre, `Enrolamiento`, y también en `default`. En Node 22.12 ese
  `require()` emite un `ExperimentalWarning`; desde 22.13, no.

```js
const { Enrolamiento, Ambiente } = require('enrolamiento');

const enrolamiento = new Enrolamiento({ ambiente: Ambiente.Homologacion });
```

- TypeScript: el paquete trae sus tipos. Use `"moduleResolution"` `node16`, `nodenext` o `bundler`.
- Sin dependencias de runtime: usa el `fetch` y el `node:crypto` de Node.

## Versión del contrato

El SDK se genera del contrato OpenAPI publicado en https://developers.enrolamiento.cl/openapi.json. Esta versión
se generó de la **1.15.0** del contrato, la misma que exporta `VERSION_DEL_CONTRATO`:

```ts
import { VERSION, VERSION_DEL_CONTRATO } from 'enrolamiento';

console.log(`enrolamiento ${VERSION}, contrato ${VERSION_DEL_CONTRATO}`);
```

La documentación de la API, con la referencia de cada operación y las guías, está en
https://developers.enrolamiento.cl.

## Soporte

Escriba a soporte@enrolamiento.cl. Incluya la versión del SDK (`VERSION`), la operación y el código de error,
pero nunca su APIKey, el certificado ni su contraseña.

## Licencia

MIT.

## Desarrollo

```sh
npm ci --ignore-scripts   # instala las dependencias de desarrollo, sin scripts de instalación
npm test                  # pruebas unitarias
npm run typecheck         # tipos del código, de las pruebas y de los scripts
npm run test:smoke        # cada método contra Prism, que sirve el contrato de ejemplo
npm run test:package      # el paquete empaquetado y los bloques de código de este README
npm run check:package     # publint --strict y attw --profile esm-only
npm run contract:pull     # baja el contrato publicado a contract/openapi.json
npm run generate          # regenera src/generated y los ejemplos del humo desde el contrato
```

`src/generated/**` y `contract/openapi.json` no se editan a mano: salen de `npm run contract:pull` y
`npm run generate`, y la integración continua falla si regenerar produce un diff. Cuando el contrato cambia,
corra los dos, revise el diff y publique una versión con su entrada en `CHANGELOG.md`.

`@stoplight/prism-cli` está fijado en 5.14.2 y sus paquetes internos (`@stoplight/prism-core`,
`@stoplight/prism-http` y `@stoplight/prism-http-server`) en `overrides`: sin eso, npm resuelve versiones que
exigen Node 24.18 o posterior, y `npm ci` en Node 22 imprime advertencias `EBADENGINE`. `overrides` rige solo en
este repositorio, no en quien instala el paquete.

El flujo semanal `Contract drift` compara el contrato publicado con la copia del repositorio. GitHub desactiva los
flujos programados de un repositorio público sin actividad durante 60 días: si eso pasa, reactívelo en la pestaña
**Actions**.
