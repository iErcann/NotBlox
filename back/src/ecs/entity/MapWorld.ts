import { EntityManager } from '@shared/system/EntityManager.js'
import { Entity } from '@shared/entity/Entity.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'
import { TrimeshCollidersComponent } from '@back/ecs/component/physics/TrimeshColliderComponent.js'
import { KinematicRigidBodyComponent } from '@back/ecs/component/physics/KinematicRigidBodyComponent.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { PhysicsPropertiesComponent } from '@back/ecs/component/physics/PhysicsPropertiesComponent.js'
import { ColliderPropertiesComponent } from '@back/ecs/component/physics/ColliderPropertiesComponent.js'

export class MapWorld {
  entity: Entity
  constructor(mapUrl: string) {
    this.entity = EntityManager.createEntity(SerializedEntityType.WORLD)

    const serverMeshComponent = new ServerMeshComponent(this.entity.id, mapUrl)
    this.entity.addComponent(serverMeshComponent)

    this.entity.addComponent(new PositionComponent(this.entity.id, 0, 0, 0))

    this.entity.addComponent(
      new ColliderPropertiesComponent(this.entity.id, {
        friction: 0.0,
        restitution: 0.1,
      })
    )
    this.entity.addComponent(
      new PhysicsPropertiesComponent(this.entity.id, {
        enableCcd: true,
        angularDamping: 0.05,
        linearDamping: 0.05,
      })
    )
    this.entity.addComponent(new KinematicRigidBodyComponent(this.entity.id))

    this.entity.addComponent(new TrimeshCollidersComponent(this.entity.id, mapUrl))
    this.entity.addComponent(
      new NetworkDataComponent(this.entity.id, this.entity.type, [serverMeshComponent])
    )
  }
}
