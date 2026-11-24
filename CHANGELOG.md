# Registro de cambios

Todos los cambios relevantes de este paquete se anotan aquí. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[Versionado Semántico](https://semver.org/lang/es/).

## 0.2.0 - 2026-11-23

### Agregado

- `urlDeAyuda` en los errores de la API (`ErrorDeApi` y sus subclases): la dirección de la entrada de `codigo` en
  el catálogo de la guía «Errores y reintentos», o la guía misma si el error no trae código.
- Línea de comandos `enrolamiento`, incluida en el paquete (`npx enrolamiento`). **Experimental**: los comandos,
  sus opciones y su salida pueden cambiar en una versión menor.
  - `enrolamiento webhooks probar`: envía a un receptor local avisos firmados como los firma Enrolamiento, los
    que debe aceptar y los que debe rechazar (firma de otro secreto, cuerpo alterado, fecha vencida, sin firma), y
    sale con 1 si alguno no responde como se espera. Sirve para un receptor en cualquier lenguaje.
  - `enrolamiento doctor`: comprueba la versión de Node, las credenciales (con una lectura), el reloj y el
    secreto de los webhooks.

  Ningún comando escribe en la API ni guarda credenciales, y el secreto y la APIKey se leen solo del entorno.

## 0.1.0 - 2026-11-23

Primera versión, generada de la versión **1.15.0** del contrato OpenAPI de la API de Enrolamiento.

### Agregado

- Cliente `Enrolamiento` con un método por operación del contrato, 34 en total, agrupados en
  `certificaciones.v1`, `certificaciones.v2`, `caf`, `certificados`, `empresas`, `portabilidad` y `respaldos`.
  Cada método recibe un objeto de parámetros con los nombres de campo de la API y, opcionalmente, las opciones de
  la llamada (`timeoutMs`, `maxReintentos`, `signal`, `cabeceras`). El cliente no tiene otros miembros que sus
  grupos. Se exporta por omisión y con nombre (`Enrolamiento`), también para `require()`.
- Una clave de parámetros que la operación no recibe (`Ambiente`, `ambiete`) lanza `ErrorDeConfiguracion` antes de
  enviar el pedido, con la clave y la parecida en el mensaje.
- Tipos de los parámetros y las respuestas de cada operación (`ParamsDe`, `RespuestaDe`, `IdDeOperacion`) y los
  enums del contrato con nombre (`Ambiente`, `EstadoCertificacion`, `EtapaCertificacion`, `PasoCertificacion`,
  `ReiniciarProceso`, `ClasificacionError`, `SetDePruebas`).
- Autenticación con `ENROLAMIENTO_USUARIO` y `ENROLAMIENTO_APIKEY`, o con las opciones `usuario` y `apikey`.
- `ambiente` validado antes de enviar: solo 0 o 1, con un valor por omisión en el cliente, y obligatorio en las 14
  operaciones que lo reciben (de la llamada o del cliente): sin él, la API opera en producción.
- `urlBase` solo con `https:` (o `http:` hacia `localhost`, `127.0.0.1` o `[::1]`), sin credenciales, query ni
  fragmento.
- Errores tipados, todos subclases de `EnrolamientoError`: `ErrorDeNegocio`, `ErrorDeAutenticacion`,
  `ErrorDeLimite`, `ErrorDeTiempoAgotado` y `ErrorDeFramework` (los de la API, subclases de `ErrorDeApi`, con
  `status`, `codigo`, `subcodigo` y `reintentable` leídos de la respuesta), `ErrorDeConexion`,
  `ErrorDeConfiguracion` y `ErrorDeFirma`. Lo que falla antes de llamar a la API es `ErrorDeConfiguracion`, y
  ningún mensaje copia un valor recibido.
- Reintentos automáticos según `x-idempotente` y `x-reintentable` del contrato, con espera exponencial,
  `Retry-After`, `maxReintentos` y `esperaMaximaMs`.
- Tiempo de espera por intento (`timeoutMs`, 65000 ms por omisión) y cancelación con `AbortSignal`.
- `conRespuesta()` en cada llamada, para leer la `Response` (status y cabeceras).
- `respaldos.descargar` devuelve `{ url, vence }` sin seguir la redirección de la API.
- `webhooks.verificar(cuerpoCrudo, cabeceras, opciones?)`, con `opciones` `{ secreto, toleranciaMs, ahora }`
  (firma HMAC-SHA256, ventana de 5 minutos, tipos de los eventos), y `webhooks.firmar(cuerpo, secreto, fecha?)`
  para las pruebas del integrador.
- `VERSION` y `VERSION_DEL_CONTRATO`.
