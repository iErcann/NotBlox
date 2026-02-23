import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

export class TrimeshColliderComponent extends Component {
  constructor(
    entityId: number,
    public collider?: Rapier.Collider
  ) {
    super(entityId)
  }
}

export class TrimeshCollidersComponent extends Component {
  constructor(
    entityId: number,
    public filePath: string,
    public colliders?: TrimeshColliderComponent[]
  ) {
    super(entityId)
  }
}
