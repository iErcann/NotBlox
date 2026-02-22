import { Entity } from '@shared/entity/Entity.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { FollowTargetComponent } from '../component/FollowTargetComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { SingleSizeComponent } from '@shared/component/SingleSizeComponent.js'

export interface OrbitalCompanionParams {
  /**
   * Position of the following item
   */
  position: {
    x: number
    y: number
    z: number
  }
  /**
   * URL to the mesh that will be used for this item
   */
  meshUrl: string
  /**
   * Entity ID of the target to follow
   */
  targetEntityId: number
  /**
   * Offset from the target entity's position
   * @default { x: 0, y: 2, z: 0 }
   */
  offset?: {
    x: number
    y: number
    z: number
  }
  /**
   * Size of the following item
   */
  size?: number
  /**
   * Name of the following item
   */
  name?: string
  /**
   * Display distance of the text component
   */
  displayDistance?: number
}

/**
 * Creates an orbital companion that follows a target entity with a specified offset.
Used for creating floating pets, companion items, or visual effects that trail behind players.
*/
export class OrbitalCompanion {
  entity: Entity

  constructor(params: OrbitalCompanionParams) {
    const {
      position,
      meshUrl,
      targetEntityId,
      offset = { x: 0, y: 2, z: 0 },
      displayDistance,
      name,
      size,
    } = params

    this.entity = EntityManager.createEntity(SerializedEntityType.ORBITAL_COMPANION)

    const positionComponent = new PositionComponent(
      this.entity.id,
      position.x,
      position.y,
      position.z
    )
    this.entity.addComponent(positionComponent)

    const rotationComponent = new RotationComponent(this.entity.id, 0, 0, 0)
    this.entity.addComponent(rotationComponent)

    const serverMeshComponent = new ServerMeshComponent(this.entity.id, meshUrl)
    this.entity.addComponent(serverMeshComponent)

    // Network data component
    const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
      positionComponent,
      rotationComponent,
      serverMeshComponent,
    ])

    if (size) {
      const sizeComponent = new SingleSizeComponent(this.entity.id, size)
      this.entity.addComponent(sizeComponent)
      networkDataComponent.components.push(sizeComponent)
    }

    if (name) {
      const textComponent = new TextComponent(
        this.entity.id,
        name,
        offset.x,
        offset.y,
        offset.z,
        displayDistance
      )
      this.entity.addComponent(textComponent)
      networkDataComponent.components.push(textComponent)
    }

    this.entity.addComponent(networkDataComponent)
    this.entity.addComponent(new FollowTargetComponent(this.entity.id, targetEntityId, offset))
  }
}
