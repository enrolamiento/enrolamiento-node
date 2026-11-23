// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.

import type { OpcionesDePedido, Pedir, PromesaDeApi } from '../request.js';
import type { ParamsDe, ParamsDelContrato, RespuestaDe } from '../types.js';
import { OPERACIONES } from './operations.js';

/**
 * Los parámetros de cada método, por `operationId`: ruta, query, cabeceras (por su nombre en el SDK) y las
 * propiedades del cuerpo, en un solo objeto. Se leen con `ParamsDe<Id>`.
 */
export interface ParamsDeOperacion {
  caf_v1_anulacion_masiva_anular: ParamsDelContrato<'caf_v1_anulacion_masiva_anular', { 'X-Consultar-Sii': 'consultarSii' }>;
  caf_v1_anulacion_masiva_listar: ParamsDelContrato<'caf_v1_anulacion_masiva_listar'>;
  caf_v1_anulados: ParamsDelContrato<'caf_v1_anulados'>;
  caf_v1_anular: ParamsDelContrato<'caf_v1_anular'>;
  caf_v1_consulta: ParamsDelContrato<'caf_v1_consulta'>;
  caf_v1_descargar: ParamsDelContrato<'caf_v1_descargar', { 'X-Consultar-Sii': 'consultarSii' }>;
  caf_v1_detalle_folios: ParamsDelContrato<'caf_v1_detalle_folios'>;
  caf_v1_detalle_folios_todos: ParamsDelContrato<'caf_v1_detalle_folios_todos'>;
  caf_v1_estado_folios: ParamsDelContrato<'caf_v1_estado_folios'>;
  caf_v1_listar: ParamsDelContrato<'caf_v1_listar'>;
  caf_v1_memoria: ParamsDelContrato<'caf_v1_memoria'>;
  caf_v1_reobtener: ParamsDelContrato<'caf_v1_reobtener'>;
  caf_v1_vencidos: ParamsDelContrato<'caf_v1_vencidos'>;
  certificaciones_v1_actualizar: ParamsDelContrato<'certificaciones_v1_actualizar'>;
  certificaciones_v1_actualizar_casillas_intercambio: ParamsDelContrato<'certificaciones_v1_actualizar_casillas_intercambio'>;
  certificaciones_v1_buscar: ParamsDelContrato<'certificaciones_v1_buscar'>;
  certificaciones_v1_consultar: ParamsDelContrato<'certificaciones_v1_consultar'>;
  certificaciones_v1_crear: ParamsDelContrato<'certificaciones_v1_crear'>;
  certificaciones_v1_declarar_cumplimiento: ParamsDelContrato<'certificaciones_v1_declarar_cumplimiento'>;
  certificaciones_v1_iniciar: ParamsDelContrato<'certificaciones_v1_iniciar'>;
  certificaciones_v1_reiniciar: ParamsDelContrato<'certificaciones_v1_reiniciar'>;
  certificaciones_v1_stats: ParamsDelContrato<'certificaciones_v1_stats'>;
  certificaciones_v2_actualizar: ParamsDelContrato<'certificaciones_v2_actualizar'>;
  certificaciones_v2_crear: ParamsDelContrato<'certificaciones_v2_crear'>;
  certificaciones_v2_iniciar: ParamsDelContrato<'certificaciones_v2_iniciar'>;
  certificados_v1_descargar_e_cert: ParamsDelContrato<'certificados_v1_descargar_e_cert'>;
  certificados_v1_solicitar: ParamsDelContrato<'certificados_v1_solicitar'>;
  certificados_v1_validar: ParamsDelContrato<'certificados_v1_validar'>;
  empresas_v1_datos: ParamsDelContrato<'empresas_v1_datos'>;
  empresas_v1_permisos: ParamsDelContrato<'empresas_v1_permisos'>;
  portabilidad_v1_sesiones: ParamsDelContrato<'portabilidad_v1_sesiones'>;
  respaldos_v1_consultar: ParamsDelContrato<'respaldos_v1_consultar'>;
  respaldos_v1_descargar: ParamsDelContrato<'respaldos_v1_descargar', {}, 'formato'>;
  respaldos_v1_listar: ParamsDelContrato<'respaldos_v1_listar'>;
}

/** Los grupos de métodos del cliente, uno por `x-sdk-group` del contrato. */
export interface Recursos {
  readonly caf: {
    /**
     * Anular folios emitidos de forma masiva para un CAF.
     *
     * Operación `caf_v1_anulacion_masiva_anular` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    anulacionMasivaAnular(
      params: ParamsDe<'caf_v1_anulacion_masiva_anular'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_anulacion_masiva_anular'>>;
    /**
     * Consultar el listado de folios emitidos para anulación masiva.
     *
     * Operación `caf_v1_anulacion_masiva_listar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    anulacionMasivaListar(
      params: ParamsDe<'caf_v1_anulacion_masiva_listar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_anulacion_masiva_listar'>>;
    /**
     * Consultar los rangos de folios anulados para el tipo de documento.
     *
     * Operación `caf_v1_anulados` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    anulados(
      params: ParamsDe<'caf_v1_anulados'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_anulados'>>;
    /**
     * Anular un rango de folios en el SII.
     *
     * Operación `caf_v1_anular` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    anular(
      params: ParamsDe<'caf_v1_anular'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_anular'>>;
    /**
     * Consultar el último folio emitido para el tipo de documento.
     *
     * Operación `caf_v1_consulta` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    consulta(
      params: ParamsDe<'caf_v1_consulta'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_consulta'>>;
    /**
     * Descargar un CAF desde el SII.
     *
     * Operación `caf_v1_descargar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    descargar(
      params: ParamsDe<'caf_v1_descargar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_descargar'>>;
    /**
     * Consultar en el SII, CAF por CAF, los tramos de folios disponibles, utilizados y anulados de un rango.
     *
     * Operación `caf_v1_detalle_folios` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    detalleFolios(
      params: ParamsDe<'caf_v1_detalle_folios'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_detalle_folios'>>;
    /**
     * Consultar en el SII, CAF por CAF, los tramos de folios disponibles, utilizados y anulados de todos los CAF de un tipo.
     *
     * Operación `caf_v1_detalle_folios_todos` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    detalleFoliosTodos(
      params: ParamsDe<'caf_v1_detalle_folios_todos'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_detalle_folios_todos'>>;
    /**
     * Consultar en el SII el estado de un rango de folios: disponibles, utilizados y anulados.
     *
     * Operación `caf_v1_estado_folios` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    estadoFolios(
      params: ParamsDe<'caf_v1_estado_folios'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_estado_folios'>>;
    /**
     * Listar los CAF que el SII tiene autorizados para la empresa y el tipo de documento, en el ambiente pedido.
     *
     * Operación `caf_v1_listar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    listar(
      params: ParamsDe<'caf_v1_listar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_listar'>>;
    /**
     * Olvidar la memoria de rechazos del SII de una empresa. Solo para operaciones.
     *
     * Operación `caf_v1_memoria` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    olvidarMemoria(
      params: ParamsDe<'caf_v1_memoria'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_memoria'>>;
    /**
     * Reobtener un CAF ya timbrado desde el SII: el último o, con folioInicial, el que empieza en ese folio.
     *
     * Operación `caf_v1_reobtener` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    reobtener(
      params: ParamsDe<'caf_v1_reobtener'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_reobtener'>>;
    /**
     * Revisar en el SII qué CAF vencidos de la empresa todavía tienen folios disponibles, que hay que anular.
     *
     * Operación `caf_v1_vencidos` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    vencidos(
      params: ParamsDe<'caf_v1_vencidos'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'caf_v1_vencidos'>>;
  };
  readonly certificaciones: {
    readonly v1: {
      /**
       * Actualizar los datos de una certificación.
       *
       * Operación `certificaciones_v1_actualizar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      actualizar(
        params: ParamsDe<'certificaciones_v1_actualizar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_actualizar'>>;
      /**
       * Actualiza casillas de intercambio en el SII para la empresa en el ambiente de producción.
       *
       * Operación `certificaciones_v1_actualizar_casillas_intercambio` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      actualizarCasillasIntercambio(
        params: ParamsDe<'certificaciones_v1_actualizar_casillas_intercambio'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_actualizar_casillas_intercambio'>>;
      /**
       * Buscar certificación, especificando un set de filtros.
       *
       * Operación `certificaciones_v1_buscar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      buscar(
        params: ParamsDe<'certificaciones_v1_buscar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_buscar'>>;
      /**
       * Obtener los datos de una certificación, dado el RUT de la empresa.
       *
       * Operación `certificaciones_v1_consultar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      consultar(
        params: ParamsDe<'certificaciones_v1_consultar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_consultar'>>;
      /**
       * Crear una nueva certificación.
       *
       * Operación `certificaciones_v1_crear` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      crear(
        params: ParamsDe<'certificaciones_v1_crear'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_crear'>>;
      /**
       * Declarar cumplimiento a la certificación en curso.
       *
       * Operación `certificaciones_v1_declarar_cumplimiento` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      declararCumplimiento(
        params: ParamsDe<'certificaciones_v1_declarar_cumplimiento'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_declarar_cumplimiento'>>;
      /**
       * Iniciar el proceso de certificación.
       *
       * Operación `certificaciones_v1_iniciar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      iniciar(
        params: ParamsDe<'certificaciones_v1_iniciar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_iniciar'>>;
      /**
       * Reinicia la certificación, eliminando todos los datos generados para la misma.
       *
       * Operación `certificaciones_v1_reiniciar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      reiniciar(
        params: ParamsDe<'certificaciones_v1_reiniciar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_reiniciar'>>;
      /**
       * Muestra estadísticas de las certificaciones.
       *
       * Operación `certificaciones_v1_stats` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      stats(
        params?: ParamsDe<'certificaciones_v1_stats'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v1_stats'>>;
    };
    readonly v2: {
      /**
       * Actualizar los datos de una certificación.
       *
       * Operación `certificaciones_v2_actualizar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      actualizar(
        params: ParamsDe<'certificaciones_v2_actualizar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v2_actualizar'>>;
      /**
       * Crear una nueva certificación.
       *
       * Operación `certificaciones_v2_crear` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      crear(
        params: ParamsDe<'certificaciones_v2_crear'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v2_crear'>>;
      /**
       * Iniciar el proceso de certificación.
       *
       * Operación `certificaciones_v2_iniciar` del contrato.
       *
       * @see https://developers.enrolamiento.cl/docs/referencia/
       */
      iniciar(
        params: ParamsDe<'certificaciones_v2_iniciar'>,
        opciones?: OpcionesDePedido,
      ): PromesaDeApi<RespuestaDe<'certificaciones_v2_iniciar'>>;
    };
  };
  readonly certificados: {
    /**
     * Descargar un certificado desde E-Cert.
     *
     * Operación `certificados_v1_descargar_e_cert` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    descargarECert(
      params?: ParamsDe<'certificados_v1_descargar_e_cert'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'certificados_v1_descargar_e_cert'>>;
    /**
     * Solicita un certificado.
     *
     * Operación `certificados_v1_solicitar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    solicitar(
      params?: ParamsDe<'certificados_v1_solicitar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'certificados_v1_solicitar'>>;
    /**
     * Valida que el certificado tenga permisos para la empresa.
     *
     * Operación `certificados_v1_validar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    validar(
      params: ParamsDe<'certificados_v1_validar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'certificados_v1_validar'>>;
  };
  readonly empresas: {
    /**
     * Obtiene la información de la empresa.
     *
     * Operación `empresas_v1_datos` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    datos(
      params: ParamsDe<'empresas_v1_datos'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'empresas_v1_datos'>>;
    /**
     * Actualiza el usuario con RUT {rutUsuario} con permisos en el SII para la empresa con RUT {rutEmpresa}.
     *
     * Operación `empresas_v1_permisos` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    permisos(
      params: ParamsDe<'empresas_v1_permisos'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'empresas_v1_permisos'>>;
  };
  readonly portabilidad: {
    /**
     * Crear una sesión del widget de portabilidad para una empresa.
     *
     * Operación `portabilidad_v1_sesiones` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    sesiones(
      params: ParamsDe<'portabilidad_v1_sesiones'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'portabilidad_v1_sesiones'>>;
  };
  readonly respaldos: {
    /**
     * Consultar el estado de un respaldo MiPyme.
     *
     * Operación `respaldos_v1_consultar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    consultar(
      params: ParamsDe<'respaldos_v1_consultar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'respaldos_v1_consultar'>>;
    /**
     * Descargar el archivo .zip de un respaldo MiPyme.
     *
     * Operación `respaldos_v1_descargar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    descargar(
      params: ParamsDe<'respaldos_v1_descargar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'respaldos_v1_descargar'>>;
    /**
     * Listar los respaldos MiPyme de una empresa.
     *
     * Operación `respaldos_v1_listar` del contrato.
     *
     * @see https://developers.enrolamiento.cl/docs/referencia/
     */
    listar(
      params?: ParamsDe<'respaldos_v1_listar'>,
      opciones?: OpcionesDePedido,
    ): PromesaDeApi<RespuestaDe<'respaldos_v1_listar'>>;
  };
}

/** Arma los grupos de métodos del cliente sobre `pedir`, que envía cada operación. */
export function recursos(pedir: Pedir): Recursos {
  return {
    caf: {
      anulacionMasivaAnular: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_anulacion_masiva_anular'], params ?? {}, opciones),
      anulacionMasivaListar: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_anulacion_masiva_listar'], params ?? {}, opciones),
      anulados: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_anulados'], params ?? {}, opciones),
      anular: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_anular'], params ?? {}, opciones),
      consulta: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_consulta'], params ?? {}, opciones),
      descargar: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_descargar'], params ?? {}, opciones),
      detalleFolios: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_detalle_folios'], params ?? {}, opciones),
      detalleFoliosTodos: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_detalle_folios_todos'], params ?? {}, opciones),
      estadoFolios: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_estado_folios'], params ?? {}, opciones),
      listar: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_listar'], params ?? {}, opciones),
      olvidarMemoria: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_memoria'], params ?? {}, opciones),
      reobtener: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_reobtener'], params ?? {}, opciones),
      vencidos: (params, opciones) =>
        pedir(OPERACIONES['caf_v1_vencidos'], params ?? {}, opciones),
    },
    certificaciones: {
      v1: {
        actualizar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_actualizar'], params ?? {}, opciones),
        actualizarCasillasIntercambio: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_actualizar_casillas_intercambio'], params ?? {}, opciones),
        buscar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_buscar'], params ?? {}, opciones),
        consultar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_consultar'], params ?? {}, opciones),
        crear: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_crear'], params ?? {}, opciones),
        declararCumplimiento: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_declarar_cumplimiento'], params ?? {}, opciones),
        iniciar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_iniciar'], params ?? {}, opciones),
        reiniciar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_reiniciar'], params ?? {}, opciones),
        stats: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v1_stats'], params ?? {}, opciones),
      },
      v2: {
        actualizar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v2_actualizar'], params ?? {}, opciones),
        crear: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v2_crear'], params ?? {}, opciones),
        iniciar: (params, opciones) =>
          pedir(OPERACIONES['certificaciones_v2_iniciar'], params ?? {}, opciones),
      },
    },
    certificados: {
      descargarECert: (params, opciones) =>
        pedir(OPERACIONES['certificados_v1_descargar_e_cert'], params ?? {}, opciones),
      solicitar: (params, opciones) =>
        pedir(OPERACIONES['certificados_v1_solicitar'], params ?? {}, opciones),
      validar: (params, opciones) =>
        pedir(OPERACIONES['certificados_v1_validar'], params ?? {}, opciones),
    },
    empresas: {
      datos: (params, opciones) =>
        pedir(OPERACIONES['empresas_v1_datos'], params ?? {}, opciones),
      permisos: (params, opciones) =>
        pedir(OPERACIONES['empresas_v1_permisos'], params ?? {}, opciones),
    },
    portabilidad: {
      sesiones: (params, opciones) =>
        pedir(OPERACIONES['portabilidad_v1_sesiones'], params ?? {}, opciones),
    },
    respaldos: {
      consultar: (params, opciones) =>
        pedir(OPERACIONES['respaldos_v1_consultar'], params ?? {}, opciones),
      descargar: (params, opciones) =>
        pedir(OPERACIONES['respaldos_v1_descargar'], params ?? {}, opciones),
      listar: (params, opciones) =>
        pedir(OPERACIONES['respaldos_v1_listar'], params ?? {}, opciones),
    },
  };
}
