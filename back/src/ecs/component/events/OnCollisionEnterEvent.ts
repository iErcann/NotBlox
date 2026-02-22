import { Entity } from '@shared/entity/Entity.js'
import { Component } from '@shared/component/Component.js'

/**
 * This component is used to handle the collision enter event.
 * Used by CollisionSystem.
 *
 * @param entityId - The ID of the entity that this component is attached to.
 * @param callback - The callback function to be called when the collision enter event occurs.
 */
export class OnCollisionEnterEvent extends Component {
  constructor(
    entityId: number,
    public callback: (collidedWithEntity: Entity) => void
  ) {
    super(entityId)
  }

  onCollisionEnter(collidedWithEntity: Entity) {
    try {
      this.callback(collidedWithEntity)
    } catch (error) {
      console.error('Error in collision enter callback:', error)
    }
  }
}
