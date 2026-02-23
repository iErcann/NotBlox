import { Component } from '@shared/component/Component.js'

/**
 * Event to change the size of an entity.
 * Used by SizeEventSystem.
 */
export class SizeEvent extends Component {
  constructor(
    entityId: number,
    public width: number,
    public height: number,
    public depth: number
  ) {
    super(entityId)
  }
}
