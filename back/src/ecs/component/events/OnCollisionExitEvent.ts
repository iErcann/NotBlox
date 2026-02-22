import { Entity } from '@shared/entity/Entity.js'
import { Component } from '@shared/component/Component.js'

/**
 * This component is used to handle the collision exit event.
 * Used by CollisionSystem.
 *
 * @param entityId - The ID of the entity that this component is attached to.
 * @param callback - The callback function to be called when the collision exit event occurs.
 */
export class OnCollisionExitEvent extends Component {
  constructor(
    entityId: number,
    public callback: (collidedWithEntity: Entity) => void
  ) {
    super(entityId)
  }

  onCollisionExit(collidedWithEntity: Entity) {
    try {
      this.callback(collidedWithEntity)
    } catch (error) {
      console.error('Error in collision exit callback:', error)
    }
  }
}
