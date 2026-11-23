import { recursos, type Recursos } from './generated/resources.js';
import { crearPedir, type OpcionesDeCliente } from './request.js';

/**
 * Cliente de la API de Enrolamiento: un grupo de métodos por `x-sdk-group` del contrato (`caf`,
 * `certificaciones.v1`, …), con un método por operación. No tiene otros miembros: el envío de los pedidos queda
 * dentro de los métodos.
 *
 * @example
 * const cliente = new Enrolamiento({ ambiente: 0 });
 * const certificacion = await cliente.certificaciones.v1.consultar({ rut: '11111111-1' });
 */
export default class Enrolamiento {
  constructor(opciones: OpcionesDeCliente = {}) {
    // `null` vale como sin opciones, igual que `undefined`.
    Object.assign(this, recursos(crearPedir(opciones ?? {})));
  }
}

// Los grupos de `recursos(pedir)` como propiedades de solo lectura: el constructor los asigna.
export default interface Enrolamiento extends Recursos {}
