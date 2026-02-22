import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

export class DynamicRigidBodyComponent extends Component {
  constructor(
    entityId: number,
    public body?: Rapier.RigidBody
  ) {
    super(entityId)
  }
}
