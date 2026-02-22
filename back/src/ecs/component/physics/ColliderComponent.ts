import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

export class ColliderComponent extends Component {
  constructor(
    entityId: number,
    public collider: Rapier.Collider
  ) {
    super(entityId)
  }
}
