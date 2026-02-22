import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'

import { Entity } from '@shared/entity/Entity.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'

import { EntityManager } from '@shared/system/EntityManager.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import {
  PhysicsPropertiesComponent,
  PhysicsPropertiesComponentData,
} from '../component/physics/PhysicsPropertiesComponent.js'
import {
  ColliderPropertiesComponent,
  ColliderPropertiesComponentData,
} from '../component/physics/ColliderPropertiesComponent.js'
import { ConvexHullColliderComponent } from '../component/physics/ConvexHullColliderComponent.js'

export interface MeshParams {
  position: {
    x: number
    y: number
    z: number
  }
  /**
   * @default { width: 1, height: 1, depth: 1 }
   */
  size?: {
    width: number
    height: number
    depth: number
  }
  /**
   * @default "default" (Mesh color is unchanged)
   */
  color?: string
  /**
   * @default "https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Crate.glb"
   */
  meshUrl?: string
  /**
   * @default {}
   */
  physicsProperties?: PhysicsPropertiesComponentData
  /**
   * @default {}
   */
  colliderProperties?: ColliderPropertiesComponentData
}

export class Mesh {
  entity: Entity

  constructor(params: MeshParams) {
    const { position, meshUrl, physicsProperties, colliderProperties } = params

    this.entity = EntityManager.createEntity(SerializedEntityType.CUBE)

    const positionComponent = new PositionComponent(
      this.entity.id,
      position.x,
      position.y,
      position.z
    )
    this.entity.addComponent(positionComponent)

    const rotationComponent = new RotationComponent(this.entity.id, 0, 0, 0, 0)
    this.entity.addComponent(rotationComponent)

    const serverMeshComponent = new ServerMeshComponent(
      this.entity.id,
      meshUrl ?? 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Crate.glb'
    )
    this.entity.addComponent(serverMeshComponent)

    this.entity.addComponent(
      new ColliderPropertiesComponent(this.entity.id, colliderProperties ?? {})
    )
    this.entity.addComponent(
      new ConvexHullColliderComponent(
        this.entity.id,
        meshUrl ?? 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Crate.glb'
      )
    )
    this.entity.addComponent(
      new PhysicsPropertiesComponent(this.entity.id, physicsProperties ?? {})
    )
    this.entity.addComponent(new DynamicRigidBodyComponent(this.entity.id))

    const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
      positionComponent,
      rotationComponent,
      serverMeshComponent,
    ])
    this.entity.addComponent(networkDataComponent)
  }
}
