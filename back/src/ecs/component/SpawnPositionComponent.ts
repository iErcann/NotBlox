import { Component } from '@shared/component/Component.js'

/**
 * This component is used to set the spawn position of an entity.
 *
 * @param entityId - The ID of the entity that this component is attached to.
 * @param x - The x coordinate of the spawn position.
 * @param y - The y coordinate of the spawn position.
 * @param z - The z coordinate of the spawn position.
 */
export class SpawnPositionComponent extends Component {
  constructor(
    entityId: number,
    public x: number,
    public y: number,
    public z: number
  ) {
    super(entityId)
  }
}
