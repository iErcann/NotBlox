import { Component } from '@shared/component/Component.js'

/**
 * Put this on a entity to lock its rotation
 *
 * Checked by `LockRotationSystem`
 *
 * Uses `rigidBodyDesc.lockRotations()` to lock the rotation
 *
 * Entity must have a `DynamicRigidBodyComponent`
 */
export class LockedRotationComponent extends Component {
  constructor(entityId: number) {
    super(entityId)
  }
}
