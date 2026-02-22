import { Component } from '@shared/component/Component.js'

/**
 *
 * Launches a raycast downwards to check if the entity is grounded.
 *
 * Checked by `GroundCheckSystem`.
 */
export class GroundCheckComponent extends Component {
  constructor(
    entityId: number,
    public grounded: boolean = false
  ) {
    super(entityId)
  }
}
