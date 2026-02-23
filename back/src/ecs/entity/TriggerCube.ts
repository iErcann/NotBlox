import { Entity } from '@shared/entity/Entity.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { SizeComponent } from '@shared/component/SizeComponent.js'
import { BoxColliderComponent } from '../component/physics/BoxColliderComponent.js'
import { KinematicRigidBodyComponent } from '../component/physics/KinematicRigidBodyComponent.js'
import { OnCollisionEnterEvent } from '../component/events/OnCollisionEnterEvent.js'
import { OnCollisionExitEvent } from '../component/events/OnCollisionExitEvent.js'
import { ColliderPropertiesComponent } from '../component/physics/ColliderPropertiesComponent.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import { ColorComponent } from '@shared/component/ColorComponent.js'

/**
 * A trigger cube area to trigger events when a player enters or exits it.
 * It is a kinematic rigid body and a box collider with sensor enabled. (Invisible & non-collidable)
 */
export class TriggerCube {
  entity: Entity

  constructor(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    onEnter: (entity: Entity) => void,
    onExit: (entity: Entity) => void,
    showDebug: boolean = false
  ) {
    this.entity = EntityManager.createEntity(SerializedEntityType.CUBE)

    const positionComponent = new PositionComponent(this.entity.id, x, y, z)
    this.entity.addComponent(positionComponent)

    const sizeComponent = new SizeComponent(this.entity.id, width, height, depth)
    this.entity.addComponent(sizeComponent)

    // Add kinematic rigid body
    this.entity.addComponent(new KinematicRigidBodyComponent(this.entity.id))

    // Make it a sensor to be traversable by other entities
    const colliderProperties = new ColliderPropertiesComponent(this.entity.id, {
      isSensor: true,
      friction: 0,
      restitution: 0,
    })
    this.entity.addComponent(colliderProperties)

    // Add box collider with sensor enabled
    const boxCollider = new BoxColliderComponent(this.entity.id)
    this.entity.addComponent(boxCollider)

    this.entity.addComponent(new OnCollisionEnterEvent(this.entity.id, onEnter))
    this.entity.addComponent(new OnCollisionExitEvent(this.entity.id, onExit))

    // Show the trigger cube for debugging purposes.
    // Will show a red cube.
    if (showDebug) {
      // Debug mesh
      const serverMeshComponent = new ServerMeshComponent(
        this.entity.id,
        'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Crate.glb'
      )
      this.entity.addComponent(serverMeshComponent)

      // Debug color
      const colorComponent = new ColorComponent(this.entity.id, '#ff0000')
      this.entity.addComponent(colorComponent)

      const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
        positionComponent,
        sizeComponent,
        serverMeshComponent,
        colorComponent,
      ])
      this.entity.addComponent(networkDataComponent)
    }
  }
}
