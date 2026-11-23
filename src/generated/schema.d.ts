// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.

export interface paths {
    "/v1/caf/{rut}/anulacion-masiva/{tipoDocumento}/anular/{folioInicial}/{folioFinal}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Anular folios emitidos de forma masiva para un CAF.
         * @description Anula en forma masiva los folios emitidos de un CAF. **Irreversible, en los dos ambientes.** Respeta `ambiente`, como el resto de `/v1/caf/*`: si se omite, o es 1, anula en el SII de producción; con `ambiente=0` anula en el SII de certificación. El certificado se valida en el ambiente pedido. Para probar sin tocar el SII, usar el RUT 1-9 o un RUT de prueba del cliente. Con la memoria de rechazos activa, un rechazo que el SII ya dio para esta empresa (o este certificado) se repite sin volver a preguntarle, con el header `X-Respuesta-De-Memoria`; el certificado se valida igual en cada pedido.
         */
        post: operations["caf_v1_anulacion_masiva_anular"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/anulacion-masiva/{tipoDocumento}/listar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar el listado de folios emitidos para anulación masiva.
         * @description Lista los CAF emitidos que se pueden anular en forma masiva. Respeta `ambiente`: si se omite, o es 1, consulta el SII de producción; con `ambiente=0`, el de certificación. Para probar sin tocar el SII, usar el RUT 1-9 o un RUT de prueba del cliente. Para listar los CAF de una empresa, use caf_v1_listar: el mismo modelo de respuesta y el mismo `ambiente`; la diferencia es que caf_v1_listar verifica el permiso del certificado sobre la empresa y esta operación no.
         */
        post: operations["caf_v1_anulacion_masiva_listar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/anulados/{tipoDocumento}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar los rangos de folios anulados para el tipo de documento.
         * @description Consultar los rangos de folios anulados para el tipo de documento.
         */
        post: operations["caf_v1_anulados"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/anular/{tipoDocumento}/{inicio}/{fin}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Anular un rango de folios en el SII.
         * @description Anula un rango de folios en el SII, en el ambiente que diga `ambiente` (si se omite, producción). **Irreversible.** `inicio` y `fin` son los folios a anular. Para anular solo una parte de un CAF (por ejemplo, los folios sin usar de un CAF vencido), declare además el CAF que los contiene con `cafInicial` y `cafFinal`: son el `FolioInicial` y el `FolioFinal` de ese CAF en caf_v1_listar. Sin ellos, el CAF que se le declara al SII es el mismo rango a anular, como siempre: sirve para anular un CAF entero. La API comprueba que el rango quepa en el CAF declarado, no que ese CAF exista: eso lo decide el SII. Si alguno de los folios del rango ya fue recibido por el SII, el SII rechaza la anulación completa (`RANGE_INVALID`). Repetirla con el mismo rango es seguro: si ya estaba anulado, el SII responde que la anulación ya se efectuó y la API lo toma como éxito. Una anulación que falla a mitad puede haber anulado igual. Para probar sin tocar el SII, usar el RUT 1-9 o un RUT de prueba del cliente. Con esos RUT, `cafInicial` y `cafFinal` no se validan.
         */
        post: operations["caf_v1_anular"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/consulta/{tipoDocumento}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar el último folio emitido para el tipo de documento.
         * @description Consultar el último folio emitido para el tipo de documento.
         *
         *     **Dos caminos.** Sin `mesesVentana`, la consulta mira los últimos 6 meses como siempre y la
         *     respuesta trae solo `UltimoEnviado`, `UltimoEnviadoEstado`, `UltimoAnulado` y
         *     `UltimoAnuladoEstado`. Con `mesesVentana` (de 1 a 60), y si el cliente tiene habilitada la ventana
         *     extendida, la búsqueda se ancla en los CAF que el SII tiene autorizados para la empresa y el tipo:
         *     recorre los meses hacia atrás desde el actual hasta el del CAF más antiguo, con `mesesVentana` y un
         *     máximo de la plataforma como tope, y la respuesta trae los campos adicionales. Las boletas (39 y
         *     41) se buscan en el Registro de Compras y Ventas (`Fuente` `RCV`); los demás tipos, en la consulta
         *     de documentos emitidos (`CONSEMITIDOS`).
         *
         *     **Por cuál camino salió.** Si la respuesta no trae `MesesVentanaEfectiva`, salió por el de
         *     siempre: sin `mesesVentana`, o con `mesesVentana` y la ventana extendida no habilitada para el
         *     cliente. En ese caso el parámetro se ignora, salvo su rango: un valor fuera de 1 a 60 da
         *     `PARAMETRO_FUERA_DE_RANGO` igual. Toda respuesta del camino nuevo trae `MesesVentanaEfectiva`,
         *     aunque sea 0 (`SIN_CAF`, `EN_CURSO`).
         *
         *     **Un 200 no significa éxito.** Mire `UltimoEnviadoEstado` y, en el camino nuevo, `Reintentable` y
         *     `ReintentarEnSegundos`: los estados y qué hacer con cada uno están en la descripción de
         *     `UltimoEnviadoEstado`. En el camino nuevo, lo resuelto de cada mes se reutiliza un tiempo (los
         *     meses cerrados, horas; el mes en curso, minutos): un reintento avanza en vez de repetir, y un folio
         *     recién emitido puede tardar en aparecer. Con fecha del mes en curso, hasta 40 minutos en boletas y
         *     10 en los demás tipos. Con fecha de un mes ya cerrado (un documento que llega al SII, o que el
         *     Registro de Compras y Ventas registra, después de que ese mes se consultó), hasta 24 horas.
         *
         *     **`UltimoFolioAutorizado` es informativo.** No lo use como `ultimoFolio` de caf_v1_descargar: con
         *     ese valor la reobtención nunca encuentra un CAF que devolver y siempre se timbran folios nuevos.
         *     Para recuperar un CAF perdido, use caf_v1_reobtener, o caf_v1_descargar con
         *     `ultimoFolio = FolioInicial - 1` de ese CAF (lo trae `Cafs`).
         *
         *     **Cuál usar.** Esta operación da el último folio emitido. Para contar cuántos folios de un CAF el
         *     SII todavía no recibió ni anuló, cuántos ya no permite anular y cuántos se anularon, use
         *     caf_v1_estado_folios con el rango de ese CAF.
         *
         *     Para el RUT 1-9 y los RUT de integración del cliente no se consulta al SII: sin `mesesVentana`, la
         *     respuesta es `OK` con los folios en 0; con `mesesVentana`, un `SIN_CAF` con la forma del camino
         *     nuevo, esté o no habilitada la ventana extendida.
         *
         *     La API también negocia XML como legado: con `Accept: application/xml`, el camino de siempre trae
         *     los campos nuevos como elementos nulos. En JSON, el formato de este contrato, no aparecen.
         */
        post: operations["caf_v1_consulta"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/descargar/{tipoDocumento}/{cantidad}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Descargar un CAF desde el SII.
         * @description Pide un CAF nuevo al SII, en el ambiente que diga `ambiente` (si se omite, producción). **No es idempotente:** cada llamada timbra folios nuevos. Ante un error dudoso, revisar con caf_v1_reobtener sin `folioInicial`, que devuelve el CAF más reciente, si el CAF quedó timbrado antes de volver a pedir. Con la memoria de rechazos activa, un rechazo que el SII ya dio para esta empresa (o este certificado) se repite sin volver a preguntarle, con el header `X-Respuesta-De-Memoria`. El certificado se valida siempre contra el SII de producción, aunque el CAF se pida con `ambiente=0`: un certificado habilitado solo en el ambiente de certificación del SII queda rechazado, y el error habla del certificado y no del ambiente.
         */
        post: operations["caf_v1_descargar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/detalle-folios/{tipoDocumento}/todos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar en el SII, CAF por CAF, los tramos de folios disponibles, utilizados y anulados de todos los CAF de un tipo.
         * @description Detalla, CAF por CAF, el estado de los folios de todos los CAF de un tipo de documento según el
         *     SII: qué tramos el SII todavía no recibió ni anuló (`Disponibles`), cuáles son de documentos que
         *     el SII ya recibió (`Utilizados`) y cuáles se anularon (`Anulados`). Los datos vienen de la
         *     aplicación de anulación masiva de folios del SII. Es una lectura: no anula nada, y repetirla no
         *     cambia nada en el SII. Opera en los dos ambientes del SII, con `ambiente` como las demás
         *     operaciones de CAF: 0 es certificación, y 1 o sin `ambiente` es producción. Admite todos los
         *     tipos de documento, boletas (39 y 41) incluidas, aunque en boletas casi nunca caben todos los
         *     CAF en una consulta (más abajo).
         *
         *     `Cafs` trae todos los CAF del tipo que el SII lista para la empresa, ordenados por su primer folio,
         *     cada uno con su fecha de autorización (`Fecha`), sus límites (`CafInicial` y `CafFinal`), sus
         *     conteos y sus tramos. `FolioInicial` es el primer folio del primer CAF y `FolioFinal`, el último
         *     del último. `FoliosFueraDeCaf` viene siempre vacía: los folios que no son de ningún CAF **nunca se
         *     informan como disponibles**, ni en ningún otro estado. Es la forma de encontrar, en una llamada,
         *     los folios sin usar de los CAF vencidos, salvo en los CAF con `DisponiblesSinVerificar` en `true`:
         *     ahí el SII puede no saber cuáles se usaron (más abajo).
         *
         *     **Para anular los folios sin usar de un CAF** con `DisponiblesSinVerificar` en `false`: tome un
         *     tramo de `Rangos.Disponibles` de ese CAF y llame a caf_v1_anular con el tramo como `inicio` y
         *     `fin`, y con `CafInicial` y `CafFinal` del CAF como `cafInicial` y `cafFinal`. `Disponibles` no es
         *     la cantidad de folios libres para emitir: puede incluir folios que usted ya usó en documentos que
         *     aún no envió al SII. Antes de anular, contraste con su propio foliado: el SII anula el rango
         *     entero o nada. **Esta receta no aplica a un CAF con `DisponiblesSinVerificar` en `true`:** sus
         *     `Disponibles` pueden ser folios ya usados, así que no los tome de esta respuesta para anular; qué
         *     folios de ese CAF quedaron sin usar lo dice solo su propio foliado.
         *
         *     **Cuál usar.** caf_v1_estado_folios cuenta los folios de un rango dentro de un solo CAF, sin
         *     decir cuáles. caf_v1_detalle_folios hace lo mismo que esta operación para un rango de folios, que
         *     puede cruzar varios CAF.
         *
         *     **Tope: 50.000 folios en boletas y 20.000 en los demás tipos.** Al SII se le consulta desde el
         *     primer folio del primer CAF hasta el último folio del último. Si los CAF del tipo abarcan más de
         *     50.000 folios en boletas (39 y 41), o más de 20.000 en los demás tipos, la respuesta es
         *     `PARAMETRO_FUERA_DE_RANGO`: consulte por partes con caf_v1_detalle_folios, que recibe
         *     `folioInicial` y `folioFinal`. Repetir sin rango da el mismo error.
         *
         *     **Boletas (39 y 41).** Los CAF de boletas de una empresa rara vez caben en una sola consulta:
         *     consulte CAF por CAF con caf_v1_detalle_folios, con `FolioInicial` y `FolioFinal` de cada CAF de
         *     caf_v1_listar como `folioInicial` y `folioFinal`. En los CAF de boletas autorizados antes de que
         *     las boletas se enviaran al SII una por una, el SII puede no saber qué folios se usaron y los
         *     informa como disponibles: esos CAF vienen con `DisponiblesSinVerificar` en `true`. En cualquier
         *     otro CAF, `DisponiblesSinVerificar` es `false`.
         *
         *     **Consistencia.** Antes de responder se comprueba que, en cada CAF, los tres estados cubran todos
         *     sus folios sin solaparse. Un folio que el SII informa a la vez como disponible y como utilizado o
         *     anulado (porque recibió o anuló un documento entre una consulta y otra) se informa como utilizado
         *     o anulado, nunca como disponible. En boletas, un folio que el SII informa a la vez como utilizado
         *     y como anulado se informa como utilizado: el SII recibió su documento. Si los datos no cuadran
         *     por otra razón, se consulta una vez más, salvo que la primera consulta haya tardado 20 segundos o
         *     más; si siguen sin cuadrar, la respuesta es `SII_RESPUESTA_INESPERADA`, nunca un 200 con datos
         *     incompletos.
         *
         *     **Permisos.** Valida el certificado en el ambiente pedido y verifica en el SII de ese ambiente
         *     que su titular esté autorizado por la empresa para operar con folios (CAF), como
         *     caf_v1_estado_folios; no hace falta que administre usuarios.
         *
         *     **Tiempos.** Hace varias llamadas al SII en serie y puede tardar decenas de segundos, más cuanto
         *     más folios abarquen los CAF: configure un timeout de cliente de al menos 70 segundos. Si tarda más
         *     de 60 segundos, la capa de entrada de la API responde 504 con una página HTML, sin código: es una
         *     lectura, repítala. Si el 504 se repite, consulte por partes con caf_v1_detalle_folios y acote el
         *     rango: cerca del tope, una consulta que hay que repetir porque los datos del SII no cuadraban
         *     dobla el tiempo. `SII_ERROR_CXN` es reintentable: respete `Retry-After` (30 segundos), con espera
         *     exponencial (30, 60 y 120 segundos) y un tope de 3 intentos.
         *
         *     **Sesión del SII entre ambientes.** Un `SII_ERROR_CXN` se trata como siempre: es reintentable.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII ni se valida
         *     el certificado, en cualquier ambiente y con cualquier tipo de documento: la respuesta es un solo
         *     CAF del folio 1 al 100, con todos sus folios disponibles, la fecha de hoy y
         *     `DisponiblesSinVerificar` en `false`. El RUT de prueba no simula los errores del SII:
         *     `CAF_NO_ENCONTRADO`, el tope, `SII_ERROR_CXN` y los rechazos solo se ven contra el SII.
         */
        post: operations["caf_v1_detalle_folios_todos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/detalle-folios/{tipoDocumento}/{folioInicial}/{folioFinal}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar en el SII, CAF por CAF, los tramos de folios disponibles, utilizados y anulados de un rango.
         * @description Detalla, CAF por CAF, el estado de los folios de un rango según el SII: qué tramos el SII
         *     todavía no recibió ni anuló (`Disponibles`), cuáles son de documentos que el SII ya recibió
         *     (`Utilizados`) y cuáles se anularon (`Anulados`). Los datos vienen de la aplicación de anulación
         *     masiva de folios del SII. Es una lectura: no anula nada, y repetirla no cambia nada en el SII.
         *     Opera en los dos ambientes del SII, con `ambiente` como las demás operaciones de CAF: 0 es
         *     certificación, y 1 o sin `ambiente` es producción. Admite todos los tipos de documento, boletas (39 y
         *     41) incluidas.
         *
         *     El rango [`folioInicial`, `folioFinal`] puede cruzar varios CAF y no tiene que coincidir con sus
         *     límites. `Cafs` trae cada CAF del tipo de documento que tiene al menos un folio en el rango, con
         *     su fecha de autorización (`Fecha`) y sus límites reales (`CafInicial` y `CafFinal`) aunque el
         *     rango los corte. Los conteos y los tramos de cada CAF cubren solo la parte del CAF que cae en el
         *     rango. Los folios del rango que no son de ningún CAF van en `FoliosFueraDeCaf` y **nunca se
         *     informan como disponibles**, ni como utilizados ni como anulados: no se pueden anular.
         *
         *     **Para anular los folios sin usar de un CAF** con `DisponiblesSinVerificar` en `false`, por
         *     ejemplo de un CAF vencido: tome un tramo de `Rangos.Disponibles` de ese CAF y llame a
         *     caf_v1_anular con el tramo como `inicio` y `fin`, y con `CafInicial` y `CafFinal` del CAF como
         *     `cafInicial` y `cafFinal`. `Disponibles` no es la cantidad de folios libres para emitir: puede
         *     incluir folios que usted ya usó en documentos que aún no envió al SII. Antes de anular, contraste
         *     con su propio foliado: el SII anula el rango entero o nada. **Esta receta no aplica a un CAF con
         *     `DisponiblesSinVerificar` en `true`:** sus `Disponibles` pueden ser folios ya usados, así que no
         *     los tome de esta respuesta para anular; qué folios de ese CAF quedaron sin usar lo dice solo su
         *     propio foliado.
         *
         *     **Cuál usar.** caf_v1_estado_folios cuenta los folios de un rango dentro de un solo CAF, sin
         *     decir cuáles. Esta operación dice cuáles, de varios CAF en una llamada. Para todos los CAF del
         *     tipo, sin elegir un rango, use caf_v1_detalle_folios_todos.
         *
         *     **Tope: 50.000 folios en boletas y 20.000 en los demás tipos.** Al SII se le consulta siempre
         *     desde el primer folio del primer CAF que toca el rango hasta el último folio del último, aunque
         *     el rango empiece o termine a mitad de un CAF. Ese tramo no puede superar 50.000 folios en
         *     boletas (39 y 41) ni 20.000 en los demás tipos: si lo supera, la respuesta es
         *     `PARAMETRO_FUERA_DE_RANGO` y hay que acotar el rango. Un rango corto que toca un CAF muy grande
         *     también puede superarlo: un CAF de boletas de más de 50.000 folios no se puede consultar.
         *
         *     **Boletas (39 y 41).** Sus CAF suelen ser grandes, y un rango que cruza varios rara vez cabe en
         *     el tope: consulte CAF por CAF, con `FolioInicial` y `FolioFinal` de cada CAF de caf_v1_listar
         *     como `folioInicial` y `folioFinal`. En los CAF de boletas autorizados antes de que las boletas
         *     se enviaran al SII una por una, el SII puede no saber qué folios se usaron y los informa como
         *     disponibles: esos CAF vienen con `DisponiblesSinVerificar` en `true`. En cualquier otro CAF,
         *     `DisponiblesSinVerificar` es `false`.
         *
         *     **Consistencia.** Antes de responder se comprueba que, en cada CAF entero, los tres estados
         *     cubran todos sus folios sin solaparse. Un folio que el SII informa a la vez como disponible y
         *     como utilizado o anulado (porque recibió o anuló un documento entre una consulta y otra) se
         *     informa como utilizado o anulado, nunca como disponible. En boletas, un folio que el SII informa
         *     a la vez como utilizado y como anulado se informa como utilizado: el SII recibió su documento.
         *     Si los datos no cuadran por otra razón, se consulta una vez más, salvo que la primera consulta
         *     haya tardado 20 segundos o más; si siguen sin cuadrar, la respuesta es
         *     `SII_RESPUESTA_INESPERADA`, nunca un 200 con datos incompletos.
         *
         *     **Permisos.** Valida el certificado en el ambiente pedido y verifica en el SII de ese ambiente
         *     que su titular esté autorizado por la empresa para operar con folios (CAF), como
         *     caf_v1_estado_folios; no hace falta que administre usuarios.
         *
         *     **Tiempos.** Hace varias llamadas al SII en serie y puede tardar decenas de segundos, más cuanto
         *     más folios abarquen los CAF consultados: configure un timeout de cliente de al menos 70 segundos.
         *     Si tarda más de 60 segundos, la capa de entrada de la API responde 504 con una página HTML, sin
         *     código: es una lectura, repítala. Si el 504 se repite, acote el rango: cerca del tope, una
         *     consulta que hay que repetir porque los datos del SII no cuadraban dobla el tiempo.
         *     `SII_ERROR_CXN` es reintentable: respete `Retry-After` (30 segundos), con espera exponencial (30,
         *     60 y 120 segundos) y un tope de 3 intentos.
         *
         *     **Sesión del SII entre ambientes.** Un `SII_ERROR_CXN` se trata como siempre: es reintentable.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII ni se valida
         *     el certificado, en cualquier ambiente y con cualquier tipo de documento: la respuesta es un solo
         *     CAF igual al rango pedido, con todos sus folios disponibles, la fecha de hoy y
         *     `DisponiblesSinVerificar` en `false`. `PARAMETRO_FUERA_DE_RANGO` por un rango inválido sí llega
         *     con el RUT de prueba, porque se revisa antes. El RUT de prueba no simula los errores del SII:
         *     `CAF_NO_ENCONTRADO`, el tope, `SII_ERROR_CXN` y los rechazos solo se ven contra el SII.
         */
        post: operations["caf_v1_detalle_folios"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/estado-folios/{tipoDocumento}/{folioInicial}/{folioFinal}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consultar en el SII el estado de un rango de folios: disponibles, utilizados y anulados.
         * @description Cuenta los folios de un rango según el SII, en el ambiente que indique `ambiente`: cuántos el SII
         *     todavía no recibió ni anuló (`Disponibles`), cuántos ya no permite anular, en la práctica los de
         *     documentos que el SII recibió (`Utilizados`), y cuántos se anularon (`Anulados`). Es una lectura:
         *     no anula nada, y repetirla no cambia nada en el SII.
         *
         *     El rango tiene que estar contenido entero en un solo CAF de los que lista caf_v1_listar: tome
         *     `FolioInicial` y `FolioFinal` de uno de esos CAF, o un subrango. `Disponibles` y `Anulados` son
         *     los que informa el SII; `Utilizados` no lo informa el SII: se calcula como `Cantidad` -
         *     `Disponibles` - `Anulados`. `Disponibles` no es la cantidad de folios libres para emitir: puede
         *     incluir folios que usted ya usó en documentos que aún no envió al SII; para decidir qué folio
         *     emitir, use su propio foliado. Si los conteos del SII no cuadran con el rango, la respuesta es un
         *     error, nunca un 200 con ceros.
         *
         *     **Cuál usar.** Para saber el último folio emitido, use caf_v1_consulta; esta operación cuenta un
         *     rango. Consulte bajo demanda, un CAF a la vez: cada llamada es una consulta completa al SII, y
         *     recorrer todos los CAF de caf_v1_listar consume una llamada por CAF del límite de requests. Para
         *     varios CAF, una llamada por CAF y en secuencia. La suma de los subrangos de un CAF no tiene por
         *     qué coincidir con una sola consulta del CAF entero si entre una y otra se emitieron o anularon
         *     folios.
         *
         *     **Permisos.** Como caf_v1_listar, verifica en el SII del mismo ambiente que el titular del
         *     certificado esté autorizado por la empresa para operar con folios (CAF); no hace falta que
         *     administre usuarios. Consulta la opción de anulación masiva del SII: una empresa que no está
         *     habilitada ahí recibe `CONTRIBUYENTE_SIN_PERMISO`. Las boletas (39 y 41) solo se pueden consultar
         *     en certificación (`ambiente=0`).
         *
         *     **Tiempos.** Hace varias llamadas al SII en serie, más que caf_v1_listar, y puede tardar decenas
         *     de segundos: configure un timeout de cliente de al menos 70 segundos. Si tarda más de 60
         *     segundos, la capa de entrada de la API responde 504 con una página HTML, sin código: es una
         *     lectura, repítala. `SII_ERROR_CXN` es frecuente e intermitente en el SII de producción: reintente
         *     respetando `Retry-After` (30 segundos), con espera exponencial (30, 60 y 120 segundos) y un tope
         *     de 3 intentos; cada intento puede tardar decenas de segundos.
         *
         *     **Sesión del SII entre ambientes (sin verificar).** La sesión del SII se reusa 15 minutos por
         *     certificado, en los dos ambientes. Si alterna `ambiente=0` y `ambiente=1` con el mismo certificado
         *     en menos de 15 minutos, el SII podría rechazar la sesión. Desde la versión 1.5.3 la respuesta es
         *     `SII_ERROR_CXN`, reintentable (antes, `SII_RESPUESTA_INESPERADA`): si persiste después de los
         *     reintentos, espere 15 minutos y repita antes de contactar a soporte.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII ni se valida
         *     el certificado: cualquier rango válido responde 200 con todos sus folios disponibles, sin
         *     contrastarlo con el CAF de ejemplo de caf_v1_listar (del folio 1 al 10). `PARAMETRO_FUERA_DE_RANGO`
         *     y `NO_SOPORTADO_BOLETAS` sí llegan con el RUT de prueba, porque se revisan antes. El RUT de prueba
         *     no simula los errores del SII: `CAF_NO_ENCONTRADO`, `SII_ERROR_CXN` y los rechazos solo se ven
         *     contra el SII; `CAF_NO_ENCONTRADO`, con una empresa real en certificación.
         */
        post: operations["caf_v1_estado_folios"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/listar/{tipoDocumento}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Listar los CAF que el SII tiene autorizados para la empresa y el tipo de documento, en el ambiente pedido.
         * @description Lista los CAF que el SII autorizó para la empresa y el tipo de documento, en el ambiente que
         *     indique `ambiente`: todos los que el SII lista, también los ya usados o anulados enteros. Para
         *     saber cuántos folios quedan en uno de ellos, consulte caf_v1_estado_folios con su rango. Es una
         *     lectura: no timbra ni anula nada, y repetirla no cambia nada en el SII.
         *
         *     **Cuál usar.** Reemplaza a caf_v1_anulacion_masiva_listar para listar CAF: el mismo modelo de
         *     respuesta, pero en el ambiente pedido y verificando el permiso del certificado. Para bajar uno de
         *     estos CAF, use caf_v1_reobtener con `folioInicial`, si está en la primera página del listado de
         *     reobtención del SII (ver `folioInicial` en caf_v1_reobtener).
         *
         *     **Permisos.** Además de validar el certificado en el ambiente pedido, verifica en el SII del mismo
         *     ambiente que su titular esté autorizado por la empresa para operar con folios (CAF); no hace falta
         *     que administre usuarios. caf_v1_reobtener, en cambio, valida el certificado siempre en producción.
         *     Consulta la opción de anulación masiva del SII: una empresa que no está habilitada ahí recibe
         *     `CONTRIBUYENTE_SIN_PERMISO`.
         *
         *     **Tiempos.** Hace varias llamadas al SII en serie y puede tardar decenas de segundos: configure un timeout de cliente de al menos 70 segundos. Si tarda más de 60
         *     segundos, la capa de entrada de la API responde 504 con una página HTML, sin código: es una
         *     lectura, repítala. `SII_ERROR_CXN` es frecuente e intermitente en el SII de producción: reintente
         *     respetando `Retry-After` (30 segundos), con espera exponencial (30, 60 y 120 segundos) y un tope
         *     de 3 intentos; cada intento puede tardar decenas de segundos.
         *
         *     **Sesión del SII entre ambientes (sin verificar).** La sesión del SII se reusa 15 minutos por
         *     certificado, en los dos ambientes. Si alterna `ambiente=0` y `ambiente=1` con el mismo certificado
         *     en menos de 15 minutos, el SII podría rechazar la sesión. Desde la versión 1.5.3 la respuesta es
         *     `SII_ERROR_CXN`, reintentable (antes, `SII_RESPUESTA_INESPERADA`): si persiste después de los
         *     reintentos, espere 15 minutos y repita antes de contactar a soporte.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII ni se valida
         *     el certificado: la respuesta es siempre un único CAF de ejemplo, del folio 1 al 10 (el ejemplo de
         *     respuesta de esta página es otro: una empresa con dos CAF). El RUT de prueba no simula los errores
         *     del SII: `CONTRIBUYENTE_SIN_PERMISO`, `SII_ERROR_CXN` y los rechazos solo se ven contra el SII.
         */
        post: operations["caf_v1_listar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/memoria": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Olvidar la memoria de rechazos del SII de una empresa. Solo para operaciones.
         * @description Borra lo que la API recuerda de los rechazos del SII para esa empresa (la memoria que contesta sin volver a preguntarle al SII, con el header `X-Respuesta-De-Memoria`), en los dos ambientes y para todos los tipos de documento y todos los clientes. Es para cuando la empresa ya corrigió lo que el SII rechazaba. **Reservada a la credencial de operaciones de Enrolamiento:** cualquier otra recibe 403; un cliente que quiere volver a preguntarle al SII manda `X-Consultar-Sii: forzar` en su propio pedido. No llama al SII. Devuelve cuántos rechazos recordados borró (0 si no había, o si la memoria de rechazos está apagada). Repetirla es seguro.
         */
        delete: operations["caf_v1_memoria"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/reobtener/{tipoDocumento}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reobtener un CAF ya timbrado desde el SII: el último o, con folioInicial, el que empieza en ese folio.
         * @description Reobtener un CAF ya timbrado desde el SII: el último o, con `folioInicial`, el que empieza en ese
         *     folio. El certificado se valida siempre contra el SII de producción, aunque el CAF se pida con
         *     `ambiente=0`: un certificado habilitado solo en el ambiente de certificación del SII queda
         *     rechazado, y el error habla del certificado y no del ambiente. caf_v1_listar y
         *     caf_v1_estado_folios, en cambio, lo validan en el ambiente pedido.
         *
         *     Con `folioInicial` reobtiene un CAF puntual, ya timbrado: el que empieza en ese folio, sin el
         *     filtro de 3 meses de `descargarCafAntiguos`. No pide folios nuevos: repetirla vuelve a bajar el
         *     mismo CAF. El CAF se busca solo en la primera página del listado de reobtención del SII; si no
         *     aparece ahí, porque no existe o porque el SII lo lista en una página posterior, la respuesta es
         *     `CAF_NO_ENCONTRADO`. Una falla de red, un listado que no se pudo leer o una página del SII en
         *     lugar del CAF nunca salen como `CAF_NO_ENCONTRADO`: salen con el código de la causa o con
         *     `UNKNOWN_ERROR_CAF`.
         *
         *     **Códigos con `folioInicial`.** Además de los del certificado, puede responder
         *     `CAF_NO_ENCONTRADO`, `NO_CAF`, `CERT_SIN_PERMISO`, `SEC_EMP_NOT_AUTHORIZED`, `SII_ERROR_CXN`,
         *     `UNKNOWN_ERROR_CAF` y `PARAMETRO_FUERA_DE_RANGO`. Los que no figuran en la tabla de reintentos
         *     de esta página se resuelven con la regla de respaldo de la guía de errores.
         *
         *     **Tiempos.** Habla con el SII en serie y puede tardar decenas de segundos: configure un timeout
         *     de cliente de al menos 70 segundos. Si su cuenta tiene el control de solicitudes concurrentes de
         *     CAF, antes de ir al SII la API puede esperar hasta 60 segundos a que termine otra solicitud de
         *     folios del mismo RUT, tipo de documento y ambiente (ver la respuesta 429): esa espera se suma. Si
         *     la respuesta tarda más de 60 segundos, la capa de entrada de la API responde 504 con una página
         *     HTML, sin código, y el pedido puede seguir en curso: repítalo pasados 30 segundos.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII: la
         *     respuesta es una cadena vacía (`""` en JSON), con o sin `folioInicial`. Un `folioInicial`
         *     inválido responde `PARAMETRO_FUERA_DE_RANGO` también con el RUT de prueba. El RUT de prueba no
         *     simula los errores del SII: `CAF_NO_ENCONTRADO`, `SII_ERROR_CXN` y los rechazos solo se ven
         *     contra el SII.
         */
        post: operations["caf_v1_reobtener"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/caf/{rut}/vencidos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revisar en el SII qué CAF vencidos de la empresa todavía tienen folios disponibles, que hay que anular.
         * @description Revisa en el SII los CAF de la empresa de los tipos de documento sujetos a vencimiento (33, 43,
         *     46, 56 y 61) y devuelve los que ya vencieron según la Res. Ex. SII N° 58/2017 y todavía tienen
         *     folios disponibles: los folios que hay que anular. **Es una lectura: no anula nada**, y repetirla
         *     no cambia nada en el SII. Para anular lo que informa, use caf_v1_anular o
         *     caf_v1_anulacion_masiva_anular (más abajo). Opera en los dos ambientes del SII, con `ambiente`
         *     como las demás operaciones de CAF: 0 es certificación, y 1 o sin `ambiente` es producción.
         *
         *     **Qué está vencido.** Un CAF autorizado desde el 1 de julio de 2018 vale seis meses desde su
         *     fecha de autorización. Los autorizados antes valían 18 meses, a más tardar hasta el 31 de
         *     diciembre de 2018, y los autorizados antes del 1 de enero de 2016, hasta el 30 de junio de 2017:
         *     hoy todos están vencidos y también se informan. `FechaVencimiento` es el primer día en que el CAF
         *     ya no vale. Se decide con la fecha de hoy en Chile, que viene en `Fecha`.
         *
         *     **Encadenar con `continuar`.** Cada llamada revisa lo que cabe en unos 40 segundos, tipo por tipo
         *     y, en cada tipo, de los CAF más recientes a los más antiguos. Si no terminó, la respuesta trae
         *     `Completo` en `false` y un valor en `Continuar`: envíelo tal cual en el parámetro `continuar` de
         *     la llamada siguiente, con el mismo RUT, `ambiente` y certificado, y repita mientras `Continuar`
         *     traiga un valor. `Continuar` es opaco: un texto como `33-15001` o `r33-15001` que el cliente no
         *     interpreta ni arma; su forma puede cambiar. La API solo valida la forma de `continuar`: un valor
         *     que no tiene la forma de los que devuelve responde `PARAMETRO_FUERA_DE_RANGO`, pero uno armado a
         *     mano, o de otro RUT o ambiente, se acepta y puede saltear parte de la revisión. Envíe exactamente
         *     el que devolvió la respuesta anterior para el mismo RUT y ambiente. Las llamadas encadenadas
         *     forman una sola revisión, y `Completo` es de la cadena entera: es `true` solo en la última respuesta (la que trae `Continuar`
         *     nulo) y solo si ninguna respuesta de la cadena trajo `SinRevisar`. La última respuesta puede
         *     traer `Continuar` nulo y `Completo` en `false`: la revisión terminó, pero algo quedó sin revisar.
         *     `Resumen`, `PorAnular` y `SinRevisar` traen solo lo de cada respuesta: junte los de todas. La API
         *     no guarda nada entre llamadas, así que un CAF que vence mientras se encadena puede no salir en
         *     esa cadena: sale en la revisión siguiente. Si el SII falla después de que la llamada ya revisó
         *     algo, no es un error: la respuesta trae lo reunido, `Completo` en `false` y un `Continuar` que
         *     repite lo que falló.
         *
         *     **Lo que no se pudo revisar.** `SinRevisar` lista, con su `Motivo`, lo que no se revisó:
         *     `SIN_PERMISO`, el certificado no tiene permiso para operar con folios de ese tipo de documento;
         *     `CAF_EXCEDE_TOPE`, un CAF vencido con más folios de los que el SII permite consultar de una vez
         *     (20.000); `DATOS_INCONSISTENTES`, el SII informó datos que no cuadran para ese tramo, o el listado
         *     de CAF del tipo no se pudo leer. Una entrada con `FolioInicial` y `FolioFinal` es un tramo de CAF;
         *     con los dos en `null`, el tipo de documento entero. Lo que está en `SinRevisar` puede tener CAF
         *     vencidos con folios disponibles: revíselo con su propio foliado o con caf_v1_detalle_folios, o
         *     vuelva a revisar más tarde; con `SIN_PERMISO`, use un certificado autorizado para ese tipo de
         *     documento. No se reintenta dentro de la cadena. Una entrada de un tipo entero
         *     puede cubrir partes de ese tipo que ya vinieron en `PorAnular` de una respuesta anterior: esas
         *     entradas siguen valiendo.
         *
         *     **Para anular.** Cada entrada de `PorAnular` se anula con caf_v1_anular: `CafInicial` y `CafFinal`
         *     son los valores de `cafInicial` y `cafFinal`, y cada tramo de `TramosDisponibles` es un rango
         *     `inicio`-`fin` a anular. También sirve la anulación masiva, caf_v1_anulacion_masiva_anular, con el
         *     tramo como rango. `Disponibles` son los folios que el SII todavía no recibió ni anuló: pueden
         *     incluir folios que usted ya usó en documentos que aún no envió al SII. No reemplazan al foliado
         *     propio para decidir qué folios anular: antes de anular, contraste con su foliado.
         *
         *     **Permisos.** Valida el certificado en el ambiente pedido y verifica en el SII de ese ambiente,
         *     tipo de documento por tipo de documento, que su titular esté autorizado por la empresa para
         *     operar con folios (CAF), como caf_v1_detalle_folios; no hace falta que administre usuarios. Un
         *     tipo que el SII informa sin timbrajes, o no habilitado para timbraje electrónico, igual se revisa
         *     con el listado de CAF: la empresa puede tener CAF vencidos de un tipo que ya no tiene habilitado.
         *
         *     **Tiempos.** Configure un timeout de cliente de al menos 70 segundos. Si una respuesta tarda más
         *     de 60 segundos, la capa de entrada de la API responde 504 con una página HTML, sin código: es una
         *     lectura, repítala con el mismo `continuar`. `SII_ERROR_CXN` es reintentable con el mismo
         *     `continuar`: respete `Retry-After` (30 segundos), con espera exponencial (30, 60 y 120 segundos) y
         *     un tope de 3 intentos. **Si un error a mitad de cadena se repite con el mismo `continuar`**, no se
         *     arregla reintentando: empiece la revisión de nuevo, sin `continuar`.
         *
         *     **Para probar.** Con el RUT 1-9 o un RUT de prueba del cliente no se consulta al SII ni se valida
         *     el certificado, en cualquier ambiente, pero `continuar` sí se valida: la respuesta es completa,
         *     con un CAF del tipo 33 del folio 1 al 100, autorizado siete meses antes de hoy, con 40 folios
         *     disponibles en el tramo 61 al 100. El RUT de prueba no simula el encadenamiento ni los errores del
         *     SII: `Continuar`, `SinRevisar` y `SII_ERROR_CXN` solo se ven contra el SII.
         */
        post: operations["caf_v1_vencidos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/buscar/{pagina}/{cantidadPorPagina}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Buscar certificación, especificando un set de filtros.
         * @description Lista las certificaciones del cliente, de la más reciente a la más antigua (por número de
         *     certificación, descendente), de a `cantidadPorPagina` por página. La respuesta es un array, sin
         *     total.
         *
         *     Filtros por query string. El nombre distingue mayúsculas (`estado` se ignora) y un valor vacío
         *     se ignora:
         *
         *     - `Fecha` y `RUT` se aplican **antes** de paginar.
         *     - `Estado`, `Estapa` y `PasoEnSII` se aplican **después de paginar**, sobre la página ya
         *       cortada: una página puede traer menos filas que `cantidadPorPagina`, o ninguna, aunque haya
         *       coincidencias en otras páginas. Para filtrar por esos campos sin perder filas, pida las páginas
         *       sin ellos y filtre del lado del cliente.
         *
         *     `cantidadPorPagina` no tiene tope en la API; se recomienda no pasar de 100. `pagina` menor que 1
         *     produce un 500.
         */
        get: operations["certificaciones_v1_buscar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Muestra estadísticas de las certificaciones.
         * @description Muestra estadisticas de las certificaciones.
         *
         *     Ej: Cantidad en proceso, completadas o error. Cantidad por paso o etapa.
         */
        get: operations["certificaciones_v1_stats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/actualizar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Actualizar los datos de una certificación.
         * @description Actualizar los datos de una certificación.
         */
        post: operations["certificaciones_v1_actualizar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/actualizar-casillas-intercambio": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Actualiza casillas de intercambio en el SII para la empresa en el ambiente de producción.
         * @description Actualiza casillas de intercambio en el SII para la empresa en el ambiente de producción.
         */
        post: operations["certificaciones_v1_actualizar_casillas_intercambio"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/consultar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Obtener los datos de una certificación, dado el RUT de la empresa.
         * @description Obtener los datos de una certificación, dado el RUT de la empresa.
         */
        get: operations["certificaciones_v1_consultar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/crear": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear una nueva certificación.
         * @description Crear una nueva certificación.
         */
        post: operations["certificaciones_v1_crear"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/declarar-cumplimiento": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Declarar cumplimiento a la certificación en curso.
         * @description Declarar cumplimiento a la certificación en curso. Solo corre cuando la certificación está en `Etapa` = `DeclaracionFinal` (3): en otra etapa responde `ERROR_GENERAL` con el mensaje «La certificación para el RUT … no se encuentra en el paso de muestras impresas aprobadas.». Con la función de respaldo MiPyme, no declara mientras el respaldo de la empresa se copia desde el SII (`RESPALDO_EN_PROCESO`, reintentable) ni si falló (`RESPALDO_FALLIDO`). Si dio de baja el respaldo con una copia en curso, `RESPALDO_EN_PROCESO` sigue respondiendo hasta que esa copia termine.
         */
        post: operations["certificaciones_v1_declarar_cumplimiento"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/iniciar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Iniciar el proceso de certificación.
         * @description Inicia el proceso de certificación. Repetirlo es seguro: si la certificación ya pasó por la carga de datos, responde true sin hacer nada.
         */
        post: operations["certificaciones_v1_iniciar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificaciones/{rut}/reiniciar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reinicia la certificación, eliminando todos los datos generados para la misma.
         * @description Reinicia la certificación, eliminando todos los datos generados para la misma. En `Etapa` = `DeclaracionFinal` (3) no se puede reiniciar: responde `ERROR_GENERAL` con el mensaje «La certificación para el RUT … no puede ser reiniciada.».
         */
        post: operations["certificaciones_v1_reiniciar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificado/descargar/e-cert": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Descargar un certificado desde E-Cert.
         * @description Descargar un certificado desde E-Cert.
         */
        post: operations["certificados_v1_descargar_e_cert"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificado/solicitar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Solicita un certificado.
         * @description Solicita un certificado.
         */
        post: operations["certificados_v1_solicitar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/certificado/{rut}/validar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Valida que el certificado tenga permisos para la empresa.
         * @description Valida que el certificado tenga permisos para la empresa.
         */
        post: operations["certificados_v1_validar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/empresas/{rutEmpresa}/permisos/{rutUsuario}/{ambiente}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Actualiza el usuario con RUT {rutUsuario} con permisos en el SII para la empresa con RUT {rutEmpresa}.
         * @description Actualiza el usuario con RUT {rutUsuario} con permisos en el SII para la empresa con RUT {rutEmpresa}.
         */
        post: operations["empresas_v1_permisos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/empresas/{rut}/consultar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Obtiene la información de la empresa.
         * @description Alias de `empresas_v1_datos`: misma acción, misma respuesta.
         */
        post: operations["empresas_v1_consultar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/empresas/{rut}/datos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Obtiene la información de la empresa.
         * @description Obtiene la información de la empresa.
         */
        post: operations["empresas_v1_datos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/portabilidad/sesiones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear una sesión del widget de portabilidad para una empresa.
         * @description Su servidor crea, con su usuario y su `APIKey` como en el resto de la API, una sesión corta para una
         *     empresa, y le pasa el `client_secret` al widget de portabilidad en el navegador. La `APIKey` nunca
         *     llega al navegador: el `client_secret` solo sirve para esa empresa y vence a los 60 minutos.
         *
         *     - **Atada a su cuenta y a un RUT.** La sesión solo puede leer la empresa de `rut`, y solo para su
         *       cuenta. No deje que el usuario escriba el RUT: tómelo de lo que su sistema ya sabe de él.
         *     - **Una sesión nueva por llamada.** Cada llamada crea otra sesión con otro `client_secret`, aunque la
         *       empresa ya tenga una vigente; las anteriores siguen sirviendo hasta que vencen. Cuando una vence,
         *       cree otra: el proceso de la empresa sigue donde estaba.
         *     - **Hasta 20 sesiones vigentes por empresa.** Con 20 sesiones sin vencer para el mismo `rut` en su
         *       cuenta, la siguiente se rechaza con `DEMASIADAS_SESIONES` (reintentable) hasta que alguna venza.
         *       No cree una sesión por cada carga de página: reutilice la que ya tiene mientras no venza.
         *     - **El `client_secret` se entrega una sola vez.** La API guarda solo un resumen y no puede volver a
         *       mostrarlo. La respuesta trae `Cache-Control: no-store`.
         *     - **Modo de prueba.** Con `prueba` en `true` la sesión queda marcada de prueba desde su creación; el
         *       navegador no puede cambiarlo. Una sesión de prueba no consulta al SII: recorre un guion, el
         *       `escenario`. Con `escenario` el guion de la empresa empieza de cero; sin él, sigue donde iba en
         *       las sesiones de prueba anteriores de esa empresa (`camino_feliz` si es la primera). Los escenarios:
         *       `camino_feliz`, `certificado_no_administrador`, `conflicto`, `respaldo_en_curso` y
         *       `resolucion_emitida`. La respuesta dice cuál recorre la sesión. `escenario` solo se acepta con
         *       `prueba` en `true`.
         *
         *     Se usa solo con la función de respaldo MiPyme contratada (`403` `FUNCION_NO_CONTRATADA`, `503`
         *     `FUNCION_NO_VERIFICABLE`). **El widget que usa esta sesión todavía no está disponible:** esta operación
         *     responde `404` mientras el widget no esté habilitado en el servidor, y no crea ninguna sesión.
         */
        post: operations["portabilidad_v1_sesiones"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/respaldos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar los respaldos MiPyme de una empresa.
         * @description Devuelve los respaldos MiPyme de una empresa suya, el más nuevo primero: hay uno por cada
         *     certificación de la empresa que tuvo respaldo. Cada uno trae el mismo bloque que el aviso por
         *     webhook, más su `id`, que es el que usan `respaldos_v1_consultar` y `respaldos_v1_descargar`.
         *
         *     Un respaldo aparece en la lista recién cuando su archivo empieza a armarse; antes no tiene `id`.
         *     Por eso un aviso `certificacion.finalizada` con el respaldo `en_proceso` puede llegar cuando la
         *     lista todavía está vacía, y un respaldo que falla antes de esa etapa no aparece nunca: su estado
         *     lo dice el aviso.
         *
         *     La lista viene vacía, con 200, si falta `rut`, si no tiene forma de RUT, si la empresa no es suya
         *     o si no tiene respaldos: la API no distingue esos casos.
         */
        get: operations["respaldos_v1_listar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/respaldos/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar el estado de un respaldo MiPyme.
         * @description Devuelve un respaldo suyo por su `id`, en cualquier estado: `en_proceso`, `listo`, `fallido` o
         *     `vencido`, siempre con 200. El `id` sale del listado por RUT (`respaldos_v1_listar`) o de la
         *     `url` de un aviso.
         *
         *     Si espera un respaldo `en_proceso`, el camino es el aviso por webhook `respaldo.finalizado`. Sin
         *     webhook, consulte cada varios minutos: armar el archivo puede tardar horas.
         */
        get: operations["respaldos_v1_consultar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/respaldos/{id}/descargar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Descargar el archivo .zip de un respaldo MiPyme.
         * @description Entrega el archivo .zip de un respaldo `listo` mediante una URL firmada, válida por 15 minutos,
         *     que se pide con un GET simple. Hay dos formas:
         *
         *     - **`302`** (sin `formato`): la URL va en `Location`. **No siga la redirección con el mismo
         *       cliente si ese cliente reenvía `Authorization`**: el almacenamiento rechaza con 400 un pedido que
         *       trae a la vez la URL firmada y ese header. Muchos clientes HTTP lo reenvían al seguir un
         *       redirect.
         *     - **`200` con `?formato=json`**: la URL va en el cuerpo, con `vence`. Es la forma recomendada desde
         *       un programa: tome `url` y bájela con un GET **sin** headers de esta API.
         *
         *     El archivo baja con el nombre `mipyme-backup-<RUT>.zip` y pesa lo que dice `bytes` del respaldo.
         *     Pida una URL nueva cada vez que vaya a descargar: no la guarde. Una URL entregada el último día
         *     sirve sus 15 minutos aunque el día termine en el medio.
         *
         *     Si el respaldo no está `listo`: `409` `RESPALDO_EN_PROCESO` (todavía se arma), `409`
         *     `RESPALDO_FALLIDO` (no hay archivo) o `410` `RESPALDO_VENCIDO` (pasó `disponible_hasta`).
         */
        get: operations["respaldos_v1_descargar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v2/certificaciones/{rut}/actualizar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Actualizar los datos de una certificación.
         * @description Actualizar los datos de una certificación.
         */
        post: operations["certificaciones_v2_actualizar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v2/certificaciones/{rut}/crear": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear una nueva certificación.
         * @description Crear una nueva certificación.
         */
        post: operations["certificaciones_v2_crear"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v2/certificaciones/{rut}/iniciar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Iniciar el proceso de certificación.
         * @description Iniciar el proceso de certificación.
         */
        post: operations["certificaciones_v2_iniciar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description Datos de la actividad economica. */
        Acteco: {
            /** @description Si es afecto a iva o no la actividad. (SI|NO) */
            AffectoIva?: string | null;
            /** @description Codigo de la actividad en el SII. */
            Codigo?: string | null;
            /** @description Nombre de la actividad. */
            Nombre?: string | null;
        };
        /** @description Datos de la certificación para actualizar. (Solo se actualizan los campos que no vengan nulos) */
        ActualizarCertificacion: {
            /** @description Actualizar los datos del certificado. (v2+) */
            Certificado?: components["schemas"]["Certificado"] | null;
            /** @description Direccion */
            Direccion?: string | null;
            /** @description Direccion regional */
            DireccionRegional?: string | null;
            /** @description Giro comercial */
            Giro?: string | null;
            /** @description Listado de productos. (nombre;precio) */
            Productos?: components["schemas"]["Producto"][] | null;
            /** @description Razon social */
            RazonSocial?: string | null;
            /** @description Referencia */
            Referencia?: string | null;
            /** @description Listado de servicios. (nombre;precio) */
            Servicios?: components["schemas"]["Servicio"][] | null;
            /** @description Sets a certificar. */
            Sets?: components["schemas"]["Set"][] | null;
        };
        /**
         * Format: int32
         * @description Ambientes del SII.
         * @enum {integer}
         */
        Ambiente: 0 | 1;
        /** @description Resultado de la anulación masiva de folios. */
        AnulacionMasivaRestultadoAnular: {
            /**
             * Format: int32
             * @description Cantidad de folios anulados
             */
            Anulados?: number;
        };
        /** @description Un CAF autorizado por el SII para la empresa y el tipo, segun el listado de reobtencion. */
        CafAutorizado: {
            /**
             * Format: int64
             * @description Folios del CAF, con los dos extremos incluidos: FolioFinal - FolioInicial + 1. Es de solo lectura: la calcula la API.
             */
            Cantidad?: number;
            /** @description Fecha de autorizacion del CAF (yyyy-MM-dd). */
            FechaAutorizacion?: string | null;
            /**
             * Format: int64
             * @description Ultimo folio del CAF, incluido.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Primer folio del CAF.
             */
            FolioInicial?: number;
        };
        /** @description Algo que no se pudo revisar: un tramo de CAF de un tipo, o un tipo entero. */
        CafSinRevisar: {
            /**
             * Format: int64
             * @description Último folio del tramo que no se pudo revisar, incluido. Nulo cuando no se pudo revisar el tipo entero.
             */
            FolioFinal: number | null;
            /**
             * Format: int64
             * @description Primer folio del tramo que no se pudo revisar. Nulo cuando no se pudo revisar el tipo entero.
             */
            FolioInicial: number | null;
            /** @description Por qué no se pudo revisar: `SIN_PERMISO` (el certificado no tiene permiso sobre el tipo), `CAF_EXCEDE_TOPE` (el CAF tiene más folios de los que el SII permite consultar de una vez) o `DATOS_INCONSISTENTES` (el SII informó datos que no cuadran). */
            Motivo: string | null;
            /**
             * Format: int32
             * @description Tipo del documento DTE que no se pudo revisar.
             */
            TipoDocumento: number;
        };
        /** @description Un CAF vencido con folios disponibles. Sus límites reales, su fecha, su vencimiento y los tramos de folios que el SII todavía no recibió ni anuló. */
        CafVencidoPorAnular: {
            /**
             * Format: int64
             * @description Último folio del CAF, incluido: es el valor de cafFinal para anular.
             */
            CafFinal: number;
            /**
             * Format: int64
             * @description Primer folio del CAF: es el valor de cafInicial para anular.
             */
            CafInicial: number;
            /**
             * Format: int64
             * @description Folios del CAF que el SII todavía no recibió ni anuló. Pueden incluir folios ya usados en documentos que aún no se enviaron al SII. No reemplazan al foliado propio para decidir qué folios anular.
             */
            Disponibles: number;
            /** @description Fecha de autorización del CAF en el SII, en formato yyyy-MM-dd. */
            Fecha: string | null;
            /** @description Primer día en que el CAF ya no vale según la Res. Ex. SII N° 58/2017, en formato yyyy-MM-dd. Desde ese día el SII rechaza los documentos con folios de este CAF. */
            FechaVencimiento: string | null;
            /**
             * Format: int32
             * @description Tipo del documento DTE del CAF.
             */
            TipoDocumento: number;
            /** @description Los tramos de folios disponibles del CAF, ordenados de menor a mayor. Nunca es nula. */
            TramosDisponibles: components["schemas"]["RangoFolio"][] | null;
        };
        /** @description Datos de la certificación. */
        Certificacion: {
            /** @description Activiades economicas. */
            Actecos?: components["schemas"]["Acteco"][] | null;
            /** @description Clasificación del error, cuando la certificación está en estado de error. */
            ClasificacionError?: components["schemas"]["ClasificacionError"];
            /** @description Codigo de error. */
            CodigoError?: string | null;
            /** @description Comentario del estado. Util cuando se encuentra en error. */
            Comentario?: string | null;
            /** @description Direccion (Leida desde el SII) */
            Direccion?: string | null;
            /** @description Direccion modificada */
            DireccionModificada?: string | null;
            /** @description Direccion regional (Leida desde el SII) */
            DireccionRegional?: string | null;
            /** @description Direccion regional modificada */
            DireccionRegionalModificada?: string | null;
            /** @description Estado actual de la certificación. */
            Estado?: components["schemas"]["EstadoCertificacion"];
            /** @description Etapa en que se encuentra la certificación. */
            Etapa?: components["schemas"]["EtapaCertificacion"];
            /** @description Fecha de creacion. */
            Fecha?: string;
            /** @description Fecha del estado. */
            FechaEstado?: string;
            /** @description Giro comercial (Leida desde el SII) */
            Giro?: string | null;
            /** @description Giro comercial modificada */
            GiroModificado?: string | null;
            /**
             * Format: int32
             * @description Horas completas (unidad: horas; se trunca hacia abajo: 3 h 59 min son 3) que la certificación lleva sin que cambie nada de lo que se ve en esta respuesta. Se mide desde la más reciente entre `FechaEstado` y la fecha del último `CodigoError`, en hora de Chile. Un desfase de reloj devuelve 0; `null` significa que la certificación no tiene ninguna fecha de referencia. Un cambio de `PasoEnSII` que no mueva el estado interno de la certificación no lo reinicia.
             */
            HorasEnEstado?: number | null;
            /** @description Paso en que se encuentra la certificación cuando su `Etapa` es `ConfiguracionSII` (2). */
            PasoEnSII?: components["schemas"]["PasoCertificacion"];
            /** @description Listado de productos. */
            Productos?: components["schemas"]["Producto"][] | null;
            /** @description RUT de la empresa que se certifica. */
            RUT?: string | null;
            /** @description Razon social (Leida desde el SII) */
            RazonSocial?: string | null;
            /** @description Razon social modificada */
            RazonSocialModificada?: string | null;
            /**
             * Format: int32
             * @description Cuántas veces se reinició esta certificación a pedido de alguien (unidad: veces; entero mayor o igual a 0, nunca `null`). Cuenta los reinicios por la API y los del portal de administración; no cuenta los reintentos automáticos del proceso. El contador es por certificación y arranca en 0.
             */
            Reinicios?: number;
            /** @description Listado de servicios. */
            Servicios?: components["schemas"]["Servicio"][] | null;
            /** @description SETs para certificar. */
            Sets?: components["schemas"]["Set"][] | null;
        };
        /** @description Datos del certificado digital. */
        Certificado: {
            /** @description Contraseña del PFX, en claro o cifrada con la clave de cifrado del perfil del cliente. Dato sensible: no se registra en logs del integrador. */
            Contrasenna: string;
            /**
             * Format: byte
             * @description PFX del certificado, en base64. Dato sensible: no se registra en logs del integrador.
             */
            Data: string;
        };
        /**
         * Format: int32
         * @description Clasificaciones de los tipos de errores.
         * @enum {integer}
         */
        ClasificacionError: 0 | 1 | 2 | 3;
        /** @description Un CAF emitido para el RUT y el tipo de documento consultados: su rango de folios, la fecha y quién lo pidió. */
        ConsultaMasivaRestultadoCAF: {
            /**
             * Format: int64
             * @description Cantidad de folios en el CAF.
             */
            Cantidad?: number;
            /** @description Nombre de la persona que generó el CAF en el SII. */
            Dueno?: string | null;
            /** @description Fecha del CAF, como la informa el SII, en formato dd-mm-aaaa. */
            Fecha?: string | null;
            /**
             * Format: int64
             * @description Folio final del CAF.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Folio inicial del CAF.
             */
            FolioInicial?: number;
            /** @description RUT de la persona que generó el CAF en el SII. */
            RUTDueno?: string | null;
        };
        /** @description Los CAF de una empresa para un tipo de documento: la respuesta de caf_v1_listar y de caf_v1_anulacion_masiva_listar. */
        ConsultaMasivaRestultadoListar: {
            /** @description Un elemento por CAF. En caf_v1_listar nunca es nula: es una lista vacía si el SII no lista CAF de ese tipo para la empresa. */
            Cafs?: components["schemas"]["ConsultaMasivaRestultadoCAF"][] | null;
        };
        /** @description Cantidad de folios en cada estado. */
        ConteoDeFolios: {
            /**
             * Format: int64
             * @description Folios anulados en el SII.
             */
            Anulados?: number;
            /**
             * Format: int64
             * @description Folios que el SII todavía no recibió ni anuló: puede incluir folios ya usados en documentos que aún no se enviaron al SII. No reemplaza al foliado propio para decidir qué folios emitir ni qué folios anular.
             */
            Disponibles?: number;
            /**
             * Format: int64
             * @description Folios de documentos que el SII ya recibió.
             */
            Utilizados?: number;
        };
        /** @description Datos para crear una certificación: el certificado digital (PFX en base64 y su contraseña) y los sets a certificar. */
        CrearCertificacion: {
            /**
             * Format: byte
             * @description PFX del certificado, en base64. Dato sensible: no se registra en logs del integrador.
             */
            CertData: string;
            /** @description Contraseña del PFX, en claro o cifrada con la clave de cifrado del perfil del cliente. Dato sensible: no se registra en logs del integrador. */
            Contrasenna: string;
            /** @description Listado de sets a certificar. */
            Sets?: components["schemas"]["Set"][] | null;
            /** @description Certificar todos los sets posibles según el SII. Si es `true`, `Sets` se ignora. */
            TodosSets?: boolean;
        };
        /** @description Reinicia la certificación y, opcionalmente, actualiza sus datos. */
        DatosReiniciar: {
            /** @description Actualizar los datos del certificado. (v2+) */
            Certificado?: components["schemas"]["Certificado"] | null;
            /** @description Direccion */
            Direccion?: string | null;
            /** @description Direccion regional */
            DireccionRegional?: string | null;
            /** @description Giro comercial */
            Giro?: string | null;
            /** @description Motivo por el cual se reinicia la certificación. */
            Motivo?: string | null;
            Paso?: components["schemas"]["ReiniciarProceso"];
            /** @description Listado de productos. (nombre;precio) */
            Productos?: components["schemas"]["Producto"][] | null;
            /** @description Razon social */
            RazonSocial?: string | null;
            /** @description Referencia */
            Referencia?: string | null;
            /** @description Listado de servicios. (nombre;precio) */
            Servicios?: components["schemas"]["Servicio"][] | null;
            /** @description Sets a certificar. */
            Sets?: components["schemas"]["Set"][] | null;
        };
        /** @description Datos para descargar un certificado. */
        DescargaCertificado: {
            /** @description Contraseña de la cuenta en E-Cert. Dato sensible: no se registra en logs del integrador. */
            Contrasenna?: string | null;
            /** @description Contraseña con la que E-Cert protege el PFX descargado. Dato sensible: no se registra en logs del integrador. */
            ContrasennaPfx?: string | null;
            /** @description Usuario que viene en el correo de E-cert de descarga. */
            Usuario?: string | null;
        };
        /** @description La URL firmada del archivo y hasta cuándo sirve. */
        DescargaDeRespaldo: {
            /**
             * Format: uri
             * @description URL del archivo .zip, firmada y válida por 15 minutos. Pídala con un GET **sin** el header `Authorization` ni ningún otro de esta API: lleva su propia firma. El archivo baja con el nombre `mipyme-backup-<RUT>.zip`.
             */
            url: string;
            /** @description Hasta cuándo sirve `url`, `yyyy-MM-ddTHH:mm:ss` con el desfase horario (`-03:00`). */
            vence: string;
        };
        /** @description El detalle de un CAF. Sus límites reales y su fecha, y sus folios por estado solo de la parte del CAF que cae en el rango consultado. */
        DetalleDeCaf: {
            /**
             * Format: int64
             * @description Folios del CAF dentro del rango consultado que están anulados en el SII.
             */
            Anulados?: number;
            /**
             * Format: int64
             * @description Último folio del CAF, incluido. Es el límite real del CAF aunque el rango consultado termine antes: es el valor de cafFinal para anular.
             */
            CafFinal?: number;
            /**
             * Format: int64
             * @description Primer folio del CAF. Es el límite real del CAF aunque el rango consultado empiece después: es el valor de cafInicial para anular.
             */
            CafInicial?: number;
            /**
             * Format: int64
             * @description Folios disponibles del CAF dentro del rango consultado: el SII todavía no los recibió ni los anuló. Pueden incluir folios ya usados en documentos que aún no se enviaron al SII. No reemplazan al foliado propio para decidir qué folios emitir ni qué folios anular.
             */
            Disponibles?: number;
            /** @description En boletas (tipos 39 y 41), `true` si el CAF se autorizó antes de que las boletas se enviaran al SII una por una. Cuando es `true`, los `Disponibles` de ese CAF pueden incluir folios ya usados y no deben tomarse de esta respuesta para anular: qué folios de ese CAF anular lo dice el foliado propio. `false` en cualquier otro caso. */
            DisponiblesSinVerificar: boolean;
            /** @description Fecha de autorización del CAF en el SII, en formato yyyy-MM-dd. */
            Fecha?: string | null;
            /** @description Los tramos de folios del CAF dentro del rango consultado, por estado. */
            Rangos?: components["schemas"]["RangosPorEstado"] | null;
            /**
             * Format: int64
             * @description Folios del CAF dentro del rango consultado que el SII ya recibió en un documento.
             */
            Utilizados?: number;
        };
        /** @description Información de los documento permitidos/denegados en el SII. */
        Documento: {
            /** @description Codigo del tipo de documento. */
            Codigo?: string | null;
            /** @description Denegado desde. */
            FechaDenegado?: string | null;
            /** @description Permitido desde. */
            FechaPermitido?: string | null;
            /** @description Nombre del documento. */
            Nombre?: string | null;
        };
        /** @description Datos de la empresa. */
        Empresa: {
            /** @description Area, departamento o giro. */
            Area?: string | null;
            /** @description Ciudad. */
            Ciudad: string;
            /** @description Comuna. */
            Comuna: string;
            /** @description Direccion. */
            Direccion: string;
            /** @description Nombre de la empresa. */
            Nombre: string;
            /** @description Región, con el nombre exacto de la lista de la API: la comparación es literal y casi todos los nombres terminan en un espacio (p. ej. «METROPOLITANA DE SANTIAGO »). */
            Region: string;
            /** @description Cedula de identidad (RUT). */
            Rut: string;
        };
        /** @description Informacion de una empresa. */
        EmpresaInfo: {
            /** @description Activiades economicas. */
            Actecos?: components["schemas"]["Acteco"][] | null;
            /** @description Direccion (Leida desde el SII) */
            Direccion?: string | null;
            /** @description Direccion regional (Leida desde el SII) */
            DireccionRegional?: string | null;
            /** @description Documentos registrados en el SII (Homologación). */
            DocumentosHomo?: components["schemas"]["Documento"][] | null;
            /** @description Documentos registrados en el SII (Producíón). */
            DocumentosProd?: components["schemas"]["Documento"][] | null;
            /** @description Fecha de resolución. */
            FechaResolucion?: string | null;
            /** @description Giro comercial (Leida desde el SII) */
            Giro?: string | null;
            /**
             * Format: int32
             * @description Número de resolución.
             */
            NumeroResolucion?: number;
            /** @description RUT de la empresa consultada, normalizado por la API. */
            RUT?: string | null;
            /** @description Razon social (Leida desde el SII) */
            RazonSocial?: string | null;
            /** @description Sucursales registradas en el SII. */
            Sucursales?: components["schemas"]["Sucursal"][] | null;
        };
        /** @description Error de ASP.NET Web API: verbo incorrecto, media type no soportado, parámetro de query obligatorio ausente (404), parámetro que no convierte (400), request sin credenciales (401) o excepción no controlada. Una URL que no corresponde a ninguna operación en general no llega a la API y no responde con este objeto, sino con una página HTML del servidor web (inferido del código, no verificado contra el servidor desplegado). */
        ErrorFramework: {
            ExceptionMessage?: string;
            ExceptionType?: string;
            Message: string;
            MessageDetail?: string;
            StackTrace?: string | null;
        };
        /** @description `CODIGO:mensaje`, `CODIGO:SUBCODIGO:mensaje -- excepción`, o el mensaje solo (403, 404, 410, 501). */
        ErrorTextoPlano: string;
        /** @description Estadisticas de las certificaciones. */
        Estadisticas: {
            /** @description Certificaciones en cada estado. */
            PorEstado?: {
                [key: string]: number;
            } | null;
            /** @description Certificaciones en cada etapa. */
            PorEtapa?: {
                [key: string]: number;
            } | null;
            /** @description Certificaciones en cada paso. */
            PorPasoEnSII?: {
                [key: string]: number;
            } | null;
            /**
             * Format: int32
             * @description Total de certificaciones.
             */
            Total?: number;
        };
        /**
         * Format: int32
         * @description Posible estados de la certificación.
         * @enum {integer}
         */
        EstadoCertificacion: 0 | 1 | 2 | 3;
        /**
         * Format: int32
         * @description Etapas por las que transita la certificación.
         * @enum {integer}
         */
        EtapaCertificacion: 0 | 1 | 2 | 3 | 4;
        /** @description Los respaldos de una empresa, el más nuevo primero. */
        ListaDeRespaldos: {
            /** @description Los respaldos, el más nuevo primero; vacía si no hay ninguno que mostrar. */
            respaldos: components["schemas"]["Respaldo"][];
        };
        /** @description Los datos para crear una sesión del widget de portabilidad. Las claves van en snake_case. */
        NuevaSesionDePortabilidad: {
            /** @description Correo de notificaciones del usuario final. Opcional. */
            email?: string | null;
            /**
             * @description Solo con `prueba` en `true`: el guion que recorre la sesión de prueba. Con `escenario`, el guion de la empresa empieza de cero; sin él, sigue donde iba (`camino_feliz` si es la primera). Si no quiere elegir uno, omítalo o mande `null`.
             * @enum {string|null}
             */
            escenario?: "camino_feliz" | "certificado_no_administrador" | "conflicto" | "respaldo_en_curso" | "resolucion_emitida" | null;
            /** @description true para una sesión de prueba. Por omisión, false. */
            prueba?: boolean;
            /** @description Su identificador del usuario o del trámite, de hasta 100 caracteres. Opcional. */
            referencia_externa?: string | null;
            /** @description RUT de la empresa, con o sin puntos y con guion. Es el único RUT que la sesión puede leer. */
            rut: string;
            /** @description URL https a la que vuelve el usuario al terminar. Opcional. */
            url_retorno?: string | null;
        };
        /**
         * Format: int32
         * @description Pasos por los que transita la certificación en el SII.
         * @enum {integer}
         */
        PasoCertificacion: 0 | 1 | 2 | 3 | 4 | 5;
        /** @description Una generacion de detalle del RCV que el SII tiene en curso para la empresa. */
        PendienteDeUltimoFolio: {
            /** @description Identificador opaco de la solicitud en el SII. */
            Id?: string | null;
            /** @description Periodo (yyyy-MM) que esa solicitud cubre. */
            Periodo?: string | null;
        };
        /** @description Datos del producto. */
        Producto: {
            /** @description Nombre del producto. */
            Nombre?: string | null;
            /**
             * Format: int32
             * @description Precio del producto.
             */
            Precio?: number;
        };
        /** @description Un tramo de folios, con los dos extremos incluidos. */
        RangoFolio: {
            /**
             * Format: int64
             * @description Último folio del tramo, incluido.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Primer folio del tramo.
             */
            FolioInicial?: number;
        };
        /** @description Un rango de folios anulados. */
        RangoFolioAnulado: {
            /**
             * Format: int64
             * @description Cantidad de folios del rango, con los dos extremos incluidos: FolioFinal - FolioInicial + 1 (de 1667 a 2166 son 500; de 900 a 950, 51). Es de solo lectura: la calcula la API.
             */
            Cantidad?: number;
            /**
             * Format: int64
             * @description Ultimo folio anulado del rango, incluido.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Primer folio anulado del rango.
             */
            FolioInicial?: number;
        };
        /** @description Los tramos de folios de un CAF, separados por estado. Cada lista viene ordenada de menor a mayor y vacía cuando no hay folios en ese estado; nunca es nula. */
        RangosPorEstado: {
            /** @description Tramos de folios anulados en el SII. */
            Anulados?: components["schemas"]["RangoFolio"][] | null;
            /** @description Tramos de folios que el SII todavía no recibió ni anuló. Pueden incluir folios ya usados en documentos que aún no se enviaron al SII. No reemplazan al foliado propio para decidir qué folios emitir ni qué folios anular. */
            Disponibles?: components["schemas"]["RangoFolio"][] | null;
            /** @description Tramos de folios de documentos que el SII ya recibió. */
            Utilizados?: components["schemas"]["RangoFolio"][] | null;
        };
        /**
         * Format: int32
         * @description Procesos que se pueden reiniciar de la certificación.
         * @enum {integer}
         */
        ReiniciarProceso: 0 | 1 | 2;
        /** @description Un respaldo MiPyme: el bloque `respaldo` del aviso por webhook con su `id` adelante. Las claves vienen siempre en el orden de esta tabla y con `null` explícito; `codigo` aparece solo con `fallido`. Los ejemplos de la referencia muestran las claves ordenadas alfabéticamente: el orden real es el de esta tabla. */
        Respaldo: {
            /**
             * Format: int64
             * @description Tamaño del archivo .zip en bytes.
             */
            bytes: number | null;
            /**
             * @description Cómo salió el catálogo de productos del archivo: `normalizado` (agrupado) o `sin_normalizar` (tal como vino en los documentos). El archivo vale igual en los dos casos.
             * @enum {string|null}
             */
            catalogo: "normalizado" | "sin_normalizar" | null;
            /** @description Solo con `fallido` (y entonces siempre presente, aunque sea `null`): por qué falló, por ejemplo `SIN_ACCESO_MIPYME`. Es un código del respaldo, no un error de la API. */
            codigo?: string | null;
            /**
             * Format: date
             * @description Fecha (`yyyy-MM-dd`) hasta la que el respaldo trae los documentos de la empresa.
             */
            completo_hasta: string | null;
            /**
             * Format: date
             * @description El último día (`yyyy-MM-dd`, hora de Chile) en que el archivo se puede descargar: ese día entero, hasta las 23:59:59. Desde las 00:00 del día siguiente el respaldo está `vencido`. Con `listo`, siempre una fecha; con `vencido`, la fecha si llegó a estar listo, y `null` si venció sin haber estado listo (no hubo archivo); con `en_proceso` y `fallido`, `null`.
             */
            disponible_hasta: string | null;
            /** @description Cuántos documentos tiene el archivo; `null` mientras no se sepa. */
            documentos: {
                /**
                 * Format: int32
                 * @description Documentos emitidos en el archivo.
                 */
                emitidos: number | null;
                /**
                 * Format: int32
                 * @description Documentos que el portal del SII listó pero no se pudieron bajar o leer; van detallados en `faltantes.json`, dentro del archivo.
                 */
                faltantes: number | null;
                /**
                 * Format: int32
                 * @description Documentos recibidos en el archivo.
                 */
                recibidos: number | null;
            };
            /**
             * @description `en_proceso`: el archivo se está armando. `listo`: se puede descargar hasta `disponible_hasta`, inclusive. `fallido`: terminó con un error y no hay archivo (el motivo en `codigo`). `vencido`: pasó `disponible_hasta` y el archivo ya no se entrega.
             * @enum {string}
             */
            estado: "en_proceso" | "listo" | "fallido" | "vencido";
            /** @description Identificador del respaldo, 32 caracteres hexadecimales en minúscula. */
            id: string;
            /**
             * Format: uri
             * @description Con `listo`, la URL de la descarga en esta API (`.../v1/respaldos/{id}/descargar`), que se llama con su usuario y su APIKey. `null` en los demás estados, y también en un `listo` mientras la API no publique esa URL: descargue entonces con `respaldos_v1_descargar` y el `id`.
             */
            url: string | null;
        };
        /** @description Resultado de la consulta de uso folios. */
        RestultadoConsultaFolios: {
            /** @description Solo en el camino nuevo. Los CAF que el SII tiene autorizados para la empresa y el tipo, del más reciente al más antiguo, sin límite de 6 meses. Vacío con `SIN_CAF`; no viene con `EN_CURSO` ni con `CODE_ERROR_CERTIFICATE_PERM`. Se consulta en cada llamada: nunca se reutiliza un listado anterior. */
            Cafs?: components["schemas"]["CafAutorizado"][] | null;
            /** @description Solo con mesesVentana. Cuando se armo esta respuesta (ISO 8601, UTC). */
            ConsultadoEn?: string | null;
            /** @description Solo con mesesVentana. De donde salio el ultimo folio emitido: RCV (Registro de Compras y Ventas, boletas 39 y 41) o CONSEMITIDOS (consulta de documentos emitidos, los demas tipos). Ausente cuando no se consulto ninguna fuente (SIN_CAF, EN_CURSO). */
            Fuente?: string | null;
            /**
             * Format: int32
             * @description Solo con mesesVentana. Cuantos periodos se consultaron de verdad en esta llamada (los que ya estaban en memoria no cuentan).
             */
            MesesRecorridos?: number | null;
            /**
             * Format: int32
             * @description Solo en el camino nuevo. Meses que se iban a recorrer: el menor entre `mesesVentana`, el máximo de la plataforma y los meses hasta el CAF más antiguo. Viene en toda respuesta del camino nuevo, en 0 cuando no se recorrió nada (`SIN_CAF`, `EN_CURSO`). Si no viene, la respuesta salió por el camino de siempre (sin `mesesVentana`, o el cliente no tiene habilitada la ventana extendida).
             */
            MesesVentanaEfectiva?: number | null;
            /** @description Solo con mesesVentana y estado RCV_EN_PROCESO. La generacion del detalle que el SII tiene en curso; la proxima llamada la reutiliza. */
            Pendiente?: components["schemas"]["PendienteDeUltimoFolio"] | null;
            /** @description Solo con mesesVentana y estado OK. Periodo (yyyy-MM) de la ultima emision encontrada. */
            PeriodoUltimaEmision?: string | null;
            /** @description Solo con mesesVentana. Si repetir la misma llamada puede dar mas (WINDOW_PARTIAL, RCV_EN_PROCESO, EN_CURSO, ERROR_FUENTE). */
            Reintentable?: boolean | null;
            /**
             * Format: int32
             * @description Solo con mesesVentana y Reintentable true. En cuantos segundos conviene repetir.
             */
            ReintentarEnSegundos?: number | null;
            /**
             * Format: int64
             * @description Ultimo folio anulado. (Puede ser nulo si ocurre algun error)
             */
            UltimoAnulado?: number | null;
            /** @description Posibles estados: `OK`; `CODE_ERROR_ENTERPRISE_IS_MYPYME` (la empresa usa el sistema de facturación del SII y no es posible ver los folios anulados); `CODE_ERROR_CERTIFICATE_PERM` (el titular del certificado no tiene permisos para ver los documentos emitidos); `ERROR` (error no controlado). En el camino nuevo (con `mesesVentana`) se calcula igual que en el de siempre, salvo en `SIN_CAF`, `EN_CURSO`, `CODE_ERROR_ENTERPRISE_IS_MYPYME` y el `CODE_ERROR_CERTIFICATE_PERM` del listado de CAF (ver `UltimoEnviadoEstado`), donde no se consulta y viene nulo, igual que `UltimoAnulado`. También viene nulo, con los dos campos, cuando a la consulta no le quedó tiempo para los anulados: no se consultaron, que no es lo mismo que `ERROR`. */
            UltimoAnuladoEstado?: string | null;
            /**
             * Format: int64
             * @description Ultimo folio enviado. (Puede ser nulo si ocurre algun error)
             */
            UltimoEnviado?: number | null;
            /**
             * @description Camino de siempre (sin `mesesVentana`): `OK`; `NO_FOLIO_IN_6_MONTHS` (no se encontraron
             *     documentos en los últimos 6 meses); `CODE_ERROR_CERTIFICATE_PERM` (el titular del certificado no
             *     tiene permisos para ver los documentos emitidos); `ERROR` (error no controlado).
             *
             *     Camino nuevo (con `mesesVentana` y la ventana extendida habilitada), cada estado con su
             *     `Reintentable`. `UltimoEnviado` es nulo salvo en `OK`.
             *
             *     - `OK`: `UltimoEnviado` trae el último folio emitido y `PeriodoUltimaEmision`, el mes.
             *       Reintentable: no.
             *     - `NO_EMISSIONS_IN_WINDOW`: no hay emisiones en los meses recorridos; `Cafs` y
             *       `UltimoFolioAutorizado` sí vienen. Reintentable: no. Si `VentanaCubreTodosLosCaf` es true, se
             *       recorrió hasta el CAF más antiguo y pedir más meses no cambia nada. Si es false, la ventana se
             *       cortó antes: cuando `MesesVentanaEfectiva` es menor que el `mesesVentana` pedido, la cortó el
             *       máximo de la plataforma y pedir más tampoco cambia nada; cuando es igual, pudo cortarla el
             *       parámetro o el máximo (por omisión los dos son 36), y solo un `mesesVentana` mayor dice si hay
             *       más. También es false si el listado de CAF del SII no se pudo leer entero (una fila ilegible, o
             *       más páginas que las que se recorren): entonces puede faltar un CAF en `Cafs` y en
             *       `UltimoFolioAutorizado`, y repetir la consulta puede traerlo.
             *     - `SIN_CAF`: el SII no tiene CAF autorizados para la empresa y el tipo, o la empresa no tiene
             *       habilitado ese tipo para timbraje electrónico. `Cafs` vacío, sin `Fuente` ni anulados.
             *       Reintentable: no.
             *     - `WINDOW_PARTIAL`: se acabó el tiempo de la consulta antes de recorrer todos los meses.
             *       Reintentable: sí, en 5 segundos (`ReintentarEnSegundos`); los meses ya resueltos no se vuelven a
             *       consultar, así que cada reintento avanza.
             *     - `RCV_EN_PROCESO`: el SII sigue generando el detalle del Registro de Compras y Ventas (boletas);
             *       `Pendiente` dice cuál. Reintentable: sí, en 10 segundos; la llamada siguiente reutiliza esa
             *       misma generación.
             *     - `EN_CURSO`: otra consulta igual (mismo RUT, tipo y ambiente; las boletas 39 y 41 cuentan como
             *       el mismo tipo, porque se leen del mismo detalle del RCV) está en curso; no se consultó al SII y
             *       no vienen `Cafs`, `Fuente` ni anulados. Reintentable: sí, en 5 segundos.
             *     - `ERROR_FUENTE`: la fuente de emisiones no pudo responder; `Cafs`, `UltimoFolioAutorizado` y
             *       anulados sí vienen. Reintentable: sí, en 30 segundos.
             *     - `CODE_ERROR_CERTIFICATE_PERM`: el titular del certificado no es usuario autorizado de la empresa
             *       en la fuente. `Cafs` y `UltimoFolioAutorizado` no vienen; `MesesVentanaEfectiva` y
             *       `VentanaCubreTodosLosCaf` sí. Si el SII ya no deja ver el listado de CAF de la empresa, la
             *       consulta termina ahí: tampoco vienen `Fuente` ni anulados, `MesesVentanaEfectiva` y
             *       `MesesRecorridos` vienen en 0 y `VentanaCubreTodosLosCaf` nulo. Reintentable: no.
             *     - `CODE_ERROR_ENTERPRISE_IS_MYPYME`: la empresa factura con el sistema de facturación del SII y
             *       el SII no muestra su listado de CAF; es el mismo valor que `UltimoAnuladoEstado` da en ese
             *       caso. No vienen `Cafs`, `UltimoFolioAutorizado`, `Fuente` ni anulados; `MesesVentanaEfectiva`
             *       y `MesesRecorridos` vienen en 0. Reintentable: no.
             */
            UltimoEnviadoEstado?: string | null;
            /**
             * Format: int64
             * @description Solo con mesesVentana. El FolioFinal mas alto de Cafs. Informativo: NO usarlo como ultimoFolio de descargar, porque con ese valor la reobtencion nunca encuentra un CAF que devolver y siempre se timbra uno nuevo. Para recuperar un CAF perdido, usar reobtener o descargar con ultimoFolio = FolioInicial - 1 de ese CAF.
             */
            UltimoFolioAutorizado?: number | null;
            /** @description Solo en el camino nuevo; nulo en `SIN_CAF` y `EN_CURSO`. true si se recorrió hasta el mes del CAF más antiguo. false si el máximo de la plataforma o el propio `mesesVentana` cortaron la búsqueda antes (repetir con más meses puede dar más, hasta el máximo), si alguna fecha de autorización no se pudo leer, o si el listado de CAF del SII no se pudo leer entero (una fila ilegible, o más páginas que las que se recorren): en esos dos últimos casos puede faltar un CAF en `Cafs` y en `UltimoFolioAutorizado`. */
            VentanaCubreTodosLosCaf?: boolean | null;
        };
        /** @description Resultado de la consulta de rangos de folios anulados. El nombre del esquema conserva la grafía histórica («Restultado»), igual que RestultadoConsultaFolios y AnulacionMasivaRestultadoAnular. */
        RestultadoFoliosAnulados: {
            /** @description Posibles estados: `OK`; `CODE_ERROR_ENTERPRISE_IS_MYPYME` (la empresa usa el sistema de facturación del SII y no es posible ver sus folios anulados); `CODE_ERROR_CERTIFICATE_PERM` (el titular del certificado no tiene permisos para ver los documentos emitidos). Una falla no controlada no llega en este campo: sale como HTTP 500 con el código `UKN`. La respuesta viaja con HTTP 200 aunque este campo traiga un `CODE_ERROR_*`, igual que en la consulta de uso de folios: un 200 no significa éxito; revise `Estado`. */
            Estado?: string | null;
            /** @description Rangos de folios anulados, uno por fila de la tabla del SII y en el orden en que el SII los envía. Lista vacía cuando la empresa no registra folios anulados para el documento, y también cuando `Estado` trae un error. Nunca viene nula. */
            Rangos?: components["schemas"]["RangoFolioAnulado"][] | null;
            /** @description RUT de la empresa consultada, normalizado con guion y digito verificador. */
            Rut?: string | null;
            /**
             * Format: int32
             * @description Tipo del documento DTE consultado.
             */
            TipoDocumento?: number;
        };
        /** @description Resultado de la revisión de CAF vencidos: los CAF vencidos según la Res. Ex. SII N° 58/2017 que todavía tienen folios disponibles, que deben anularse. */
        ResultadoCafVencidos: {
            /**
             * Format: int32
             * @description Ambiente consultado en el SII: 0 homologación (certificación), 1 producción.
             */
            Ambiente: number;
            /** @description De la cadena entera de llamadas encadenadas con `continuar`, no solo de esta respuesta: `true` solo en la última respuesta (la que trae `Continuar` nulo) y solo si ninguna respuesta de la cadena trajo `SinRevisar`. `false` mientras haya que seguir con `Continuar`, o si algo quedó sin revisar. */
            Completo: boolean;
            /** @description El valor a enviar tal cual en el parámetro `continuar` de la llamada siguiente para seguir la revisión donde quedó. Es opaco: el cliente no lo interpreta ni lo arma. Nulo cuando la revisión terminó, con `Completo` en `true` o, si algo quedó en `SinRevisar`, en `false`. */
            Continuar: string | null;
            /** @description Fecha de Chile con la que se decidió qué CAF están vencidos, en formato yyyy-MM-dd. */
            Fecha: string | null;
            /** @description Los CAF vencidos que tienen folios disponibles, que deben anularse. Vacía si no hay ninguno; nunca es nula. */
            PorAnular: components["schemas"]["CafVencidoPorAnular"][] | null;
            /** @description Los totales de esta respuesta. Cuentan solo lo revisado en esta llamada: si la revisión sigue con `Continuar`, el cliente suma los de cada llamada. */
            Resumen: components["schemas"]["ResumenCafVencidos"] | null;
            /** @description RUT de la empresa consultada, normalizado con guion y dígito verificador. */
            Rut: string | null;
            /** @description Lo que no se pudo revisar en esta llamada, con el motivo. Vacía si se revisó todo; nunca es nula. */
            SinRevisar: components["schemas"]["CafSinRevisar"][] | null;
        };
        /** @description Resultado del detalle de folios: los tramos disponibles, utilizados y anulados de cada CAF que toca el rango consultado. */
        ResultadoDetalleFolios: {
            /** @description Los CAF que tocan el rango consultado, ordenados por su primer folio. Los conteos y los tramos de cada uno cubren solo la parte del CAF que cae en el rango. */
            Cafs?: components["schemas"]["DetalleDeCaf"][] | null;
            /**
             * Format: int64
             * @description Último folio del rango consultado, incluido. Si no se pidió rango, el último folio del último CAF del tipo.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Primer folio del rango consultado. Si no se pidió rango, el primer folio del primer CAF del tipo.
             */
            FolioInicial?: number;
            /** @description Los tramos del rango consultado que no pertenecen a ningún CAF de la empresa para el tipo. Esos folios no se informan en ningún estado y no se pueden anular. Vacía si no se pidió rango. */
            FoliosFueraDeCaf?: components["schemas"]["RangoFolio"][] | null;
            /** @description RUT de la empresa consultada, normalizado con guion y dígito verificador. */
            Rut?: string | null;
            /**
             * Format: int32
             * @description Tipo del documento DTE consultado.
             */
            TipoDocumento?: number;
            /** @description La suma de los conteos de todos los CAF de Cafs. */
            Totales?: components["schemas"]["ConteoDeFolios"] | null;
        };
        /** @description Estado de un rango de folios según el SII: cuántos el SII todavía no recibió ni anuló, cuántos ya no permite anular y cuántos se anularon. `Cantidad` = `Disponibles` + `Utilizados` + `Anulados`, siempre. */
        ResultadoEstadoFolios: {
            /**
             * Format: int64
             * @description Folios del rango anulados en el SII.
             */
            Anulados?: number;
            /**
             * Format: int64
             * @description Folios del rango: `FolioFinal` - `FolioInicial` + 1.
             */
            Cantidad?: number;
            /**
             * Format: int64
             * @description Folios del rango que el SII todavía no recibió ni anuló: puede incluir folios que usted ya usó en documentos que aún no envió al SII. No use este número para decidir qué folios emitir: use su propio foliado.
             */
            Disponibles?: number;
            /**
             * Format: int64
             * @description Último folio del rango consultado, incluido.
             */
            FolioFinal?: number;
            /**
             * Format: int64
             * @description Primer folio del rango consultado.
             */
            FolioInicial?: number;
            /** @description RUT de la empresa consultada, normalizado con guion y dígito verificador. */
            Rut?: string | null;
            /**
             * Format: int32
             * @description Tipo del documento DTE consultado.
             */
            TipoDocumento?: number;
            /**
             * Format: int64
             * @description Folios del rango que el SII ya no permite anular: en la práctica, los de documentos que el SII recibió. No viene del SII: se calcula como `Cantidad` - `Disponibles` - `Anulados`. El conteo de recibidos del SII no se usa porque no es confiable.
             */
            Utilizados?: number;
        };
        /** @description Los totales de una respuesta de CAF vencidos. */
        ResumenCafVencidos: {
            /**
             * Format: int32
             * @description Cantidad de CAF vencidos con folios disponibles: las entradas de `PorAnular`.
             */
            CafPorAnular: number;
            /**
             * Format: int32
             * @description Cantidad de CAF vencidos revisados en esta llamada, tengan o no folios disponibles.
             */
            CafVencidosRevisados: number;
            /**
             * Format: int64
             * @description Suma de los folios disponibles de todos los CAF de `PorAnular`.
             */
            FoliosPorAnular: number;
        };
        /** @description Datos del servicio. */
        Servicio: {
            /** @description Nombre del servicio. */
            Nombre?: string | null;
            /**
             * Format: int32
             * @description Precio del servicio.
             */
            Precio?: number;
        };
        /** @description Una sesión del widget de portabilidad, recién creada. Las claves vienen siempre en el orden de esta tabla. Los ejemplos de la referencia muestran las claves ordenadas alfabéticamente: el orden real es el de esta tabla. */
        SesionDePortabilidad: {
            /** @description El secreto de la sesión: `ws_`, el `id` de la sesión, `_` y 43 caracteres (`ws_<id>_<43 caracteres>`). Una sesión de prueba (`prueba` en `true`) lo lleva con el prefijo `wst_` en vez de `ws_`: el prefijo dice el modo a simple vista. Ni el prefijo ni el `id` son secretos; lo que autoriza es el texto entero. Se entrega **una sola vez**, en esta respuesta: la API guarda solo un resumen y no puede volver a mostrarlo. Páselo al widget en el navegador y no lo guarde ni lo registre en su servidor; si lo pierde, cree otra sesión. */
            client_secret: string;
            /**
             * @description El escenario que recorre la sesión de prueba: el que mandó en `escenario`, o, si no mandó ninguno, el que la empresa ya venía recorriendo en sus sesiones de prueba (`camino_feliz` si es la primera). `null` en una sesión real. Agregado en la 1.15.0, al final: las claves anteriores no se movieron.
             * @enum {string|null}
             */
            escenario: "camino_feliz" | "certificado_no_administrador" | "conflicto" | "respaldo_en_curso" | "resolucion_emitida" | null;
            /** @description Cuándo vence la sesión, 60 minutos después de crearla: `yyyy-MM-ddTHH:mm:ss` con el desfase horario de Chile, `-03:00` o `-04:00` según la época del año. Desde ese instante el `client_secret` ya no sirve. */
            expira: string;
            /** @description Identificador público de la sesión: 32 caracteres hexadecimales en minúscula. No es secreto y no autoriza nada por sí solo. */
            id: string;
            /** @description El valor de `prueba` del pedido. */
            prueba: boolean;
        };
        /**
         * Format: int32
         * @description Sets posibles a certificar.
         * @enum {integer}
         */
        Set: 33 | 34 | 39 | 41 | 43 | 46 | 52 | 110;
        /** @description Solicitud de certificado. */
        SolicitudCertificado: {
            /** @description Datos de la empresa. */
            Empresa?: components["schemas"]["Empresa"] | null;
            /** @description Datos del representante legal. */
            Subscriptor?: components["schemas"]["Subscriptor"] | null;
        };
        /** @description Datos del subscriptor */
        Subscriptor: {
            /** @description Apellido materno. */
            ApeMaterno?: string | null;
            /** @description Apellido paterno. */
            ApePaterno: string;
            /** @description Ciudad. */
            Ciudad: string;
            /** @description Comuna. */
            Comuna: string;
            /** @description Fotocopia de la cédula de identidad, en PDF codificado en base64, de hasta 2 MB. */
            CopiaCedula: string;
            /** @description Correo electrónico. */
            Correo: string;
            /** @description Direccion. */
            Direccion: string;
            /** @description Nombre del titular. */
            Nombre: string;
            /** @description Región, con el nombre exacto de la lista de la API: la comparación es literal y casi todos los nombres terminan en un espacio (p. ej. «METROPOLITANA DE SANTIAGO »). */
            Region: string;
            /** @description Cedula de identidad (RUT). */
            Rut: string;
            /** @description Número de serie de la cédula de identidad o número de documento. */
            Serie: string;
            /** @description Telefono. */
            Telefono: string;
        };
        /** @description Información de la sucursal. */
        Sucursal: {
            /** @description Codigo de la sucursal. */
            Codigo?: string | null;
            /** @description Dirección. */
            Direccion?: string | null;
            /** @description Tipo de dirección. */
            TipoDireccion?: string | null;
        };
    };
    responses: {
        /** @description Error de negocio de la API en texto plano, o del framework en JSON. Los headers `X-Codigo-Error` y `X-Reintentable` vienen en todo error con código: los 500 y, en el respaldo MiPyme (`v1/respaldos`), también el 404, el 409 y el 410 (`RESPALDO_*`), y, en folios y respaldos, el 403 `FUNCION_NO_CONTRATADA` y el 503 `FUNCION_NO_VERIFICABLE`; `Retry-After`, solo en los reintentables. El 404 de negocio de las certificaciones, que trae solo el mensaje («No existe una certificación…»), no los trae. Si la respuesta trae `X-Codigo-Error`, decide el código, también en un 409: ver «Precedencia» en la descripción general y la regla de precedencia de la guía «Errores y reintentos». */
        ErrorNegocio: {
            headers: {
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "Retry-After": components["headers"]["Retry-After"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                "X-Respuesta-De-Memoria": components["headers"]["X-Respuesta-De-Memoria"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorFramework"];
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description `FUNCION_NO_CONTRATADA`: su cuenta no tiene contratada la API de folios. La función se contrata
         *     aparte: para contratarla, escriba a soporte@enrolamiento.cl. No reintente; la respuesta es la
         *     misma mientras la función no esté habilitada para su cuenta.
         *
         *     La API responde antes de ejecutar la operación: no valida el certificado, no consulta al SII y no
         *     pide ni anula folios. Trae `X-Codigo-Error`, `X-Reintentable: no` y `Cache-Control: no-store`.
         *
         *     Con el RUT `1-9` o un RUT de prueba del cliente no responde este `403`: la operación responde
         *     como siempre con esos RUT, sin consultar al SII, aunque la API de folios no esté contratada.
         *     Rige desde el despliegue de la API que lo incluye (contrato 1.14.2); hasta entonces responde
         *     este `403` también con el RUT de prueba. El `503` `FUNCION_NO_VERIFICABLE` no cambia.
         */
        FoliosNoContratados: {
            headers: {
                /** @description Siempre `no-store`: no guarde esta respuesta en ninguna caché. */
                "Cache-Control"?: string;
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_CONTRATADA:La funcion folios no esta contratada para esta cuenta. Para contratarla escriba a soporte@enrolamiento.cl. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description `FUNCION_NO_VERIFICABLE`: la API no pudo verificar en ese momento si su cuenta tiene contratada la
         *     API de folios. Es una falla transitoria de nuestro lado, y la operación no se ejecutó: no se
         *     validó el certificado, no se consultó al SII y no se pidieron ni anularon folios. Repita el mismo
         *     request pasados los segundos de `Retry-After`.
         *
         *     Trae `X-Codigo-Error`, `X-Reintentable: si`, `Retry-After` y `Cache-Control: no-store`.
         */
        FoliosNoVerificables: {
            headers: {
                /** @description Siempre `no-store`: no guarde esta respuesta en ninguna caché. */
                "Cache-Control"?: string;
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "Retry-After": components["headers"]["Retry-After"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_VERIFICABLE:No se pudo verificar si la funcion folios esta contratada para esta cuenta. Reintente en unos segundos. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description Se superó el rate limit: **409 Conflict**, no 429. El request no se ejecutó.
         *
         *     Llega **sin** `X-Codigo-Error`: un 409 con ese header es un error de negocio de la operación y
         *     lo decide su código.
         *
         *     El límite (120 por minuto) no se cuenta por credencial sino por la dirección de red desde la
         *     que la conexión llega al servidor de la aplicación, que detrás de la infraestructura actual es
         *     la de un intermediario: el cupo podría compartirse con otros clientes. Eso no está verificado
         *     contra el servidor desplegado. El cuerpo es texto, no JSON; el código de la API lo emite con
         *     `Content-Type: text/plain; charset=utf-8`, pero que ninguna capa intermedia lo cambie no está
         *     verificado: léalo como texto sin depender del header.
         *
         *     **No hay `Retry-After`.** Esperar al menos 60 segundos antes de reintentar.
         */
        LimiteDeTasa: {
            headers: {
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                [name: string]: unknown;
            };
            content: {
                /** @example The allowed number of requests has been exceeded. */
                "text/plain": string;
            };
        };
        /**
         * @description No autenticado. Hay dos casos:
         *
         *     - **Sin el header `Authorization`:** cuerpo JSON
         *       `{"Message": "Authorization has been denied for this request."}`.
         *     - **Con otro esquema que no sea `Basic`** (la comparación distingue mayúsculas) **o con
         *       credenciales inválidas:** sin cuerpo.
         */
        NoAutenticado: {
            headers: {
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                /** @description Siempre `Basic`. Podría venir además otro desafío de la autenticación del servidor (no verificado): no dependa de que `Basic` sea el único. */
                "WWW-Authenticate"?: string;
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "Message": "Authorization has been denied for this request."
                 *     }
                 */
                "application/json": components["schemas"]["ErrorFramework"];
            };
        };
        /**
         * @description Un parámetro numérico de la ruta (o de la query) sin valor por omisión no se pudo convertir:
         *     no es un número, o no cabe en el tipo. Lo responde el framework, después de autenticar y antes
         *     de ejecutar la operación. `MessageDetail` depende de la configuración del servidor (no
         *     verificado): no dependa de él.
         *
         *     Un parámetro **con** valor por omisión que no se puede convertir no da este error: la API
         *     usa el valor por omisión. Con `ambiente`, eso es **producción**.
         */
        ParametroInvalido: {
            headers: {
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "Message": "The request is invalid.",
                 *       "MessageDetail": "The parameters dictionary contains a null entry for parameter 'tipoDocumento' of non-nullable type 'System.Int32' for method '<firma del método>' in '<controller>'. An optional parameter must be a reference type, a nullable type, or be declared as an optional parameter."
                 *     }
                 */
                "application/json": components["schemas"]["ErrorFramework"];
            };
        };
        /**
         * @description `FUNCION_NO_CONTRATADA`: su cuenta no tiene contratado el respaldo MiPyme, que es la función que
         *     usa la portabilidad. La función se contrata aparte: actívela en Mi plan,
         *     https://app.enrolamiento.cl/MiPlan, dentro de su cuenta del portal. No reintente; la respuesta
         *     es la misma mientras la función no esté habilitada para su cuenta.
         *
         *     La API responde antes de ejecutar la operación: no se creó ninguna sesión. Trae
         *     `X-Codigo-Error`, `X-Reintentable: no` y `Cache-Control: no-store`.
         *
         *     Un 403 **sin** `X-Codigo-Error`, con un texto literal, es otro rechazo: la operación no está
         *     disponible para esta credencial. No reintente con ella.
         */
        PortabilidadNoContratada: {
            headers: {
                /** @description Siempre `no-store`: no guarde esta respuesta en ninguna caché. */
                "Cache-Control"?: string;
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_CONTRATADA:La funcion respaldo no esta contratada para esta cuenta. Activela en Mi plan: https://app.enrolamiento.cl/MiPlan. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description `FUNCION_NO_VERIFICABLE`: la API no pudo verificar en ese momento si su cuenta tiene contratado el
         *     respaldo MiPyme. Es una falla transitoria de nuestro lado, y la operación no se ejecutó: no se
         *     creó ninguna sesión. Repita el mismo request pasados los segundos de `Retry-After`.
         *
         *     Trae `X-Codigo-Error`, `X-Reintentable: si`, `Retry-After` y `Cache-Control: no-store`.
         */
        PortabilidadNoVerificable: {
            headers: {
                /** @description Siempre `no-store`: no guarde esta respuesta en ninguna caché. */
                "Cache-Control"?: string;
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "Retry-After": components["headers"]["Retry-After"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_VERIFICABLE:No se pudo verificar si la funcion respaldo esta contratada para esta cuenta. Reintente en unos segundos. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description `FUNCION_NO_CONTRATADA`: su cuenta nunca tuvo contratado el respaldo MiPyme. La función se
         *     contrata aparte: actívela en Mi plan, https://app.enrolamiento.cl/MiPlan, dentro de su cuenta
         *     del portal. No reintente; la respuesta es la misma mientras la función no esté habilitada para
         *     su cuenta.
         *
         *     Si su cuenta tuvo el respaldo contratado y ya no lo tiene, estas operaciones siguen respondiendo:
         *     puede consultar y descargar los respaldos que ya se hicieron. Trae `X-Codigo-Error`,
         *     `X-Reintentable: no` y `Cache-Control: no-store`.
         */
        RespaldoNoContratado: {
            headers: {
                "Cache-Control": components["headers"]["Cache-Control"];
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_CONTRATADA:La funcion respaldo no esta contratada para esta cuenta. Activela en Mi plan: https://app.enrolamiento.cl/MiPlan. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /** @description Con `X-Codigo-Error: RESPALDO_NO_EXISTE`, no existe un respaldo suyo con ese `id`. La respuesta es la misma, byte a byte y con los mismos headers, si el `id` no existe, si no tiene la forma de uno (32 caracteres hexadecimales en minúscula) o si es de otro cliente: la API no confirma que un `id` ajeno exista. No reintente; revise el `id` contra el aviso o el listado por RUT. Un 404 **sin** `X-Codigo-Error` es una URL que no corresponde a ninguna operación, como en el resto de la API (ver la descripción de la API): llega sin `Cache-Control: no-store`. */
        RespaldoNoExiste: {
            headers: {
                "Cache-Control": components["headers"]["Cache-Control"];
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorFramework"];
                "text/html": string;
                /** @example RESPALDO_NO_EXISTE:No existe el respaldo. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
        /**
         * @description `FUNCION_NO_VERIFICABLE`: la API no pudo verificar en ese momento si su cuenta tiene contratado el
         *     respaldo MiPyme. Es una falla transitoria de nuestro lado, y la operación no se ejecutó. Repita el
         *     mismo request pasados los segundos de `Retry-After`: estas tres operaciones son lecturas.
         *
         *     Trae `X-Codigo-Error`, `X-Reintentable: si`, `Retry-After` y `Cache-Control: no-store`.
         */
        RespaldoNoVerificable: {
            headers: {
                "Cache-Control": components["headers"]["Cache-Control"];
                "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                "Retry-After": components["headers"]["Retry-After"];
                "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                "X-Reintentable": components["headers"]["X-Reintentable"];
                [name: string]: unknown;
            };
            content: {
                /** @example FUNCION_NO_VERIFICABLE:No se pudo verificar si la funcion respaldo esta contratada para esta cuenta. Reintente en unos segundos. */
                "text/plain": components["schemas"]["ErrorTextoPlano"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: {
        /** @description Siempre `no-store` en las respuestas de v1/respaldos que arma la API, también en los errores: no las guarde en ninguna caché. El 401, el 409 del rate limit y el 404 de una URL que no corresponde a ninguna operación se responden antes y pueden llegar sin este header. */
        "Cache-Control": string;
        /** @description Requests permitidos por ventana de 60 segundos: hoy 120. No se cuenta por credencial; ver el rate limit en la descripción de la API. */
        "RateLimit-Limit": number;
        /** @description Requests que quedan en la ventana; 0 en un 409. Bajo ráfagas concurrentes el valor es aproximado. */
        "RateLimit-Remaining": number;
        /** @description Segundos a esperar antes de reintentar. En un error con código, solo cuando `X-Reintentable` es `si` (hoy 30). */
        "Retry-After": number;
        /** @description El código del error, el mismo que abre el cuerpo (`CODIGO:…`). Viene en todo error de negocio con código, esté o no el código en `x-errores`; el 429 del cerrojo de CAF (`CAF_REQUEST_IN_PROGRESS`) no lo trae todavía. */
        "X-Codigo-Error": string;
        /** @description Si vale reintentar el mismo request: el valor de `x-errores` para ese código, y `desconocido` para un código que no figura ahí. `no` quiere decir no reintentar, cualquiera sea el status. */
        "X-Reintentable": "si" | "no" | "desconocido";
        /** @description Solo en `caf_v1_descargar` y `caf_v1_anulacion_masiva_anular`, con la memoria de rechazos del SII activa para el cliente: el rechazo no es de ahora. Es lo que el SII contestó en ese momento (ISO-8601, UTC), y la API lo repite sin volver a preguntarle, con el mismo status, cuerpo y headers. Para preguntarle de nuevo, mande `X-Consultar-Sii: forzar`. */
        "X-Respuesta-De-Memoria": string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    caf_v1_anulacion_masiva_anular: {
        parameters: {
            query?: {
                /** @description Mensaje de annulacion. (por defecto: ANTIGUOS) */
                mensaje?: string;
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Es **irreversible** en los dos ambientes: con `ambiente=0` anula en el SII de certificación. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1 en las dos.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: {
                /**
                 * @description Con `forzar` (sin distinguir mayúsculas) la API no contesta de memoria un rechazo del SII: le vuelve a preguntar, y lo que conteste reemplaza lo recordado. Se atiende uno por minuto para la misma combinación de usuario de la API, ambiente, RUT, tipo de documento y operación (`descargar` y la anulación masiva cuentan por separado); el siguiente dentro del minuto usa la memoria. Solo tiene efecto con la memoria de rechazos activa para el cliente (ver `X-Respuesta-De-Memoria`).
                 * @example forzar
                 */
                "X-Consultar-Sii"?: string;
            };
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
                /** @description Folio inicial del CAF */
                folioInicial: number;
                /** @description Folio final del CAF */
                folioFinal: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /**
             * @description Estado 200: Devuelve la cantidad de folios anulados. ----
             *
             *     Estado 500: En caso de no tener permiso la empresa, el siguiente mensaje: "CONTRIBUYENTE_SIN_PERMISO:Error consultado folios en el SII. El contribuyente Rut xxxxxxx-x, no está habilitado para ingresar a esta opción". Con la memoria de rechazos activa para el cliente, un rechazo que el SII ya dio se repite sin volver a preguntarle, con el header X-Respuesta-De-Memoria (cuándo lo dijo el SII, ISO-8601 UTC); el certificado se valida igual en cada pedido. Para preguntarle de nuevo, enviar el header X-Consultar-Sii: forzar (uno por minuto para la misma combinación de usuario de la API, ambiente, RUT, tipo de documento y operación; la anulación masiva y descargar cuentan por separado).
             */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Anulados": 10
                     *     }
                     */
                    "application/json": components["schemas"]["AnulacionMasivaRestultadoAnular"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_anulacion_masiva_listar: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1 en las dos.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /**
             * @description Estado 200: Listado de CAFs emitidos que pueden ser anulados. ---
             *
             *     Estado 500: En caso de no tener permiso la empresa, el siguiente mensaje: "CONTRIBUYENTE_SIN_PERMISO:Error consultado folios en el SII. El contribuyente Rut xxxxxxx-x, no está habilitado para ingresar a esta opción"
             */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Cafs": [
                     *         {
                     *           "Cantidad": 100,
                     *           "Dueno": "Comercial Ejemplo SpA",
                     *           "Fecha": "05-01-2026",
                     *           "FolioFinal": 1100,
                     *           "FolioInicial": 1001,
                     *           "RUTDueno": "11111111-1"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["ConsultaMasivaRestultadoListar"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_anulados: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /**
             * @description Antes que nada, el parámetro `ambiente`: si no se envía, se consulta el SII de producción y el
             *     certificado se valida también contra producción. Un certificado habilitado solo en el ambiente de
             *     certificación del SII queda rechazado ahí, y el error que vuelve habla del certificado y no de los
             *     folios anulados: antes de revisar el PFX, la contraseña o los permisos, verifique que envió
             *     `ambiente=0`.
             *
             *     Estado 200: `Rut`, `TipoDocumento`, `Estado` y `Rangos`, con una entrada en `Rangos` por cada fila
             *     de la tabla del SII y en el mismo orden en que el SII las envía. Cada rango trae `FolioInicial`,
             *     `FolioFinal` y `Cantidad`, donde `Cantidad` = `FolioFinal` - `FolioInicial` + 1, con los dos
             *     extremos incluidos. `Rangos` nunca viene nula: es una lista vacía cuando la empresa no registra
             *     folios anulados. Para el RUT 1-9 y para los RUT de integración del perfil del cliente no se
             *     consulta al SII y la respuesta es siempre `Estado` "OK" con `Rangos` vacía, lo mismo que devuelve
             *     una empresa real sin folios anulados. **Un 200 no significa éxito.** Los rechazos conocidos del
             *     SII también vuelven con HTTP 200, con el código en `Estado` y `Rangos` vacía; los valores
             *     posibles de `Estado` son "OK", "CODE_ERROR_CERTIFICATE_PERM" (el titular del certificado no tiene
             *     permisos para ver los documentos emitidos) y "CODE_ERROR_ENTERPRISE_IS_MYPYME" (la empresa usa el
             *     sistema de facturación del SII y no es posible ver sus folios anulados). Hay que mirar `Estado`,
             *     no solo el código HTTP.
             *
             *     Estado 500: el cuerpo trae el código y el mensaje separados por dos puntos. Si no viene el cuerpo
             *     del POST, o viene sin `Data` o sin `Contrasenna`: "CERT_REQUERIDO:Los datos del certificado son
             *     requeridos.". Si el certificado no se puede validar, se propaga el error de la validación tal
             *     cual, con su propio código. Para cualquier otra falla consultando el SII: "UKN:Error consultado
             *     folios anulados en el SII." seguido del detalle del error.
             */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Estado": "OK",
                     *       "Rangos": [
                     *         {
                     *           "Cantidad": 10,
                     *           "FolioFinal": 110,
                     *           "FolioInicial": 101
                     *         }
                     *       ],
                     *       "Rut": "11111111-1",
                     *       "TipoDocumento": 33
                     *     }
                     */
                    "application/json": components["schemas"]["RestultadoFoliosAnulados"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_anular: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 tampoco da error y también corre en producción.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
                /**
                 * @description Opcional; se envía junto con `cafFinal`. Folio inicial del CAF que contiene el rango a anular: el `FolioInicial` de ese CAF en caf_v1_listar. Si no se envía ninguno de los dos, el CAF que se le declara al SII es el mismo rango a anular (`inicio` a `fin`), como siempre. Si se envía uno solo, si viene repetido, si no es un entero mayor o igual a 1 (`abc`, vacío, `1.5`, `0`) o si el rango a anular no cabe en el CAF, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII.
                 * @example 1001
                 */
                cafInicial?: number;
                /**
                 * @description Opcional; se envía junto con `cafInicial`. Folio final del CAF que contiene el rango a anular: el `FolioFinal` de ese CAF en caf_v1_listar. Las mismas reglas que `cafInicial`.
                 * @example 1100
                 */
                cafFinal?: number;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
                /**
                 * @description Primer folio a anular. Con `cafInicial` y `cafFinal`, no puede ser menor que `cafInicial` ni mayor que `fin`.
                 * @example 1061
                 */
                inicio: number;
                /**
                 * @description Último folio a anular, incluido. Con `cafInicial` y `cafFinal`, no puede ser mayor que `cafFinal`.
                 * @example 1100
                 */
                fin: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description true si el rango quedó anulado. Si ya hay una solicitud de folios en curso para este RUT y tipo de documento, responde 429 (CAF_REQUEST_IN_PROGRESS) con el header Retry-After. Con cafInicial o cafFinal, antes de esperar por otra solicitud en curso y sin tocar el certificado ni el SII, responde PARAMETRO_FUERA_DE_RANGO si viene uno solo de los dos, si alguno viene repetido o no es un número entero mayor o igual a 1, o si el rango a anular no está contenido en el CAF (cafInicial menor o igual que inicio, inicio menor o igual que fin, fin menor o igual que cafFinal); con el RUT 1-9 o un RUT de integración no se valida. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            /** @description Ya hay una solicitud de folios en curso para este RUT y tipo de documento. Solo ocurre si su cuenta tiene habilitado el control de solicitudes concurrentes de CAF: la API espera primero a que la otra termine (por omisión, hasta 60 segundos). El request no se ejecutó. */
            429: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    /** @description Segundos a esperar antes de reintentar. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    /** @example CAF_REQUEST_IN_PROGRESS:Ya existe una solicitud de folios en curso para este RUT y tipo de documento. Reintente en 30 segundos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_consulta: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
                /**
                 * @description Meses hacia atrás a buscar la última emisión, de 1 a 60. Sin él, la consulta mira los últimos 6 meses como siempre. Con él, y si el cliente tiene habilitada la ventana extendida, la búsqueda se ancla en los CAF autorizados y la respuesta trae los campos adicionales; si no la tiene habilitada, se ignora y la respuesta no trae `MesesVentanaEfectiva`. Un valor fuera de 1 a 60 da `PARAMETRO_FUERA_DE_RANGO`, esté o no habilitada.
                 * @example 36
                 */
                mesesVentana?: number;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RestultadoConsultaFolios"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_descargar: {
        parameters: {
            query?: {
                /** @description Último folio generado por el SII. (El sistema devolverá un CAF que comience mínimo en {ultimoFolio}+1) */
                ultimoFolio?: number;
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 tampoco da error y también corre en producción.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
                /** @description Si se desea descargar CAF con más de 3 meses de antigüedad. Por omisión solo se devuelven CAF recientes. */
                descargarCafAntiguos?: boolean;
            };
            header?: {
                /**
                 * @description Con `forzar` (sin distinguir mayúsculas) la API no contesta de memoria un rechazo del SII: le vuelve a preguntar, y lo que conteste reemplaza lo recordado. Se atiende uno por minuto para la misma combinación de usuario de la API, ambiente, RUT, tipo de documento y operación (`descargar` y la anulación masiva cuentan por separado); el siguiente dentro del minuto usa la memoria. Solo tiene efecto con la memoria de rechazos activa para el cliente (ver `X-Respuesta-De-Memoria`). Nunca salta la entrega de un CAF ya timbrado (el replay de un OK).
                 * @example forzar
                 */
                "X-Consultar-Sii"?: string;
            };
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /** @description Tipo del documento DTE. */
                tipoDocumento: number;
                /** @description Cantidad de folios a descargar. */
                cantidad: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Los bytes del CAF. Si ya hay una solicitud de folios en curso para este RUT y tipo de documento, responde 429 (CAF_REQUEST_IN_PROGRESS) con el header Retry-After: reintentar pasados esos segundos. Con la memoria de rechazos activa para el cliente, un rechazo que el SII ya dio para esta empresa (o este certificado) se repite sin volver a preguntarle, con el mismo estado y cuerpo y el header X-Respuesta-De-Memoria (cuándo lo dijo el SII, ISO-8601 UTC); para preguntarle de nuevo, enviar el header X-Consultar-Sii: forzar (se atiende uno por minuto para la misma combinación de usuario de la API, ambiente, RUT, tipo de documento y operación; descargar y la anulación masiva cuentan por separado). */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example RWplbXBsbzogbm8gZXMgdW4gQ0FGIHJlYWwu */
                    "application/json": string;
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            /** @description Ya hay una solicitud de folios en curso para este RUT y tipo de documento. Solo ocurre si su cuenta tiene habilitado el control de solicitudes concurrentes de CAF: la API espera primero a que la otra termine (por omisión, hasta 60 segundos). El request no se ejecutó. Si el 429 llega al reintentar una descarga propia cuya respuesta no recibió, la solicitud en curso es su intento original: espere los segundos de Retry-After, no pida folios con otros parámetros, y revise con caf_v1_reobtener sin `folioInicial` (mismo RUT, tipo y ambiente). Toma el mismo control, así que responde recién cuando el original termina, con el CAF más reciente de la primera página del listado de reobtención del SII. Si ese CAF es más nuevo que los que tenía, es el que timbró el original: úselo. Si no, repita la descarga. Un 429 de caf_v1_reobtener dice que sigue en curso: siga esperando. Si caf_v1_reobtener responde otro error (por ejemplo UNKNOWN_ERROR_CAF con una página del SII), no repita la descarga: el CAF nuevo pudo quedar timbrado sin poder bajarse. Reintente caf_v1_reobtener más tarde o contacte a soporte. */
            429: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    /** @description Segundos a esperar antes de reintentar. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    /** @example CAF_REQUEST_IN_PROGRESS:Ya existe una solicitud de folios en curso para este RUT y tipo de documento. Reintente en 30 segundos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            500: components["responses"]["ErrorNegocio"];
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_detalle_folios_todos: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /**
                 * @description Tipo del documento DTE, con el código del SII: 33 factura, 34 factura exenta, 39 y 41 boletas, 56 nota de débito, 61 nota de crédito, entre otros. Todos se admiten, en los dos ambientes. En boletas el tope por consulta es de 50.000 folios: consulte CAF por CAF.
                 * @example 33
                 */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description El detalle de todos los CAF del tipo según el SII: `Rut`, `TipoDocumento`, `FolioInicial` (el primer folio del primer CAF), `FolioFinal` (el último folio del último CAF), `Totales`, `Cafs` y `FoliosFueraDeCaf`, siempre vacía. Cada entrada de `Cafs` trae `CafInicial`, `CafFinal`, `Fecha` (`yyyy-MM-dd`), `DisponiblesSinVerificar`, y los conteos `Disponibles`, `Utilizados` y `Anulados` con sus tramos en `Rangos`. En cada CAF, los tres conteos suman los folios del CAF; `Totales` es la suma de los CAF. Las listas vienen ordenadas de menor a mayor y vacías, nunca nulas, cuando no hay folios. `DisponiblesSinVerificar` es `true` solo en un CAF de boletas cuyos `Disponibles` el SII no puede verificar: no los anule a partir de esta respuesta. `Totales` suma también los `Disponibles` de los CAF con `DisponiblesSinVerificar` en `true`. Con el RUT 1-9 o un RUT de prueba del cliente, un solo CAF del folio 1 al 100, con todos sus folios disponibles y `DisponiblesSinVerificar` en `false`. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultadoDetalleFolios"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON.
             *
             *     Un RUT que no es válido responde antes que nada `ERROR_GENERAL:El rut … no es valido.`:
             *     corríjalo, no lo reintente.
             *
             *     Sin rango no hay folios que validar, y ni `ambiente` ni el tipo de documento se rechazan:
             *     `PARAMETRO_FUERA_DE_RANGO` sale solo del tope de folios (50.000 en boletas, 20.000 en los demás
             *     tipos), que se revisa después de validar el certificado.
             *
             *     Después del RUT, en este orden:
             *
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`.
             *     - El certificado no se pudo validar: el error de la validación con su propio código
             *       (`CERT_EXPIRADO`, `CERT_REVOCADO`, `CERT_NO_VALIDO`, `CERT_NO_CONFIGURADO_AUTH`,
             *       `CERT_AUTH_NOT_CONFIGURED`, `CERT_ERROR`…).
             *     - El SII dice que el titular del certificado no está autorizado por la empresa para operar con
             *       folios: `CERT_SIN_PERMISO`.
             *     - La empresa no puede operar en esa modalidad (MiPyme): `SEC_EMP_NOT_AUTHORIZED`.
             *     - Los CAF del tipo abarcan más que el tope (50.000 folios en boletas, 20.000 en los demás
             *       tipos): `PARAMETRO_FUERA_DE_RANGO`, con un mensaje que dice cuántos y el tope. Consulte por
             *       partes con caf_v1_detalle_folios; repetir sin rango da el mismo error.
             *     - La empresa no tiene CAF del tipo de documento según el SII: `CAF_NO_ENCONTRADO`.
             *     - El SII pide intentarlo más tarde, no entregó la sesión, falló la comunicación con el SII o la
             *       consulta de folios respondió un error de sesión, de acceso, de espera o del servidor, o su
             *       página de inicio de sesión en vez de datos: `SII_ERROR_CXN`, reintentable. Un acceso negado en esa consulta nunca es `CERT_SIN_PERMISO`:
             *       el permiso ya se verificó antes.
             *     - El SII no dijo si el certificado tiene permiso, contestó algo que no se pudo interpretar, o
             *       datos que no cuadran también al consultarlo por segunda vez (o la primera, si esa consulta
             *       tardó 20 segundos o más): `SII_RESPUESTA_INESPERADA`, no reintentable.
             *     - Además pueden llegar otros rechazos del SII: `SEC_USER_BOLSII`, `SEC_USER_NOT_AUTHENTICATED`
             *       y, al autenticar el certificado, `CERT_REVOCADO` o `CERT_EXPIRADO`.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_detalle_folios: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /**
                 * @description Tipo del documento DTE, con el código del SII: 33 factura, 34 factura exenta, 39 y 41 boletas, 56 nota de débito, 61 nota de crédito, entre otros. Todos se admiten, en los dos ambientes. En boletas el tope por consulta es de 50.000 folios: consulte CAF por CAF.
                 * @example 33
                 */
                tipoDocumento: number;
                /**
                 * @description Primer folio del rango: un entero mayor o igual a 1, no mayor que `folioFinal`. Puede caer en cualquier CAF, entre dos CAF o fuera de todos. Un valor menor que 1, o mayor que `folioFinal`, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII.
                 * @example 1051
                 */
                folioInicial: number;
                /**
                 * @description Último folio del rango, incluido: un entero mayor o igual a 1, no menor que `folioInicial`. Un valor menor que 1, o menor que `folioInicial`, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII.
                 * @example 1250
                 */
                folioFinal: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description El detalle del rango según el SII: `Rut`, `TipoDocumento`, `FolioInicial` y `FolioFinal` (el rango pedido), `Totales`, `Cafs` y `FoliosFueraDeCaf`. Cada entrada de `Cafs` trae `CafInicial` y `CafFinal` (los límites reales del CAF), `Fecha` (`yyyy-MM-dd`), `DisponiblesSinVerificar`, y los conteos `Disponibles`, `Utilizados` y `Anulados` con sus tramos en `Rangos`, de la parte del CAF que cae en el rango. En cada CAF, los tres conteos suman los folios del CAF dentro del rango; `Totales` es la suma de los CAF. Las listas vienen ordenadas de menor a mayor y vacías, nunca nulas, cuando no hay folios. `DisponiblesSinVerificar` es `true` solo en un CAF de boletas cuyos `Disponibles` el SII no puede verificar: no los anule a partir de esta respuesta. `Totales` suma también los `Disponibles` de los CAF con `DisponiblesSinVerificar` en `true`. Con el RUT 1-9 o un RUT de prueba del cliente, un solo CAF igual al rango pedido, con todos sus folios disponibles y `DisponiblesSinVerificar` en `false`. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultadoDetalleFolios"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON.
             *
             *     Un RUT que no es válido responde antes que nada `ERROR_GENERAL:El rut … no es valido.`:
             *     corríjalo, no lo reintente.
             *
             *     Después, antes de validar el certificado o consultar al SII, también con el RUT de prueba:
             *
             *     - `folioInicial` o `folioFinal` menor que 1, o `folioInicial` mayor que `folioFinal`:
             *       `PARAMETRO_FUERA_DE_RANGO`. Ni `ambiente` ni el tipo de documento se rechazan.
             *
             *     Después:
             *
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`.
             *     - El certificado no se pudo validar: el error de la validación con su propio código
             *       (`CERT_EXPIRADO`, `CERT_REVOCADO`, `CERT_NO_VALIDO`, `CERT_NO_CONFIGURADO_AUTH`,
             *       `CERT_AUTH_NOT_CONFIGURED`, `CERT_ERROR`…).
             *     - El SII dice que el titular del certificado no está autorizado por la empresa para operar con
             *       folios: `CERT_SIN_PERMISO`.
             *     - La empresa no puede operar en esa modalidad (MiPyme): `SEC_EMP_NOT_AUTHORIZED`.
             *     - El tramo que hay que consultar al SII, del primer folio del primer CAF que toca el rango al
             *       último folio del último, supera el tope de 50.000 folios en boletas (39 y 41) o de 20.000 en los
             *       demás tipos: `PARAMETRO_FUERA_DE_RANGO`, con un mensaje que dice cuántos folios abarca y el tope.
             *       Acote el rango; repetir el mismo da el mismo error.
             *     - Ningún CAF del tipo de documento tiene folios en el rango: `CAF_NO_ENCONTRADO`.
             *     - El SII pide intentarlo más tarde, no entregó la sesión, falló la comunicación con el SII o la
             *       consulta de folios respondió un error de sesión, de acceso, de espera o del servidor, o su
             *       página de inicio de sesión en vez de datos: `SII_ERROR_CXN`, reintentable. Un acceso negado en esa consulta nunca es `CERT_SIN_PERMISO`:
             *       el permiso ya se verificó antes.
             *     - El SII no dijo si el certificado tiene permiso, contestó algo que no se pudo interpretar, o
             *       datos que no cuadran también al consultarlo por segunda vez (o la primera, si esa consulta
             *       tardó 20 segundos o más): `SII_RESPUESTA_INESPERADA`, no reintentable.
             *     - Además pueden llegar otros rechazos del SII: `SEC_USER_BOLSII`, `SEC_USER_NOT_AUTHENTICATED`
             *       y, al autenticar el certificado, `CERT_REVOCADO` o `CERT_EXPIRADO`.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_estado_folios: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1 en las dos.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /**
                 * @description Tipo del documento DTE, con el código del SII: 33 factura, 34 factura exenta, 39 y 41 boletas, 56 nota de débito, 61 nota de crédito, entre otros. 39 y 41 solo en certificación (`ambiente=0`).
                 * @example 33
                 */
                tipoDocumento: number;
                /**
                 * @description Primer folio del rango: un entero mayor o igual a 1, no mayor que `folioFinal`. Tome el `FolioInicial` de un CAF de caf_v1_listar, o un folio dentro de ese CAF. Un valor menor que 1, o mayor que `folioFinal`, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII.
                 * @example 1001
                 */
                folioInicial: number;
                /**
                 * @description Último folio del rango, incluido: un entero mayor o igual a 1, no menor que `folioInicial`, y del mismo CAF de caf_v1_listar. Un valor menor que 1, o menor que `folioInicial`, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII.
                 * @example 1100
                 */
                folioFinal: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description El estado del rango según el SII: `Rut`, `TipoDocumento`, `FolioInicial`, `FolioFinal`, `Cantidad`, `Disponibles`, `Utilizados` y `Anulados`, con `Cantidad` = `FolioFinal` - `FolioInicial` + 1 = `Disponibles` + `Utilizados` + `Anulados`, siempre. `Disponibles`: los que el SII todavía no recibió ni anuló, que pueden incluir folios que usted usó en documentos que aún no envió al SII. `Utilizados`: los que el SII ya no permite anular; se calcula. `Anulados`: los anulados en el SII. Si los conteos del SII no cuadran con el rango, la respuesta es un error, nunca un 200 con ceros. Con el RUT 1-9 o un RUT de prueba del cliente, el rango pedido con todos sus folios disponibles. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Anulados": 2,
                     *       "Cantidad": 100,
                     *       "Disponibles": 60,
                     *       "FolioFinal": 1100,
                     *       "FolioInicial": 1001,
                     *       "Rut": "11111111-1",
                     *       "TipoDocumento": 33,
                     *       "Utilizados": 38
                     *     }
                     */
                    "application/json": components["schemas"]["ResultadoEstadoFolios"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. El texto plano sigue declarado para no romper el contrato publicado, pero esta operación nunca responde un 404 en texto plano. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON. Esta operación no responde desde la memoria de rechazos: nunca trae
             *     `X-Respuesta-De-Memoria`.
             *
             *     Un RUT que no es válido responde antes que nada `ERROR_GENERAL:El rut … no es valido.`:
             *     corríjalo, no lo reintente.
             *
             *     Después, antes de validar el certificado o consultar al SII, también con el RUT de prueba:
             *
             *     - `folioInicial` o `folioFinal` menor que 1, o `folioInicial` mayor que `folioFinal`:
             *       `PARAMETRO_FUERA_DE_RANGO`.
             *     - Tipos 39 y 41 en producción: `NO_SOPORTADO_BOLETAS` (en certificación, con `ambiente=0`, sí se
             *       consultan).
             *
             *     Después:
             *
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`.
             *     - El certificado no se pudo validar: el error de la validación con su propio código
             *       (`CERT_EXPIRADO`, `CERT_REVOCADO`, `CERT_NO_VALIDO`, `CERT_NO_CONFIGURADO_AUTH`,
             *       `CERT_AUTH_NOT_CONFIGURED`, `CERT_ERROR`…).
             *     - El SII dice que el titular del certificado no está autorizado por la empresa para operar con
             *       folios: `CERT_SIN_PERMISO`.
             *     - La empresa no puede operar en esa modalidad (MiPyme): `SEC_EMP_NOT_AUTHORIZED`.
             *     - La empresa no está habilitada en la opción de anulación masiva del SII:
             *       `CONTRIBUYENTE_SIN_PERMISO`.
             *     - El rango no está contenido en un solo CAF del listado del SII: `CAF_NO_ENCONTRADO`.
             *     - El SII pide intentarlo más tarde, falló la comunicación con el SII o, desde la versión 1.5.3,
             *       el listado de CAF del SII pide volver a iniciar sesión: `SII_ERROR_CXN`, reintentable.
             *     - La página del listado de CAF del SII no dice si el certificado tiene permiso, el SII contestó
             *       algo que no se pudo interpretar o conteos que no cuadran con el rango:
             *       `SII_RESPUESTA_INESPERADA`, no reintentable.
             *     - Además pueden llegar otros rechazos del SII: `SEC_USER_BOLSII`, `SEC_USER_NOT_AUTHENTICATED`
             *       y, al autenticar el certificado, `CERT_REVOCADO` o `CERT_EXPIRADO`.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_listar: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1 en las dos.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /**
                 * @description Tipo del documento DTE, con el código del SII: 33 factura, 34 factura exenta, 39 y 41 boletas, 56 nota de débito, 61 nota de crédito, entre otros.
                 * @example 33
                 */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Los CAF del SII para la empresa y el tipo de documento: `Cafs`, un elemento por CAF, ordenados por `FolioInicial` de mayor a menor. Cada CAF trae `FolioInicial`, `FolioFinal`, `Cantidad`, `Fecha`, `Dueno` y `RUTDueno`. `Cafs` vacía significa que el SII no lista CAF de ese tipo para la empresa; nunca es nula. Con el RUT 1-9 o un RUT de prueba del cliente, un único CAF de ejemplo, del folio 1 al 10. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Cafs": [
                     *         {
                     *           "Cantidad": 100,
                     *           "Dueno": "Usuario Ejemplo",
                     *           "Fecha": "12-03-2026",
                     *           "FolioFinal": 1200,
                     *           "FolioInicial": 1101,
                     *           "RUTDueno": "12345678-5"
                     *         },
                     *         {
                     *           "Cantidad": 100,
                     *           "Dueno": "Usuario Ejemplo",
                     *           "Fecha": "05-01-2026",
                     *           "FolioFinal": 1100,
                     *           "FolioInicial": 1001,
                     *           "RUTDueno": "12345678-5"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["ConsultaMasivaRestultadoListar"];
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. El texto plano sigue declarado para no romper el contrato publicado, pero esta operación nunca responde un 404 en texto plano. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON. Esta operación no responde desde la memoria de rechazos: nunca trae
             *     `X-Respuesta-De-Memoria`.
             *
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`.
             *     - Un RUT que no es válido: `ERROR_GENERAL:El rut … no es valido.`: corríjalo, no lo reintente.
             *     - El certificado no se pudo validar: el error de la validación con su propio código
             *       (`CERT_EXPIRADO`, `CERT_REVOCADO`, `CERT_NO_VALIDO`, `CERT_NO_CONFIGURADO_AUTH`,
             *       `CERT_AUTH_NOT_CONFIGURED`, `CERT_ERROR`…).
             *     - El SII dice que el titular del certificado no está autorizado por la empresa para operar con
             *       folios: `CERT_SIN_PERMISO`.
             *     - La empresa no puede operar en esa modalidad (MiPyme): `SEC_EMP_NOT_AUTHORIZED`.
             *     - La empresa no está habilitada en la opción de anulación masiva del SII:
             *       `CONTRIBUYENTE_SIN_PERMISO`.
             *     - El SII pide intentarlo más tarde, falló la comunicación con el SII o, desde la versión 1.5.3,
             *       el listado de CAF del SII pide volver a iniciar sesión: `SII_ERROR_CXN`, reintentable.
             *     - La página del listado de CAF del SII no dice si el certificado tiene permiso, o el SII
             *       contestó algo que no se pudo interpretar: `SII_RESPUESTA_INESPERADA`, no reintentable.
             *     - Además pueden llegar otros rechazos del SII: `SEC_USER_BOLSII`, `SEC_USER_NOT_AUTHENTICATED`
             *       y, al autenticar el certificado, `CERT_REVOCADO` o `CERT_EXPIRADO`.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_memoria: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Cuantos rechazos recordados se borraron, de todos los tipos de documento, clientes y ambientes. 0 si no habia o si la memoria persistente esta apagada. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example 3 */
                    "application/json": number;
                };
            };
            401: components["responses"]["NoAutenticado"];
            /** @description La operación no está disponible para esta credencial. El cuerpo es el texto literal que devuelve la API, con el RUT del intento. */
            403: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example Operacion reservada a la llave de operaciones. RUT del intento: 11111111-1. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
            /** @description No se pudo borrar la memoria de rechazos. Puede haber borrado una parte; repetir el request pasados los segundos de Retry-After completa el borrado. */
            503: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example CAF_MEMORIA_NO_DISPONIBLE:No se pudo borrar la memoria de rechazos de la empresa. Reintente en 30 segundos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
        };
    };
    caf_v1_reobtener: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 tampoco da error y también corre en producción. En caf_v1_listar y caf_v1_estado_folios, en cambio, ese mismo número corre en homologación: use 0 o 1.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
                /** @description Si se desea descargar CAF con más de 3 meses de antigüedad. Por omisión solo se devuelven CAF recientes. Sin `folioInicial`, la API recorre los CAF de la primera página del listado de reobtención del SII, del más nuevo al más antiguo: si ninguno tiene menos de 3 meses (por la fecha con que el SII lo lista), la respuesta es `UNKNOWN_ERROR_CAF` con «Error desconocido descargando el CAF.»: repita con `descargarCafAntiguos=true` o pida el CAF con `folioInicial`. Con `folioInicial` este parámetro no se usa. */
                descargarCafAntiguos?: boolean;
                /**
                 * @description Opcional. Folio inicial del CAF a reobtener: un número entero mayor o igual a 1, el `FolioInicial` de un CAF de caf_v1_listar. Sin él se reobtiene el último CAF, como siempre. Con él se reobtiene el CAF que empieza en ese folio, sin el filtro de 3 meses de `descargarCafAntiguos`, que no se usa. El CAF se busca solo en la primera página del listado de reobtención del SII, que no es la fuente de caf_v1_listar: un CAF que caf_v1_listar muestra puede no estar en esa primera página (los más antiguos), y entonces la respuesta es `CAF_NO_ENCONTRADO` aunque el CAF exista. Hoy la API no tiene cómo reobtener ese CAF. Un valor que no es un entero mayor o igual a 1 (`abc`, vacío, `1.5`, `0`, uno mayor que 2147483647), o el parámetro repetido, responde `PARAMETRO_FUERA_DE_RANGO` sin tocar el certificado ni el SII. Pase el mismo `ambiente` explícito, 0 o 1, que usó en caf_v1_listar: con otro número las dos operaciones no corren en el mismo ambiente. Y a diferencia de caf_v1_listar, el certificado se valida en producción aunque pida `ambiente=0`.
                 * @example 1101
                 */
                folioInicial?: number;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
                /**
                 * @description Tipo del documento DTE, con el código del SII: 33 factura, 34 factura exenta, 39 y 41 boletas, 56 nota de débito, 61 nota de crédito, entre otros.
                 * @example 33
                 */
                tipoDocumento: number;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description El XML del CAF, en base64: sin `folioInicial`, el último CAF; con `folioInicial`, el que empieza en ese folio (verifique que el `<D>` de `<RNG>` sea ese folio). Con el RUT 1-9 o un RUT de prueba del cliente, una cadena vacía. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example RWplbXBsbzogbm8gZXMgdW4gQ0FGIHJlYWwu */
                    "application/json": string;
                };
            };
            400: components["responses"]["ParametroInvalido"];
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. El texto plano sigue declarado para no romper el contrato publicado, pero esta operación nunca responde un 404 en texto plano. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /** @description Ya hay una solicitud de folios en curso para este RUT, tipo de documento y ambiente. Solo ocurre si su cuenta tiene habilitado el control de solicitudes concurrentes de CAF: la API espera primero a que la otra termine (por omisión, hasta 60 segundos). El request no se ejecutó. El control es por RUT, tipo de documento y ambiente, y lo comparten caf_v1_descargar, caf_v1_reobtener (con y sin `folioInicial`) y caf_v1_anular, aunque la otra solicitud la haya pedido otro cliente de la API: si va a bajar varios CAF del mismo RUT y tipo, pídalos en secuencia, no en paralelo. caf_v1_listar y caf_v1_estado_folios no toman este control y nunca responden 429. Con la espera por omisión, la capa de entrada de la API puede cortar antes con un 504 en HTML, sin código: en ese caso repita pasados 30 segundos, igual que ante el 429. */
            429: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    /** @description Segundos a esperar antes de reintentar. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    /** @example CAF_REQUEST_IN_PROGRESS:Ya existe una solicitud de folios en curso para este RUT y tipo de documento. Reintente en 30 segundos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON. Esta operación no responde desde la memoria de rechazos: nunca trae
             *     `X-Respuesta-De-Memoria`.
             *
             *     - Un `folioInicial` que no es un entero mayor o igual a 1, o repetido: `PARAMETRO_FUERA_DE_RANGO`,
             *       antes que todo, también con el RUT de prueba.
             *     - Un RUT que no es válido: `ERROR_GENERAL:El rut … no es valido.`: corríjalo, no lo reintente.
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`, antes de esperar por otra solicitud en curso. Desde la versión
             *       1.5.3; antes, sin el cuerpo la respuesta era un error del framework en JSON. Con el RUT 1-9 o un
             *       RUT de prueba no hace falta el certificado.
             *     - El certificado no se pudo validar en producción: el error de la validación con su propio
             *       código.
             *     - Con `folioInicial`, ningún CAF de la primera página del listado de reobtención del SII empieza
             *       en ese folio: `CAF_NO_ENCONTRADO`.
             *     - El listado o la descarga trajo una página del SII: `NO_CAF`, `CERT_SIN_PERMISO`,
             *       `SEC_EMP_NOT_AUTHORIZED` o `SII_ERROR_CXN` según la página; si no se reconoce,
             *       `UNKNOWN_ERROR_CAF`, con el motivo en el mensaje.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    caf_v1_vencidos: {
        parameters: {
            query?: {
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación. En caf_v1_reobtener, ese mismo número corre en producción: use 0 o 1.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
                /**
                 * @description El valor de `Continuar` de la respuesta anterior, tal cual, para seguir la revisión donde quedó. Sin él, o vacío, la revisión empieza desde el principio. Es opaco: no lo arme ni lo modifique. Solo se valida su forma: un valor que no tiene la forma de los que devuelve la API responde `PARAMETRO_FUERA_DE_RANGO`, antes de validar el certificado; uno armado a mano, o de otro RUT o ambiente, se acepta y puede saltear parte de la revisión. Envíe exactamente el que devolvió la respuesta anterior para el mismo RUT y ambiente.
                 * @example r33-1101
                 */
                continuar?: string;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Lo revisado en esta llamada: `Rut`, `Ambiente` (0 certificación, 1 producción), `Fecha` (hoy en Chile, `yyyy-MM-dd`), `Completo` (de la cadena entera), `Continuar` (el valor para el parámetro `continuar` de la llamada siguiente, o `null` si la revisión terminó), `Resumen` (los totales de esta respuesta), `PorAnular` y `SinRevisar`. Cada entrada de `PorAnular` es un CAF vencido con folios disponibles: `TipoDocumento`, `CafInicial` y `CafFinal` (los valores de `cafInicial` y `cafFinal` de caf_v1_anular), `Fecha` (la de autorización, `yyyy-MM-dd`), `FechaVencimiento` (`yyyy-MM-dd`), `Disponibles` y `TramosDisponibles`, ordenados de menor a mayor. Cada entrada de `SinRevisar` trae `TipoDocumento`, `FolioInicial` y `FolioFinal` (`null` los dos si es el tipo entero) y `Motivo`. Las listas vienen vacías, nunca nulas. La respuesta no anula nada. Con el RUT 1-9 o un RUT de prueba del cliente, un CAF del tipo 33 del folio 1 al 100, vencido, con 40 folios disponibles del 61 al 100, `Completo` en `true` y `Continuar` nulo. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResultadoCafVencidos"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["FoliosNoContratados"];
            /** @description Esta operación no tiene un 404 de negocio. Un 404 es una URL que no corresponde a ninguna operación (una ruta mal escrita, un segmento de más o de menos): en general lo responde el servidor web con una página HTML, sin los headers de la API; si la URL llega a la API, es un JSON del framework con `Message`. Inferido del código, no verificado contra el servidor desplegado. Revise la URL: repetir el mismo request da el mismo 404. */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con los headers `X-Codigo-Error`,
             *     `X-Reintentable` y, si vale reintentar, `Retry-After`; ante una falla interna, un error del
             *     framework en JSON.
             *
             *     Un RUT que no es válido responde antes que nada `ERROR_GENERAL:El rut … no es valido.`:
             *     corríjalo, no lo reintente.
             *
             *     Después, antes de validar el certificado o consultar al SII, también con el RUT de prueba:
             *
             *     - `continuar` no tiene la forma de los valores que devuelve la API: `PARAMETRO_FUERA_DE_RANGO:El
             *       valor de continuar no es válido. Use el que devolvió la respuesta anterior.`. Envíe el
             *       `Continuar` de la respuesta anterior tal cual, o empiece sin `continuar`. Solo se valida la
             *       forma: un valor armado a mano, o de otro RUT o ambiente, se acepta y puede saltear parte de la
             *       revisión. `ambiente` no se rechaza.
             *
             *     Después:
             *
             *     - Sin el cuerpo del POST, o sin `Data` o sin `Contrasenna`: `CERT_REQUERIDO:Los datos del
             *       certificado son requeridos.`.
             *     - El certificado no se pudo validar: el error de la validación con su propio código
             *       (`CERT_EXPIRADO`, `CERT_REVOCADO`, `CERT_NO_VALIDO`, `CERT_NO_CONFIGURADO_AUTH`,
             *       `CERT_AUTH_NOT_CONFIGURED`, `CERT_ERROR`…).
             *
             *     Los errores del SII que siguen salen solo si la llamada no alcanzó a revisar nada; si ya había
             *     revisado algo, la respuesta es un 200 con lo reunido, `Completo` en `false` y `Continuar`:
             *
             *     - El SII dice que el titular del certificado no está autorizado por la empresa para operar con
             *       folios del primer tipo de documento (33), en una llamada sin `continuar`: `CERT_SIN_PERMISO`.
             *       En cualquier otro caso ese tipo va a `SinRevisar` y la revisión sigue.
             *     - La empresa no puede operar en esa modalidad (MiPyme): `SEC_EMP_NOT_AUTHORIZED`.
             *     - El SII pide intentarlo más tarde, no entregó la sesión, falló la comunicación con el SII o la
             *       consulta de folios respondió un error de sesión, de acceso, de espera o del servidor, o su
             *       página de inicio de sesión en vez de datos: `SII_ERROR_CXN`, reintentable con el mismo
             *       `continuar`.
             *     - El SII no dijo si el certificado tiene permiso, o contestó algo que no se pudo interpretar:
             *       `SII_RESPUESTA_INESPERADA`, no reintentable.
             *     - Además pueden llegar otros rechazos del SII: `SEC_USER_BOLSII`, `SEC_USER_NOT_AUTHENTICATED`
             *       y, al autenticar el certificado, `CERT_REVOCADO` o `CERT_EXPIRADO`.
             *
             *     Un error a mitad de cadena que se repite con el mismo `continuar` no se arregla reintentando:
             *     empiece la revisión de nuevo, sin `continuar`.
             */
            500: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["FoliosNoVerificables"];
        };
    };
    certificaciones_v1_buscar: {
        parameters: {
            query?: {
                /**
                 * @description `aaaammdd-aaaammdd`: certificaciones con algún cambio de estado en el rango. Sin fin, hasta ahora. El fin cuenta desde las 00:00 de ese día, así que el día final queda prácticamente afuera. Se aplica antes de paginar. Formato inválido → 500 del framework.
                 * @example 20260901-20260930
                 */
                Fecha?: string;
                /**
                 * @description RUT de la empresa, comparado tal cual, sin normalizar: sin puntos, con guion y la K en mayúscula. Se aplica antes de paginar.
                 * @example 11111111-1
                 */
                RUT?: string;
                /**
                 * @description Nombre o número de `EstadoCertificacion` (Creada, EnProgreso, Completada, Error), sensible a mayúsculas; inválido → 500 del framework. Se aplica **después de paginar**.
                 * @example Error
                 */
                Estado?: string;
                /**
                 * @description Nombre o número de `EtapaCertificacion` (VerificacionSII, IngresoDatos, ConfiguracionSII, DeclaracionFinal, Completada), sensible a mayúsculas; inválido → 500 del framework. **Así se llama**: `Etapa` se ignora sin aviso. Se aplica **después de paginar**.
                 * @example ConfiguracionSII
                 */
                Estapa?: string;
                /**
                 * @description Nombre o número de `PasoCertificacion` (Ninguno, Postulacion, Prueba, Simulacion, Intercambio, MuestrasImpresas), sensible a mayúsculas; inválido → 500 del framework. Se aplica **después de paginar**.
                 * @example Prueba
                 */
                PasoEnSII?: string;
            };
            header?: never;
            path: {
                /** @description Página, desde 1. Menor que 1 produce un 500. */
                pagina: number;
                /** @description Filas por página. La API no impone tope; se recomienda no pasar de 100. */
                cantidadPorPagina: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Listado de certificaciones. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example [
                     *       {
                     *         "Actecos": [
                     *           {
                     *             "AffectoIva": "SI",
                     *             "Codigo": "620200",
                     *             "Nombre": "Actividades de consultoría informática"
                     *           }
                     *         ],
                     *         "ClasificacionError": 0,
                     *         "CodigoError": null,
                     *         "Comentario": "Set de prueba enviado al SII.",
                     *         "Direccion": "Calle Ejemplo 123, Santiago",
                     *         "DireccionModificada": "Calle Ejemplo 123, Santiago",
                     *         "DireccionRegional": "Santiago Centro",
                     *         "DireccionRegionalModificada": "Santiago Centro",
                     *         "Estado": 1,
                     *         "Etapa": 2,
                     *         "Fecha": "2026-09-30T10:09:00",
                     *         "FechaEstado": "2026-10-01T09:12:00",
                     *         "Giro": "Desarrollo de software",
                     *         "GiroModificado": "Desarrollo de software",
                     *         "HorasEnEstado": 23,
                     *         "PasoEnSII": 2,
                     *         "Productos": [
                     *           {
                     *             "Nombre": "Licencia mensual",
                     *             "Precio": 10000
                     *           }
                     *         ],
                     *         "RUT": "11111111-1",
                     *         "RazonSocial": "Comercial Ejemplo SpA",
                     *         "RazonSocialModificada": "Comercial Ejemplo SpA",
                     *         "Reinicios": 0,
                     *         "Servicios": [
                     *           {
                     *             "Nombre": "Implementación",
                     *             "Precio": 100000
                     *           }
                     *         ],
                     *         "Sets": [
                     *           110
                     *         ]
                     *       },
                     *       {
                     *         "Actecos": [
                     *           {
                     *             "AffectoIva": "SI",
                     *             "Codigo": "473000",
                     *             "Nombre": "Venta al por menor de combustibles"
                     *           }
                     *         ],
                     *         "ClasificacionError": 0,
                     *         "CodigoError": null,
                     *         "Comentario": "Certificación completada.",
                     *         "Direccion": "Avenida Prueba 456, Valparaíso",
                     *         "DireccionModificada": "Avenida Prueba 456, Valparaíso",
                     *         "DireccionRegional": "Valparaíso",
                     *         "DireccionRegionalModificada": "Valparaíso",
                     *         "Estado": 2,
                     *         "Etapa": 4,
                     *         "Fecha": "2026-09-28T15:12:00",
                     *         "FechaEstado": "2026-10-05T16:40:00",
                     *         "Giro": "Venta al por menor",
                     *         "GiroModificado": "Venta al por menor",
                     *         "HorasEnEstado": null,
                     *         "PasoEnSII": 5,
                     *         "Productos": [
                     *           {
                     *             "Nombre": "Producto de ejemplo",
                     *             "Precio": 1000
                     *           }
                     *         ],
                     *         "RUT": "22222222-2",
                     *         "RazonSocial": "Distribuidora Ejemplo Ltda.",
                     *         "RazonSocialModificada": "Distribuidora Ejemplo Ltda.",
                     *         "Reinicios": 1,
                     *         "Servicios": [
                     *           {
                     *             "Nombre": "Servicio de ejemplo",
                     *             "Precio": 150000
                     *           }
                     *         ],
                     *         "Sets": [
                     *           33,
                     *           34,
                     *           46,
                     *           43,
                     *           52,
                     *           110
                     *         ]
                     *       }
                     *     ]
                     */
                    "application/json": components["schemas"]["Certificacion"][];
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_stats: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "PorEstado": {
                     *         "Completada": 3300,
                     *         "Creada": 120,
                     *         "EnProgreso": 410,
                     *         "Error": 140
                     *       },
                     *       "PorEtapa": {
                     *         "Completada": 3300,
                     *         "ConfiguracionSII": 380,
                     *         "DeclaracionFinal": 80,
                     *         "IngresoDatos": 150,
                     *         "VerificacionSII": 60
                     *       },
                     *       "PorPasoEnSII": {
                     *         "Intercambio": 60,
                     *         "MuestrasImpresas": 3300,
                     *         "Ninguno": 330,
                     *         "Postulacion": 40,
                     *         "Prueba": 150,
                     *         "Simulacion": 90
                     *       },
                     *       "Total": 3970
                     *     }
                     */
                    "application/json": components["schemas"]["Estadisticas"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_actualizar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos de la certificación para actualizarlos. (No requerido) */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Direccion": "Calle Ejemplo 123, Santiago",
                 *       "Giro": "Desarrollo de software",
                 *       "Productos": [
                 *         {
                 *           "Nombre": "Licencia mensual",
                 *           "Precio": 10000
                 *         }
                 *       ],
                 *       "RazonSocial": "Comercial Ejemplo SpA",
                 *       "Referencia": "Pedido 42",
                 *       "Servicios": [
                 *         {
                 *           "Nombre": "Implementación",
                 *           "Precio": 100000
                 *         }
                 *       ],
                 *       "Sets": [
                 *         33
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ActualizarCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_actualizar_casillas_intercambio: {
        parameters: {
            query: {
                /**
                 * @description Correo de contacto con el SII. Obligatorio: si falta en la query string, la API responde 404 (no 400), antes de validar la credencial.
                 * @example contacto-sii@example.com
                 */
                correoContactoSii: string;
                /**
                 * @description Correo de contacto entre empresas. Obligatorio: si falta en la query string, la API responde 404 (no 400), antes de validar la credencial.
                 * @example intercambio@example.com
                 */
                correoContactoEmpresa: string;
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. Si se omite, opera en **producción**: páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 tampoco da error y también corre en producción.
                 * @example 0
                 */
                ambiente?: components["schemas"]["Ambiente"];
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos del certificado digital a usar. (requerido) */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            /**
             * @description Falta `correoContactoSii` o `correoContactoEmpresa` en la query string.
             *     Es un error del framework, no un 400, y sale **antes de validar la credencial**: llega aunque
             *     el token falte o sea inválido. Basta con que el nombre esté (sin distinguir mayúsculas); un
             *     valor vacío no produce el 404.
             *
             *     La URI que aparece en `Message` es la que vio el servidor y puede no coincidir con la que mandó
             *     el cliente (esquema, puerto).
             */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Message": "No HTTP resource was found that matches the request URI '<URI del request>'.",
                     *       "MessageDetail": "No action was found on the controller 'CertificationV1' that matches the request."
                     *     }
                     */
                    "application/json": {
                        /** @description Siempre viene. */
                        Message: string;
                        /** @description Opcional: viene o no según la configuración de errores del servidor. No dependa de él. */
                        MessageDetail?: string;
                    };
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_consultar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Actecos": [
                     *         {
                     *           "AffectoIva": "SI",
                     *           "Codigo": "620200",
                     *           "Nombre": "Actividades de consultoría informática"
                     *         }
                     *       ],
                     *       "ClasificacionError": 0,
                     *       "CodigoError": null,
                     *       "Comentario": "Set de prueba enviado al SII.",
                     *       "Direccion": "Calle Ejemplo 123, Santiago",
                     *       "DireccionModificada": "Calle Ejemplo 123, Santiago",
                     *       "DireccionRegional": "Santiago Centro",
                     *       "DireccionRegionalModificada": "Santiago Centro",
                     *       "Estado": 1,
                     *       "Etapa": 2,
                     *       "Fecha": "2026-09-30T11:06:00",
                     *       "FechaEstado": "2026-10-01T09:12:00",
                     *       "Giro": "Desarrollo de software",
                     *       "GiroModificado": "Desarrollo de software",
                     *       "HorasEnEstado": 23,
                     *       "PasoEnSII": 2,
                     *       "Productos": [
                     *         {
                     *           "Nombre": "Licencia mensual",
                     *           "Precio": 10000
                     *         },
                     *         {
                     *           "Nombre": "Licencia anual",
                     *           "Precio": 200000
                     *         }
                     *       ],
                     *       "RUT": "11111111-1",
                     *       "RazonSocial": "Comercial Ejemplo SpA",
                     *       "RazonSocialModificada": "Comercial Ejemplo SpA",
                     *       "Reinicios": 0,
                     *       "Servicios": [
                     *         {
                     *           "Nombre": "Implementación",
                     *           "Precio": 100000
                     *         }
                     *       ],
                     *       "Sets": [
                     *         110
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Certificacion"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_crear: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos iniciales de la certificación. Datos del certificado digital y de los SETs a certificar. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "CertData": "MIIC",
                 *       "Contrasenna": "********",
                 *       "Sets": [
                 *         33,
                 *         34
                 *       ],
                 *       "TodosSets": false
                 *     }
                 */
                "application/json": components["schemas"]["CrearCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Actecos": [
                     *         {
                     *           "AffectoIva": "SI",
                     *           "Codigo": "620200",
                     *           "Nombre": "Actividades de consultoría informática"
                     *         }
                     *       ],
                     *       "ClasificacionError": 0,
                     *       "CodigoError": null,
                     *       "Comentario": "API",
                     *       "Direccion": "Calle Ejemplo 123, Santiago",
                     *       "DireccionModificada": null,
                     *       "DireccionRegional": "Santiago Centro",
                     *       "DireccionRegionalModificada": null,
                     *       "Estado": 1,
                     *       "Etapa": 1,
                     *       "Fecha": "2026-10-07T10:15:00",
                     *       "FechaEstado": "2026-10-07T10:15:00",
                     *       "Giro": "Desarrollo de software",
                     *       "GiroModificado": null,
                     *       "HorasEnEstado": 0,
                     *       "PasoEnSII": 0,
                     *       "Productos": [],
                     *       "RUT": "11111111-1",
                     *       "RazonSocial": "Comercial Ejemplo SpA",
                     *       "RazonSocialModificada": null,
                     *       "Reinicios": 0,
                     *       "Servicios": [],
                     *       "Sets": [
                     *         33,
                     *         34
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Certificacion"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            /** @description La operación no está disponible para esta credencial. El cuerpo es el texto literal que devuelve la API, con el RUT del intento. */
            403: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example La llave maestra no puede crear certificaciones. RUT del intento: 11111111-1. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_declarar_cumplimiento: {
        parameters: {
            query?: {
                /** @description Correo de contacto SII. (opcional) */
                correoContactoSii?: string;
                /** @description Correo de contacto entre empresas. (opcional) */
                correoContactoEmpresa?: string;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos del certificado digital a usar. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_iniciar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos de la certificación para actualizarlos. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Productos": [
                 *         {
                 *           "Nombre": "Licencia mensual",
                 *           "Precio": 10000
                 *         }
                 *       ],
                 *       "Servicios": [
                 *         {
                 *           "Nombre": "Implementación",
                 *           "Precio": 100000
                 *         }
                 *       ],
                 *       "Sets": [
                 *         33
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ActualizarCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v1_reiniciar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos para el reinicio de la certificación. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Motivo": "Rehacer el set de prueba",
                 *       "Paso": 0
                 *     }
                 */
                "application/json": components["schemas"]["DatosReiniciar"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificados_v1_descargar_e_cert: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Datos para la descarga del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "ContrasennaPfx": "********",
                 *       "Usuario": "usuario-ecert"
                 *     }
                 */
                "application/json": components["schemas"]["DescargaCertificado"];
            };
        };
        responses: {
            /** @description Certificado en base64. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example MIIC */
                    "application/json": string;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificados_v1_solicitar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Datos de la solictud. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Empresa": {
                 *         "Area": "Tecnología",
                 *         "Ciudad": "Santiago",
                 *         "Comuna": "SANTIAGO",
                 *         "Direccion": "Calle Ejemplo 123",
                 *         "Nombre": "Comercial Ejemplo SpA",
                 *         "Region": "METROPOLITANA DE SANTIAGO ",
                 *         "Rut": "11111111-1"
                 *       },
                 *       "Subscriptor": {
                 *         "ApeMaterno": "Prueba",
                 *         "ApePaterno": "Ejemplo",
                 *         "Ciudad": "Santiago",
                 *         "Comuna": "SANTIAGO",
                 *         "CopiaCedula": "RWplbXBsbzogbm8gZXMgdW5hIGNlZHVsYSByZWFsLg==",
                 *         "Correo": "ana@example.com",
                 *         "Direccion": "Calle Ejemplo 123",
                 *         "Nombre": "Ana",
                 *         "Region": "METROPOLITANA DE SANTIAGO ",
                 *         "Rut": "12345678-5",
                 *         "Serie": "A000000000",
                 *         "Telefono": "+56 2 2000 0000"
                 *       }
                 *     }
                 */
                "application/json": components["schemas"]["SolicitudCertificado"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example 482913 */
                    "application/json": string;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificados_v1_validar: {
        parameters: {
            query?: {
                /** @description Actualiza los permisos, si el certificado es admin, pero no tiene los permisos, (enviar, consultar, obtener, firmar, anular). Por defecto no se actualiza, solo se consulta. Pasar "true" para actualizar. */
                actualizar?: boolean;
            };
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos del certificado. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    empresas_v1_permisos: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rutEmpresa: string;
                /** @description RUT del usuario. */
                rutUsuario: string;
                /**
                 * @description Ambiente del SII: 0 = Homologación (certificación), 1 = Producción. El segmento es opcional en la API: si se omite, opera en **producción**. Páselo siempre explícito. Un valor que no es un número (por ejemplo `prod`) no da error: la operación corre en producción, el default. Un número distinto de 0 y 1 no da error y corre en homologación.
                 * @example 0
                 */
                ambiente: components["schemas"]["Ambiente"];
            };
            cookie?: never;
        };
        /** @description Certificado para autenticación en el SII. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description `true` si la operación fue exitosa. Si falla, la API responde con un error. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    empresas_v1_consultar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Certificado para autenticación en el SII. (Puede ser opcional, en ese caso se usa el configurado en la plataforma) */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Datos de la empresa según información registrada en el SII. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Actecos": [
                     *         {
                     *           "AffectoIva": "SI",
                     *           "Codigo": "620200",
                     *           "Nombre": "Actividades de consultoría informática"
                     *         }
                     *       ],
                     *       "Direccion": "Calle Ejemplo 123, Santiago",
                     *       "DireccionRegional": "Santiago Centro",
                     *       "DocumentosHomo": [
                     *         {
                     *           "Codigo": "33",
                     *           "FechaDenegado": null,
                     *           "FechaPermitido": "01-09-2026",
                     *           "Nombre": "Factura electrónica"
                     *         }
                     *       ],
                     *       "DocumentosProd": [],
                     *       "FechaResolucion": "22-08-2014",
                     *       "Giro": "Desarrollo de software",
                     *       "NumeroResolucion": 80,
                     *       "RUT": "11111111-1",
                     *       "RazonSocial": "Comercial Ejemplo SpA",
                     *       "Sucursales": [
                     *         {
                     *           "Codigo": "1",
                     *           "Direccion": "Calle Ejemplo 123, Santiago",
                     *           "TipoDireccion": "Casa matriz"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["EmpresaInfo"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    empresas_v1_datos: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa. */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Certificado para autenticación en el SII. (Puede ser opcional, en ese caso se usa el configurado en la plataforma) */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Contrasenna": "********",
                 *       "Data": "MIIC"
                 *     }
                 */
                "application/json": components["schemas"]["Certificado"];
            };
        };
        responses: {
            /** @description Datos de la empresa según información registrada en el SII. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Actecos": [
                     *         {
                     *           "AffectoIva": "SI",
                     *           "Codigo": "620200",
                     *           "Nombre": "Actividades de consultoría informática"
                     *         }
                     *       ],
                     *       "Direccion": "Calle Ejemplo 123, Santiago",
                     *       "DireccionRegional": "Santiago Centro",
                     *       "DocumentosHomo": [
                     *         {
                     *           "Codigo": "33",
                     *           "FechaDenegado": null,
                     *           "FechaPermitido": "01-09-2026",
                     *           "Nombre": "Factura electrónica"
                     *         }
                     *       ],
                     *       "DocumentosProd": [],
                     *       "FechaResolucion": "22-08-2014",
                     *       "Giro": "Desarrollo de software",
                     *       "NumeroResolucion": 80,
                     *       "RUT": "11111111-1",
                     *       "RazonSocial": "Comercial Ejemplo SpA",
                     *       "Sucursales": [
                     *         {
                     *           "Codigo": "1",
                     *           "Direccion": "Calle Ejemplo 123, Santiago",
                     *           "TipoDireccion": "Casa matriz"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["EmpresaInfo"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    portabilidad_v1_sesiones: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Solo `rut` es obligatorio: `{"rut": "11111111-1"}` alcanza. `prueba`, si no viene, es `false`. `escenario` va solo con `prueba` en `true`. */
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "email": "contacto@ejemplo.cl",
                 *       "prueba": false,
                 *       "referencia_externa": "cliente-4821",
                 *       "rut": "11111111-1",
                 *       "url_retorno": "https://erp.ejemplo.cl/portabilidad/volver"
                 *     }
                 */
                "application/json": components["schemas"]["NuevaSesionDePortabilidad"];
            };
        };
        responses: {
            /** @description La sesión creada, con su `client_secret`. Es la única vez que la API lo entrega. */
            200: {
                headers: {
                    /** @description Siempre `no-store`: no guarde esta respuesta en ninguna caché, trae el `client_secret`. */
                    "Cache-Control"?: string;
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "client_secret": "ws_9b1e4c7a2d5f48e0b3a6c9d2e5f8a1b4_EjemploEjemploEjemploEjemploEjemploEjemploE",
                     *       "escenario": null,
                     *       "expira": "2026-11-20T11:30:00-03:00",
                     *       "id": "9b1e4c7a2d5f48e0b3a6c9d2e5f8a1b4",
                     *       "prueba": false
                     *     }
                     */
                    "application/json": components["schemas"]["SesionDePortabilidad"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["PortabilidadNoContratada"];
            /**
             * @description **El widget todavía no está habilitado en el servidor.** Mientras no lo esté, esta operación
             *     responde 404 **sin cuerpo** y con `Cache-Control: no-store`, a un request bien formado y con una
             *     credencial válida: no se creó ninguna sesión. No lo reintente; la respuesta es la misma hasta que
             *     el widget se habilite, y eso se anuncia en el registro de cambios.
             *
             *     Un 404 con cuerpo es otra cosa: una URL que no corresponde a ninguna operación, como en el resto
             *     de la API (ver la descripción de la API).
             */
            404: {
                headers: {
                    /** @description `no-store` en el 404 del widget sin habilitar. */
                    "Cache-Control"?: string;
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /**
             * @description Error de negocio en texto plano, `CODIGO:mensaje`, con `X-Codigo-Error`, `X-Reintentable` y
             *     `Cache-Control: no-store`. En ninguno de estos casos se creó una sesión.
             *
             *     - Sin cuerpo, o sin `rut`: `ERROR_GENERAL:El RUT no puede ser nulo.`. Un `rut` que no es un RUT
             *       válido: `ERROR_GENERAL:El rut … no es valido.`. Es el mismo error de RUT que el resto de la API;
             *       corríjalo, no lo reintente. Se acepta con o sin puntos y con guion (`11.111.111-1` o
             *       `11111111-1`, `k` en minúscula o mayúscula) y se guarda sin puntos y con `K` mayúscula; un cero a
             *       la izquierda, un signo o un segundo guion lo hacen inválido. El RUT se revisa antes que lo demás.
             *     - `email` que no es un correo: `DATOS_INVALIDOS:El email no es un correo valido.`.
             *     - `url_retorno` que no es una URL `https` absoluta de hasta 1000 caracteres:
             *       `DATOS_INVALIDOS:La url_retorno tiene que ser una URL https absoluta, de hasta 1000 caracteres.`.
             *     - `referencia_externa` de más de 100 caracteres: `DATOS_INVALIDOS:La referencia_externa no puede
             *       tener mas de 100 caracteres.`.
             *     - Un valor que no se pudo leer (por ejemplo `"prueba": "si"`): `DATOS_INVALIDOS:El cuerpo trae un
             *       valor que no se pudo leer: rut, email, url_retorno, referencia_externa y escenario son texto, y
             *       prueba es true o false.`.
             *     - `escenario` con `prueba` en `false` (o sin `prueba`): `DATOS_INVALIDOS:El escenario solo se acepta
             *       con prueba en true.`. Un `escenario` que no es uno de los cinco, escrito exactamente así:
             *       `DATOS_INVALIDOS:El escenario tiene que ser camino_feliz, certificado_no_administrador, conflicto,
             *       respaldo_en_curso o resolucion_emitida.`.
             *
             *     - Ya hay 20 sesiones vigentes de su cuenta para ese `rut`: `DEMASIADAS_SESIONES:Hay demasiadas
             *       sesiones vigentes para esta empresa; reutilice una o espere a que venzan (60 minutos).`, con
             *       `X-Reintentable: si` y `Retry-After`. Reutilice una sesión que ya tenga o reintente cuando alguna
             *       venza; `Retry-After` es el mínimo entre intentos, no cuánto falta para eso.
             *
             *     `email`, `url_retorno` y `referencia_externa` son opcionales: un valor vacío o solo con espacios
             *     cuenta como no enviado, y los espacios alrededor no cuentan. `escenario` también es opcional: si no
             *     quiere elegir uno, omítalo o mande `null`. `DATOS_INVALIDOS` no se
             *     reintenta igual: corrija el campo o no lo mande.
             *
             *     Ante una falla interna, `ERROR_GENERAL:No se pudo crear la sesion de portabilidad.`, con
             *     `X-Reintentable: desconocido`: no se sabe si la sesión se guardó. Puede crear otra; una que se
             *     haya guardado sin que la reciba vence sola a los 60 minutos. En una sesión de prueba con
             *     `escenario`, el guion de la empresa puede haber quedado reiniciado aunque la sesión no se haya
             *     creado: crear otra con el mismo `escenario` lo reinicia igual.
             */
            500: {
                headers: {
                    /** @description Siempre `no-store` en los errores que arma la API. */
                    "Cache-Control"?: string;
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["PortabilidadNoVerificable"];
        };
    };
    respaldos_v1_listar: {
        parameters: {
            query?: {
                /**
                 * @description RUT de la empresa, con o sin puntos y con guion (`11111111-1` o `11.111.111-1`). Sin guion, la API lo pone antes del último carácter: `111111111` se lee `11111111-1`.
                 * @example 11111111-1
                 */
                rut?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Los respaldos de la empresa, el más nuevo primero; vacía si no hay ninguno que mostrar. */
            200: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListaDeRespaldos"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["RespaldoNoContratado"];
            /** @description Esta operación no tiene un 404 de negocio: un 404 es una URL que no corresponde a ninguna operación, como en el resto de la API (ver la descripción de la API). */
            404: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    "text/html": string;
                };
            };
            409: components["responses"]["LimiteDeTasa"];
            /** @description Falla inesperada de la API (la base, la firma de la URL, una configuración que falta): `ERROR_GENERAL:No se pudo atender el pedido de respaldos.` en texto plano, con `X-Codigo-Error` y `X-Reintentable: desconocido`. Se puede repetir más tarde: estas tres operaciones son lecturas. */
            500: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    /** @example ERROR_GENERAL:No se pudo atender el pedido de respaldos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["RespaldoNoVerificable"];
        };
    };
    respaldos_v1_consultar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description Identificador del respaldo: 32 caracteres hexadecimales en minúscula, el `id` del listado o el que va en la `url` del aviso.
                 * @example 3f9c2a7e5b1d4c08a6e2f0b9d7c41e53
                 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description El respaldo, en cualquiera de sus estados. */
            200: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Respaldo"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["RespaldoNoContratado"];
            404: components["responses"]["RespaldoNoExiste"];
            409: components["responses"]["LimiteDeTasa"];
            /** @description Falla inesperada de la API (la base, la firma de la URL, una configuración que falta): `ERROR_GENERAL:No se pudo atender el pedido de respaldos.` en texto plano, con `X-Codigo-Error` y `X-Reintentable: desconocido`. Se puede repetir más tarde: estas tres operaciones son lecturas. */
            500: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    /** @example ERROR_GENERAL:No se pudo atender el pedido de respaldos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["RespaldoNoVerificable"];
        };
    };
    respaldos_v1_descargar: {
        parameters: {
            query?: {
                /**
                 * @description `json` (sin distinguir mayúsculas) para recibir la URL en el cuerpo, con 200, en vez de una redirección 302. Cualquier otro valor, o sin el parámetro, es la redirección.
                 * @example json
                 */
                formato?: string;
            };
            header?: never;
            path: {
                /**
                 * @description Identificador del respaldo, el `id` del listado o el que va en la `url` del aviso.
                 * @example 3f9c2a7e5b1d4c08a6e2f0b9d7c41e53
                 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Con `?formato=json`: la URL firmada del archivo y hasta cuándo sirve. Bájela con un GET sin `Authorization`. */
            200: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "url": "https://almacen.ejemplo.cl/entregables/3f9c2a7e5b1d4c08a6e2f0b9d7c41e53.zip?X-Amz-Expires=900&X-Amz-Signature=firma-de-ejemplo",
                     *       "vence": "2026-11-17T10:45:00-03:00"
                     *     }
                     */
                    "application/json": components["schemas"]["DescargaDeRespaldo"];
                };
            };
            /** @description Sin `formato`: redirección a la URL firmada del archivo, válida por 15 minutos, sin cuerpo. Siga `Location` con un GET que **no** lleve `Authorization`. */
            302: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    /** @description La URL firmada del archivo .zip. */
                    Location?: string;
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoAutenticado"];
            403: components["responses"]["RespaldoNoContratado"];
            404: components["responses"]["RespaldoNoExiste"];
            /**
             * @description Tres casos, que se distinguen por `X-Codigo-Error`:
             *
             *     - **`RESPALDO_EN_PROCESO`**: el archivo todavía se arma y puede tardar horas. El request no hizo
             *       nada. Trae `Retry-After: 30`, pero no repita cada 30 segundos: espere el aviso
             *       `respaldo.finalizado` o consulte el estado cada varios minutos, y descargue cuando diga `listo`.
             *     - **`RESPALDO_FALLIDO`**: el respaldo terminó con un error y no hay archivo; el motivo va entre
             *       paréntesis en el mensaje y en `codigo` del respaldo. No reintente.
             *     - **Sin `X-Codigo-Error`**: el rate limit, con el cuerpo de texto
             *       `The allowed number of requests has been exceeded.` y sin `Retry-After`. Espere al menos 60
             *       segundos y repita.
             */
            409: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description `RESPALDO_VENCIDO`: pasó `disponible_hasta` y el archivo ya no se entrega. No reintente. */
            410: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example RESPALDO_VENCIDO:El respaldo vencio: el archivo ya no esta disponible. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            /** @description Falla inesperada de la API (la base, la firma de la URL, una configuración que falta): `ERROR_GENERAL:No se pudo atender el pedido de respaldos.` en texto plano, con `X-Codigo-Error` y `X-Reintentable: desconocido`. Se puede repetir más tarde: estas tres operaciones son lecturas. */
            500: {
                headers: {
                    "Cache-Control": components["headers"]["Cache-Control"];
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    "Retry-After": components["headers"]["Retry-After"];
                    "X-Codigo-Error": components["headers"]["X-Codigo-Error"];
                    "X-Reintentable": components["headers"]["X-Reintentable"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorFramework"];
                    /** @example ERROR_GENERAL:No se pudo atender el pedido de respaldos. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            503: components["responses"]["RespaldoNoVerificable"];
        };
    };
    certificaciones_v2_actualizar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos de la certificación para actualizarlos. (No requerido) */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Certificado": {
                 *         "Contrasenna": "********",
                 *         "Data": "MIIC"
                 *       },
                 *       "Direccion": "Calle Ejemplo 123, Santiago",
                 *       "Giro": "Desarrollo de software",
                 *       "Productos": [
                 *         {
                 *           "Nombre": "Licencia mensual",
                 *           "Precio": 10000
                 *         }
                 *       ],
                 *       "RazonSocial": "Comercial Ejemplo SpA",
                 *       "Servicios": [
                 *         {
                 *           "Nombre": "Implementación",
                 *           "Precio": 100000
                 *         }
                 *       ],
                 *       "Sets": [
                 *         33
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ActualizarCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v2_crear: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos iniciales de la certificación. Datos del certificado digital (opcional) y de los SETs a certificar. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "CertData": "MIIC",
                 *       "Contrasenna": "********",
                 *       "Sets": [
                 *         33,
                 *         34
                 *       ],
                 *       "TodosSets": false
                 *     }
                 */
                "application/json": components["schemas"]["CrearCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "Actecos": [
                     *         {
                     *           "AffectoIva": "SI",
                     *           "Codigo": "620200",
                     *           "Nombre": "Actividades de consultoría informática"
                     *         }
                     *       ],
                     *       "ClasificacionError": 0,
                     *       "CodigoError": null,
                     *       "Comentario": "API",
                     *       "Direccion": "Calle Ejemplo 123, Santiago",
                     *       "DireccionModificada": null,
                     *       "DireccionRegional": "Santiago Centro",
                     *       "DireccionRegionalModificada": null,
                     *       "Estado": 1,
                     *       "Etapa": 1,
                     *       "Fecha": "2026-10-07T10:15:00",
                     *       "FechaEstado": "2026-10-07T10:15:00",
                     *       "Giro": "Desarrollo de software",
                     *       "GiroModificado": null,
                     *       "HorasEnEstado": 0,
                     *       "PasoEnSII": 0,
                     *       "Productos": [],
                     *       "RUT": "11111111-1",
                     *       "RazonSocial": "Comercial Ejemplo SpA",
                     *       "RazonSocialModificada": null,
                     *       "Reinicios": 0,
                     *       "Servicios": [],
                     *       "Sets": [
                     *         33,
                     *         34
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Certificacion"];
                };
            };
            401: components["responses"]["NoAutenticado"];
            /** @description La operación no está disponible para esta credencial. El cuerpo es el texto literal que devuelve la API, con el RUT del intento. */
            403: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example La llave maestra no puede crear certificaciones. RUT del intento: 11111111-1. */
                    "text/plain": components["schemas"]["ErrorTextoPlano"];
                };
            };
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
    certificaciones_v2_iniciar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description RUT de la empresa */
                rut: string;
            };
            cookie?: never;
        };
        /** @description Datos de la certificación para actualizarlos. */
        requestBody?: {
            content: {
                /**
                 * @example {
                 *       "Certificado": {
                 *         "Contrasenna": "********",
                 *         "Data": "MIIC"
                 *       },
                 *       "Productos": [
                 *         {
                 *           "Nombre": "Licencia mensual",
                 *           "Precio": 10000
                 *         }
                 *       ],
                 *       "Servicios": [
                 *         {
                 *           "Nombre": "Implementación",
                 *           "Precio": 100000
                 *         }
                 *       ],
                 *       "Sets": [
                 *         33
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ActualizarCertificacion"];
            };
        };
        responses: {
            /** @description Respuesta exitosa. */
            200: {
                headers: {
                    "RateLimit-Limit": components["headers"]["RateLimit-Limit"];
                    "RateLimit-Remaining": components["headers"]["RateLimit-Remaining"];
                    [name: string]: unknown;
                };
                content: {
                    /** @example true */
                    "application/json": boolean;
                };
            };
            401: components["responses"]["NoAutenticado"];
            404: components["responses"]["ErrorNegocio"];
            409: components["responses"]["LimiteDeTasa"];
            500: components["responses"]["ErrorNegocio"];
        };
    };
}
