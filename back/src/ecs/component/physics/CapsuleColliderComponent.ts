import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

export class CapsuleColliderComponent extends Component {
  constructor(
    entityId: number,
    public collider?: Rapier.Collider
  ) {
    super(entityId)
  }
}
