import { Component } from '@shared/component/Component.js'

/**
 * Randomize the entity's behavior.
 * For testing purposes mostly.
 * Used by RandomizeSystem.
 */
export class RandomizeComponent extends Component {
  constructor(entityId: number) {
    super(entityId)
  }
}
