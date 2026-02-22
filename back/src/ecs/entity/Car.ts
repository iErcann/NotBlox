import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'
import { Entity } from '@shared/entity/Entity.js'
import { SerializedEntityType } from '@shared/network/server/serialized.js'
import { SizeComponent } from '@shared/component/SizeComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import {
  PhysicsPropertiesComponent,
  PhysicsPropertiesComponentData,
} from '../component/physics/PhysicsPropertiesComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { ConvexHullColliderComponent } from '../component/physics/ConvexHullColliderComponent.js'
import { VehicleComponent } from '@shared/component/VehicleComponent.js'
import {
  ColliderPropertiesComponent,
  ColliderPropertiesComponentData,
} from '../component/physics/ColliderPropertiesComponent.js'
import { ProximityPromptComponent } from '@shared/component/ProximityPromptComponent.js'
import { VehicleSystem } from '../system/VehicleSystem.js'
import { WheelComponent } from '@shared/component/WheelComponent.js'
import { ColorComponent } from '@shared/component/ColorComponent.js'
export interface CarParams {
  position: {
    x: number
    y: number
    z: number
  }
  /**
   * @default { width: 2, height: 2, depth: 2 }
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
   * @default "https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/Car.glb"
   */
  meshUrl?: string
  /**
   * @default {}
   */
  physicsProperties?: PhysicsPropertiesComponentData
  /**
   * @default "Car"
   */
  name?: string
  /**
   * @default { friction: 0.6, restitution: 0.2 }
   */
  colliderProperties?: ColliderPropertiesComponentData
  /**
   * @default { frontLeft: 1.4, frontRight: 1.4, backLeft: 1.4, backRight: 1.4 }
   *
   * Wheels Radius configuration object
   */
  wheelRadius?: {
    frontLeft?: number
    frontRight?: number
    backLeft?: number
    backRight?: number
  }
}

export class Car {
  entity: Entity

  constructor(params: CarParams) {
    const {
      position,
      size,
      color,
      meshUrl,
      physicsProperties,
      name,
      colliderProperties,
      wheelRadius,
    } = params

    this.entity = EntityManager.createEntity(SerializedEntityType.VEHICLE)

    // Create 4 wheels
    const frontLeftWheel = new WheelComponent({
      entityId: this.entity.id,
      positionComponent: new PositionComponent(this.entity.id, -3.46, -0.0287, 4.14),
      rotationComponent: new RotationComponent(this.entity.id, 0, 0, 0),
      radius: wheelRadius?.frontLeft ?? 1.4,
      suspensionStiffness: 10000,
      suspensionCompression: 1,
      suspensionLength: 1 / 4,
      sideFrictionStiffness: 4,
      frictionSlip: 1,
      isSteeringWheel: true,
    })
    const frontRightWheel = new WheelComponent({
      entityId: this.entity.id,
      positionComponent: new PositionComponent(this.entity.id, 3.46, -0.0287, 4.14),
      rotationComponent: new RotationComponent(this.entity.id, 0, 0, 0),
      radius: wheelRadius?.frontRight ?? 1.4,
      suspensionStiffness: 10000,
      suspensionCompression: 1,
      suspensionLength: 1 / 4,
      sideFrictionStiffness: 4,
      frictionSlip: 1,
      isSteeringWheel: true,
    })
    const backLeftWheel = new WheelComponent({
      entityId: this.entity.id,
      positionComponent: new PositionComponent(this.entity.id, -3.46, -0.0287, -4.14),
      rotationComponent: new RotationComponent(this.entity.id, 0, 0, 0),
      radius: wheelRadius?.backLeft ?? 1.4,
      suspensionStiffness: 10000,
      suspensionCompression: 1,
      suspensionLength: 1 / 4,
      sideFrictionStiffness: 4,
      frictionSlip: 1,
      isEngineWheel: true,
    })

    const backRightWheel = new WheelComponent({
      entityId: this.entity.id,
      positionComponent: new PositionComponent(this.entity.id, 3.46, -0.0287, -4.14),
      rotationComponent: new RotationComponent(this.entity.id, 0, 0, 0),
      radius: wheelRadius?.backRight ?? 1.4,
      suspensionStiffness: 10000,
      suspensionCompression: 1,
      suspensionLength: 1 / 4,
      sideFrictionStiffness: 4,
      frictionSlip: 1,
      isEngineWheel: true,
    })

    const wheels = [frontLeftWheel, frontRightWheel, backLeftWheel, backRightWheel]
    const vehicleComponent = new VehicleComponent(this.entity.id, wheels)
    this.entity.addComponent(vehicleComponent)

    const positionComponent = new PositionComponent(
      this.entity.id,
      position.x,
      position.y,
      position.z
    )
    this.entity.addComponent(positionComponent)

    const rotationComponent = new RotationComponent(this.entity.id, 0, 0, 0, 0)
    this.entity.addComponent(rotationComponent)

    const colorComponent = new ColorComponent(this.entity.id, color ?? 'default')
    this.entity.addComponent(colorComponent)

    const serverMeshComponent = new ServerMeshComponent(
      this.entity.id,
      meshUrl ??
        'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/CarNoWheel.glb'
    )
    this.entity.addComponent(serverMeshComponent)

    const textComponent = new TextComponent(this.entity.id, name ?? 'Car', 0, 5, 0, 30)
    this.entity.addComponent(textComponent)

    const sizeComponent = new SizeComponent(
      this.entity.id,
      size?.width ?? 1,
      size?.height ?? 1,
      size?.depth ?? 1
    )
    this.entity.addComponent(sizeComponent)

    this.entity.addComponent(
      new ColliderPropertiesComponent(
        this.entity.id,
        colliderProperties ?? {
          friction: 0.9,
          restitution: 0.2,
        }
      )
    )
    this.entity.addComponent(
      new ConvexHullColliderComponent(
        this.entity.id,
        meshUrl ?? 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/vehicle/Car.glb'
      )
    )
    this.entity.addComponent(
      new PhysicsPropertiesComponent(
        this.entity.id,
        physicsProperties ?? {
          enableCcd: true,
          angularDamping: 0.4,
          linearDamping: 0.3,
          mass: 4,
          gravityScale: 0.85,
        }
      )
    )

    const proximityPromptComponent = new ProximityPromptComponent(this.entity.id, {
      text: 'Enter',
      onInteract: (playerEntity) => {
        VehicleSystem.handleProximityPrompt(this.entity, playerEntity)
      },
      maxInteractDistance: 15,
      interactionCooldown: 1000,
      holdDuration: 0,
    })
    this.entity.addComponent(proximityPromptComponent)

    this.entity.addComponent(new DynamicRigidBodyComponent(this.entity.id))

    const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
      positionComponent,
      rotationComponent,
      sizeComponent,
      serverMeshComponent,
      textComponent,
      proximityPromptComponent,
      vehicleComponent,
      colorComponent,
    ])
    this.entity.addComponent(networkDataComponent)
  }
}
