import { Entity } from '@shared/entity/Entity.js'
import { VehicleComponent } from '@shared/component/VehicleComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { InputComponent } from '../component/InputComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { VehicleRayCastComponent } from '../component/physics/VehicleRayCastComponent.js'
import { VehicleOccupancyComponent } from '@shared/component/VehicleOccupancyComponent.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import Rapier from '../../physics/rapier.js'
import * as THREE from 'three'

export class VehicleMovementSystem {
  // Hack for proximity prompt
  snapAllOccupantsToVehicle(entities: Entity[]): void {
    for (const carEntity of entities) {
      const carComponent = carEntity.getComponent(VehicleComponent)
      const carPosition = carEntity.getComponent(PositionComponent)
      if (carComponent && carPosition) {
        if (carComponent.driverEntityId) {
          const driver = EntityManager.getEntityById(entities, carComponent.driverEntityId)
          if (driver) {
            const rigidBody = driver.getComponent(DynamicRigidBodyComponent)?.body
            if (rigidBody) {
              rigidBody.setTranslation(
                new Rapier.Vector3(carPosition.x, carPosition.y, carPosition.z),
                true
              )
            }
          }
        }
        const passengers = carComponent.passengerEntityIds
        for (const passengerId of passengers) {
          const passenger = EntityManager.getEntityById(entities, passengerId)
          if (passenger) {
            const rigidBody = passenger.getComponent(DynamicRigidBodyComponent)?.body
            if (rigidBody) {
              rigidBody.setTranslation(
                new Rapier.Vector3(carPosition.x, carPosition.y, carPosition.z),
                true
              )
            }
          }
        }
      }
    }
  }

  update(entities: Entity[]): void {
    this.snapAllOccupantsToVehicle(entities)

    for (const entity of entities) {
      const carComponent = entity.getComponent(VehicleComponent)
      if (carComponent) {
        if (!carComponent.driverEntityId) {
          continue
        }

        const driver = EntityManager.getEntityById(entities, carComponent.driverEntityId)
        if (!driver) {
          console.error(
            'VehicleInputSystem: Driver entity not found for the id ' + carComponent.driverEntityId
          )
          continue
        }

        const driverInputComponent = driver.getComponent(InputComponent)

        if (!driver.getComponent(VehicleOccupancyComponent)) {
          console.error(
            'VehicleInputSystem: Driver is not in a vehicle ? The driver should have a VehicleOccupancyComponent : ' +
              driver
          )
          continue
        }

        if (!driverInputComponent) {
          console.error('VehicleInputSystem: Driver has no input component')
          continue
        }

        const rigidBody = entity.getComponent(DynamicRigidBodyComponent)?.body
        const vehicleController = entity.getComponent(VehicleRayCastComponent)?.raycastController

        if (rigidBody && vehicleController) {
          // Wake up rigid body only when applying force/torque
          if (
            driverInputComponent.up ||
            driverInputComponent.down ||
            driverInputComponent.left ||
            driverInputComponent.right
          ) {
            rigidBody.wakeUp()
          }

          // Find engine force wheels index
          const engineForceWheelsIndex = carComponent.wheels
            .map((wheel, index) => (wheel.isEngineWheel ? index : -1))
            .filter((index) => index !== -1)
          // Engine force for back wheels
          const engineForce = driverInputComponent.up
            ? 15000
            : driverInputComponent.down
              ? -15000
              : 0
          for (const wheelIndex of engineForceWheelsIndex) {
            vehicleController.setWheelEngineForce(wheelIndex, engineForce)
          }

          // Find steering wheels index
          const steeringWheelsIndex = carComponent.wheels
            .map((wheel, index) => (wheel.isSteeringWheel ? index : -1))
            .filter((index) => index !== -1)
          // Steering for front wheels
          const steeringAngle = driverInputComponent.left
            ? Math.PI / 12
            : driverInputComponent.right
              ? -Math.PI / 12
              : 0
          for (const wheelIndex of steeringWheelsIndex) {
            vehicleController.setWheelSteering(wheelIndex, steeringAngle)
          }

          // const vehiclePosition = rigidBody.translation()
          // Update the wheels for visual purpose
          for (let i = 0; i < carComponent.wheels.length; i++) {
            const wheel = carComponent.wheels[i]
            // const wheelAxleCs = vehicleController.wheelAxleCs(i)!
            const connectionY = vehicleController.wheelChassisConnectionPointCs(i)?.y || 0
            const suspensionLength = vehicleController.wheelSuspensionLength(i) || 0
            const steeringRad = vehicleController.wheelSteering(i) || 0
            const rotationRad = vehicleController.wheelRotation(i) || 0

            wheel.positionComponent.y = connectionY - suspensionLength
            const quart = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(
                rotationRad, // Wheel spin (X-axis)
                steeringRad, // Steering rotation (Y-axis)
                0, // No camber
                'YXZ' // Rotation order: Steer first, then spin
              )
            )
            wheel.rotationComponent.x = quart.x
            wheel.rotationComponent.y = quart.y
            wheel.rotationComponent.z = quart.z
            wheel.rotationComponent.w = quart.w
          }

          // Update the vehicle controller
          carComponent.updated = true
        }
      }
    }
  }
}
