// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.

/**
 * Parámetros de ejemplo de cada operación, por `operationId`, en el objeto que recibe su método: el `example` del
 * contrato, o `'11111111-1'` para un RUT, `1` para un entero, `true` para un booleano y `'x'` para lo demás;
 * `ambiente` siempre 0, y las propiedades del ejemplo del cuerpo. Los usa el humo contra Prism.
 */
export const EJEMPLOS: { readonly [id: string]: Readonly<Record<string, unknown>> } = {
  caf_v1_anulacion_masiva_anular: {
    rut: '11111111-1',
    tipoDocumento: 1,
    folioInicial: 1,
    folioFinal: 1,
    ambiente: 0,
    mensaje: 'x',
    consultarSii: 'forzar',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_anulacion_masiva_listar: {
    rut: '11111111-1',
    tipoDocumento: 1,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_anulados: {
    rut: '11111111-1',
    tipoDocumento: 1,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_anular: {
    rut: '11111111-1',
    tipoDocumento: 1,
    inicio: 1061,
    fin: 1100,
    ambiente: 0,
    cafFinal: 1100,
    cafInicial: 1001,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_consulta: {
    rut: '11111111-1',
    tipoDocumento: 1,
    ambiente: 0,
    mesesVentana: 36,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_descargar: {
    rut: '11111111-1',
    tipoDocumento: 1,
    cantidad: 1,
    ambiente: 0,
    descargarCafAntiguos: true,
    ultimoFolio: 1,
    consultarSii: 'forzar',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_detalle_folios: {
    rut: '11111111-1',
    tipoDocumento: 33,
    folioInicial: 1051,
    folioFinal: 1250,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_detalle_folios_todos: {
    rut: '11111111-1',
    tipoDocumento: 33,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_estado_folios: {
    rut: '11111111-1',
    tipoDocumento: 33,
    folioInicial: 1001,
    folioFinal: 1100,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_listar: {
    rut: '11111111-1',
    tipoDocumento: 33,
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_memoria: {
    rut: '11111111-1',
  },
  caf_v1_reobtener: {
    rut: '11111111-1',
    tipoDocumento: 33,
    ambiente: 0,
    descargarCafAntiguos: true,
    folioInicial: 1101,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  caf_v1_vencidos: {
    rut: '11111111-1',
    ambiente: 0,
    continuar: 'r33-1101',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  certificaciones_v1_actualizar: {
    rut: '11111111-1',
    Direccion: 'Calle Ejemplo 123, Santiago',
    Giro: 'Desarrollo de software',
    Productos: [
      {
        Nombre: 'Licencia mensual',
        Precio: 10000,
      },
    ],
    RazonSocial: 'Comercial Ejemplo SpA',
    Referencia: 'Pedido 42',
    Servicios: [
      {
        Nombre: 'Implementación',
        Precio: 100000,
      },
    ],
    Sets: [33],
  },
  certificaciones_v1_actualizar_casillas_intercambio: {
    rut: '11111111-1',
    ambiente: 0,
    correoContactoEmpresa: 'intercambio@example.com',
    correoContactoSii: 'contacto-sii@example.com',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  certificaciones_v1_buscar: {
    pagina: 1,
    cantidadPorPagina: 1,
    Estado: 'Error',
    Estapa: 'ConfiguracionSII',
    Fecha: '20260901-20260930',
    PasoEnSII: 'Prueba',
    RUT: '11111111-1',
  },
  certificaciones_v1_consultar: {
    rut: '11111111-1',
  },
  certificaciones_v1_crear: {
    rut: '11111111-1',
    CertData: 'MIIC',
    Contrasenna: '********',
    Sets: [33, 34],
    TodosSets: false,
  },
  certificaciones_v1_declarar_cumplimiento: {
    rut: '11111111-1',
    correoContactoEmpresa: 'x',
    correoContactoSii: 'x',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  certificaciones_v1_iniciar: {
    rut: '11111111-1',
    Productos: [
      {
        Nombre: 'Licencia mensual',
        Precio: 10000,
      },
    ],
    Servicios: [
      {
        Nombre: 'Implementación',
        Precio: 100000,
      },
    ],
    Sets: [33],
  },
  certificaciones_v1_reiniciar: {
    rut: '11111111-1',
    Motivo: 'Rehacer el set de prueba',
    Paso: 0,
  },
  certificaciones_v1_stats: {},
  certificaciones_v2_actualizar: {
    rut: '11111111-1',
    Certificado: {
      Contrasenna: '********',
      Data: 'MIIC',
    },
    Direccion: 'Calle Ejemplo 123, Santiago',
    Giro: 'Desarrollo de software',
    Productos: [
      {
        Nombre: 'Licencia mensual',
        Precio: 10000,
      },
    ],
    RazonSocial: 'Comercial Ejemplo SpA',
    Servicios: [
      {
        Nombre: 'Implementación',
        Precio: 100000,
      },
    ],
    Sets: [33],
  },
  certificaciones_v2_crear: {
    rut: '11111111-1',
    CertData: 'MIIC',
    Contrasenna: '********',
    Sets: [33, 34],
    TodosSets: false,
  },
  certificaciones_v2_iniciar: {
    rut: '11111111-1',
    Certificado: {
      Contrasenna: '********',
      Data: 'MIIC',
    },
    Productos: [
      {
        Nombre: 'Licencia mensual',
        Precio: 10000,
      },
    ],
    Servicios: [
      {
        Nombre: 'Implementación',
        Precio: 100000,
      },
    ],
    Sets: [33],
  },
  certificados_v1_descargar_e_cert: {
    Contrasenna: '********',
    ContrasennaPfx: '********',
    Usuario: 'usuario-ecert',
  },
  certificados_v1_solicitar: {
    Empresa: {
      Area: 'Tecnología',
      Ciudad: 'Santiago',
      Comuna: 'SANTIAGO',
      Direccion: 'Calle Ejemplo 123',
      Nombre: 'Comercial Ejemplo SpA',
      Region: 'METROPOLITANA DE SANTIAGO ',
      Rut: '11111111-1',
    },
    Subscriptor: {
      ApeMaterno: 'Prueba',
      ApePaterno: 'Ejemplo',
      Ciudad: 'Santiago',
      Comuna: 'SANTIAGO',
      CopiaCedula: 'RWplbXBsbzogbm8gZXMgdW5hIGNlZHVsYSByZWFsLg==',
      Correo: 'ana@example.com',
      Direccion: 'Calle Ejemplo 123',
      Nombre: 'Ana',
      Region: 'METROPOLITANA DE SANTIAGO ',
      Rut: '12345678-5',
      Serie: 'A000000000',
      Telefono: '+56 2 2000 0000',
    },
  },
  certificados_v1_validar: {
    rut: '11111111-1',
    actualizar: true,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  empresas_v1_datos: {
    rut: '11111111-1',
    Contrasenna: '********',
    Data: 'MIIC',
  },
  empresas_v1_permisos: {
    rutEmpresa: '11111111-1',
    rutUsuario: '11111111-1',
    ambiente: 0,
    Contrasenna: '********',
    Data: 'MIIC',
  },
  portabilidad_v1_sesiones: {
    email: 'contacto@ejemplo.cl',
    prueba: false,
    referencia_externa: 'cliente-4821',
    rut: '11111111-1',
    url_retorno: 'https://erp.ejemplo.cl/portabilidad/volver',
  },
  respaldos_v1_consultar: {
    id: '3f9c2a7e5b1d4c08a6e2f0b9d7c41e53',
  },
  respaldos_v1_descargar: {
    id: '3f9c2a7e5b1d4c08a6e2f0b9d7c41e53',
  },
  respaldos_v1_listar: {
    rut: '11111111-1',
  },
};
