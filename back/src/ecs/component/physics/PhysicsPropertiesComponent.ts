import { Component } from '@shared/component/Component.js'

export interface PhysicsPropertiesComponentData {
  mass?: number
  enableCcd?: boolean
  angularDamping?: number
  linearDamping?: number
  gravityScale?: number
}

export class PhysicsPropertiesComponent extends Component {
  constructor(
    entityId: number,
    public data: PhysicsPropertiesComponentData
  ) {
    super(entityId)
  }
}
