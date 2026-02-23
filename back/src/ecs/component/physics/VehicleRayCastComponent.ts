import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

export class VehicleRayCastComponent extends Component {
  constructor(
    entityId: number,
    public raycastController: Rapier.DynamicRayCastVehicleController
  ) {
    super(entityId)
  }
}
