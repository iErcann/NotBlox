import { EventSystem } from '@shared/system/EventSystem.js'
import { ComponentAddedEvent } from '@shared/component/events/ComponentAddedEvent.js'
import { Entity } from '@shared/entity/Entity.js'
import { VehicleComponent } from '@shared/component/VehicleComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import Rapier from '../../physics/rapier.js'
import { VehicleRayCastComponent } from '../component/physics/VehicleRayCastComponent.js'
import { WheelComponent } from '@shared/component/WheelComponent.js'

export class VehicleCreationSystem {
  update(entities: Entity[], world: Rapier.World): void {
    this.handleVehicleCreation(entities, world)
  }

  private handleVehicleCreation(entities: Entity[], world: Rapier.World): void {
    const createEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, VehicleComponent)
    for (const event of createEvents) {
      const vehicleComponent: VehicleComponent = event.component
      const entity = EntityManager.getEntityById(entities, event.entityId)
      if (!entity) {
        console.error('VehicleCreationSystem: Entity not found')
        continue
      }

      const rigidbody = entity.getComponent(DynamicRigidBodyComponent)?.body
      if (!rigidbody) {
        console.error('VehicleCreationSystem: No rigidbody found')
        continue
      }

      const vehicleController = world.createVehicleController(rigidbody)
      const wheelsComponents: WheelComponent[] = vehicleComponent.wheels

      for (let i = 0; i < wheelsComponents.length; i++) {
        const wheelComponent = wheelsComponents[i]
        vehicleController.addWheel(
          new Rapier.Vector3(
            wheelComponent.positionComponent.x,
            wheelComponent.positionComponent.y,
            wheelComponent.positionComponent.z
          ),
          new Rapier.Vector3(0, -1, 0),
          new Rapier.Vector3(-1, 0, 0),
          wheelComponent.suspensionLength,
          wheelComponent.radius
        )
        vehicleController.setWheelSuspensionCompression(i, wheelComponent.suspensionCompression)
        vehicleController.setWheelSuspensionStiffness(i, wheelComponent.suspensionStiffness)
        vehicleController.setWheelSuspensionRelaxation(i, wheelComponent.suspensionRelaxation)
        vehicleController.setWheelSideFrictionStiffness(i, wheelComponent.sideFrictionStiffness)
        vehicleController.setWheelFrictionSlip(i, wheelComponent.frictionSlip)
        vehicleController.setWheelMaxSuspensionForce(i, wheelComponent.maxSuspensionForce)
        vehicleController.setWheelMaxSuspensionTravel(i, wheelComponent.maxSuspensionTravel)
      }

      entity.addComponent(new VehicleRayCastComponent(entity.id, vehicleController))
    }
  }
}
