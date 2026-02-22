import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'

import { Entity } from '@shared/entity/Entity.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'

import { ColorComponent } from '@shared/component/ColorComponent.js'
import { SingleSizeComponent } from '@shared/component/SingleSizeComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { SphereColliderComponent } from '../component/physics/SphereColliderComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import {
  PhysicsPropertiesComponent,
  PhysicsPropertiesComponentData,
} from '../component/physics/PhysicsPropertiesComponent.js'
import {
  ColliderPropertiesComponent,
  ColliderPropertiesComponentData,
} from '../component/physics/ColliderPropertiesComponent.js'

export interface SphereParams {
  /**
   * @default 1
   */
  radius?: number
  position: {
    x: number
    y: number
    z: number
  }
  /**
   * @default "default" (Mesh color is unchanged)
   */
  color?: string
  /**
   * @default https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Sphere.glb
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
export class Sphere {
  entity: Entity

  constructor(params: SphereParams) {
    const { position, radius, color, meshUrl, physicsProperties, colliderProperties } = params

    this.entity = EntityManager.createEntity(SerializedEntityType.SPHERE)

    const positionComponent = new PositionComponent(
      this.entity.id,
      position.x,
      position.y,
      position.z
    )
    this.entity.addComponent(positionComponent)

    const rotationComponent = new RotationComponent(this.entity.id, 0, 0, 0, 0)
    this.entity.addComponent(rotationComponent)

    const sizeComponent = new SingleSizeComponent(this.entity.id, radius ?? 1)
    this.entity.addComponent(sizeComponent)

    const colorComponent = new ColorComponent(this.entity.id, color ?? 'default')
    this.entity.addComponent(colorComponent)

    const serverMeshComponent = new ServerMeshComponent(
      this.entity.id,
      meshUrl ?? 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Sphere.glb'
    )
    this.entity.addComponent(serverMeshComponent)
    this.entity.addComponent(
      new PhysicsPropertiesComponent(this.entity.id, physicsProperties ?? {})
    )
    this.entity.addComponent(new DynamicRigidBodyComponent(this.entity.id))
    this.entity.addComponent(
      new ColliderPropertiesComponent(this.entity.id, colliderProperties ?? {})
    )
    this.entity.addComponent(new SphereColliderComponent(this.entity.id))

    const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
      positionComponent,
      rotationComponent,
      sizeComponent,
      colorComponent,
      serverMeshComponent,
    ])
    this.entity.addComponent(networkDataComponent)
  }
  getPosition() {
    return this.entity.getComponent<PositionComponent>(PositionComponent)!
  }
}
