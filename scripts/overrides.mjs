// Ajustes a mano sobre lo que el generador deduce del contrato, por operationId.
// Cada entrada explica su motivo. El generador falla si una entrada nombra una
// operación que no está en el contrato (o que es un alias), o un parámetro de
// query que la operación no tiene.
//
// Campos de una entrada:
// - queryFija: parámetros de query que el SDK envía siempre, con ese valor.
// - quitarDeQuery: parámetros de query que el método no ofrece al llamador.
// - motivo: por qué existe la entrada.
//
// Una entrada también acepta el cuerpo de su operación tal como venga: el
// generador no exige que sea un objeto ni que sus propiedades no choquen con
// los parámetros de ruta o de query.

/**
 * @typedef {object} Override
 * @property {Readonly<Record<string, string>>} [queryFija]
 * @property {readonly string[]} [quitarDeQuery]
 * @property {string} motivo
 */

/** @type {Readonly<Record<string, Override>>} */
export const OVERRIDES = {
  respaldos_v1_descargar: {
    queryFija: { formato: 'json' },
    quitarDeQuery: ['formato'],
    motivo:
      'Sin formato=json la API responde 302 con la URL firmada en Location, y seguir esa redirección ' +
      'con Authorization hace que el almacenamiento rechace con 400. Con formato=json la URL viene en ' +
      'el cuerpo (200, con vence), que es lo que el SDK devuelve.',
  },
};

/**
 * Nombre de exportación de un enum, por nombre de esquema del contrato. Hace falta cuando el esquema se llama
 * como un global de JavaScript: el módulo que lo importara por nombre lo taparía.
 * @type {Readonly<Record<string, string>>}
 */
export const NOMBRES_DE_ENUM = {
  Set: 'SetDePruebas',
};
