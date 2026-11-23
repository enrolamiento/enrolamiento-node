// Generado por scripts/generate.mjs desde contract/openapi.json. No editar a mano: correr `npm run generate`.

/** Ambientes del SII. */
export const Ambiente = {
  /** Homologación. */
  Homologacion: 0,
  /** Producción. */
  Produccion: 1,
} as const;
export type Ambiente = (typeof Ambiente)[keyof typeof Ambiente];

/** Clasificaciones de los tipos de errores. */
export const ClasificacionError = {
  /** No se encuentra en error. */
  Ninguno: 0,
  /** Error del sistema. Este debe resolverse en enrolamiento. */
  Sistema: 1,
  /** El usuario de la plataforma de enrolamiento puede resolver el problema. */
  Admin: 2,
  /** El cliente debe resolver la situación. */
  Cliente: 3,
} as const;
export type ClasificacionError = (typeof ClasificacionError)[keyof typeof ClasificacionError];

/** Posible estados de la certificación. */
export const EstadoCertificacion = {
  /** Creada, pero no comenzada aún. */
  Creada: 0,
  /** En progreso. */
  EnProgreso: 1,
  /** Finalizada. */
  Completada: 2,
  /** Con error */
  Error: 3,
} as const;
export type EstadoCertificacion = (typeof EstadoCertificacion)[keyof typeof EstadoCertificacion];

/** Etapas por las que transita la certificación. */
export const EtapaCertificacion = {
  /** En verificación del SII. Usualmente el representante legal puede tener situaciones pendientes en el SII. */
  VerificacionSII: 0,
  /** Ingreso de datos. */
  IngresoDatos: 1,
  /** Proceso en el SII. */
  ConfiguracionSII: 2,
  /** Declaración final. */
  DeclaracionFinal: 3,
  /** Finalizada */
  Completada: 4,
} as const;
export type EtapaCertificacion = (typeof EtapaCertificacion)[keyof typeof EtapaCertificacion];

/** Pasos por los que transita la certificación en el SII. */
export const PasoCertificacion = {
  /** Aún no comienza el proceso. */
  Ninguno: 0,
  /** Postulación. */
  Postulacion: 1,
  /** Set de prueba. */
  Prueba: 2,
  /** Set de simulación. */
  Simulacion: 3,
  /** Set de intercambio. */
  Intercambio: 4,
  /** Muestras impresas. */
  MuestrasImpresas: 5,
} as const;
export type PasoCertificacion = (typeof PasoCertificacion)[keyof typeof PasoCertificacion];

/** Procesos que se pueden reiniciar de la certificación. */
export const ReiniciarProceso = {
  /** Reiniciar la certificación para que comience desde el set de prueba nuevamente. */
  Certificacion: 0,
  /** Rehacer solo las muestras impresas y enviarlas al SII. */
  MuestrasImpresas: 1,
  /** Continuar la certificación que estaba en verificación SII. */
  VerificacionSII: 2,
} as const;
export type ReiniciarProceso = (typeof ReiniciarProceso)[keyof typeof ReiniciarProceso];

/** Sets posibles a certificar. */
export const Set = {
  /** SET Básico (33, 56, 61) */
  SetBasico: 33,
  /** SET Factura Exento (34, 56, 61) */
  SetExento: 34,
  /** SET Boleta Afecta (39, 61) */
  SetBoletaAfecta: 39,
  /** SET Boleta Exenta. (41, 61) */
  SetBoletaExenta: 41,
  /** Set Liquidación (43) */
  SetLiquidacion: 43,
  /** Set Factura Compra (46, 56, 61) */
  SetFacturaCompra: 46,
  /** SET Guía de despacho (52) */
  SetGuiaDespacho: 52,
  /** SET Exportación (110, 111, 112) */
  SetExportacion: 110,
} as const;
export type Set = (typeof Set)[keyof typeof Set];
