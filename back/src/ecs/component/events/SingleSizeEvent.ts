import { Component } from '@shared/component/Component.js'

/**
 * Event to change the size of an entity.
 * Used by SingleSizeEventSystem.
 */
export class SingleSizeEvent extends Component {
  constructor(
    entityId: number,
    public size: number
  ) {
    super(entityId)
  }
}
