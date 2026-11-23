import { recursos, type Recursos } from './generated/resources.js';
import { Nucleo, type OpcionesDeCliente } from './request.js';

/**
 * Cliente de la API de Enrolamiento: un grupo de métodos por `x-sdk-group` del contrato (`caf`,
 * `certificaciones.v1`, …), con un método por operación.
 *
 * @example
 * const cliente = new Enrolamiento({ ambiente: 0 });
 * const certificacion = await cliente.certificaciones.v1.consultar({ rut: '11111111-1' });
 */
export default class Enrolamiento extends Nucleo {
  constructor(opciones: OpcionesDeCliente = {}) {
    super(opciones);
    Object.assign(this, recursos(this));
  }
}

// Los grupos de `recursos(nucleo)` como propiedades de solo lectura: el constructor los asigna.
export default interface Enrolamiento extends Recursos {}
