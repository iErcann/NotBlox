import { InputComponent } from '../component/InputComponent.js'
import { Entity } from '@shared/entity/Entity.js'
import Rapier from '../../physics/rapier.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { GroundCheckComponent } from '../component/GroundedComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { VehicleOccupancyComponent } from '@shared/component/VehicleOccupancyComponent.js'

/**
 * System responsible for handling movement logic of entities.
 */
export class MovementSystem {
  /**
   * Updates the movement of all entities.
   */
  update(dt: number, entities: Entity[]): void {
    for (const entity of entities) {
      this.updateEntityMovement(dt, entity)
    }
  }

  /**
   * Updates the movement logic for a single entity.
   */
  updateEntityMovement(dt: number, entity: Entity): void {
    // Retrieve required components from the entity
    const inputComponent = entity.getComponent(InputComponent)
    const rigidBodyComponent = entity.getComponent(DynamicRigidBodyComponent)
    const positionComponent = entity.getComponent(PositionComponent)
    const groundedCheckComponent = entity.getComponent(GroundCheckComponent)
    const vehicleOccupancyComponent = entity.getComponent(VehicleOccupancyComponent)

    // Skip processing if any required component is missing
    if (!inputComponent || !rigidBodyComponent || !positionComponent || !groundedCheckComponent) {
      return
    }

    // Skip processing if the entity is inside a vehicle
    if (vehicleOccupancyComponent) {
      return
    }

    // Calculate the impulse based on input and physics
    const impulse = this.calculateVelocity(dt, inputComponent, rigidBodyComponent)
    // Apply a jump impulse if the space key is pressed and the entity is grounded
    if (inputComponent.space && groundedCheckComponent.grounded) {
      impulse.y = 40 // Apply vertical impulse for jumping
    }

    // Apply the calculated impulse to the rigid body
    this.setVelocity(rigidBodyComponent, impulse)
  }

  /**
   * Calculates the movement impulse based on input and current velocity.
   */
  calculateVelocity(
    dt: number,
    inputComponent: InputComponent,
    rigidBodyComponent: DynamicRigidBodyComponent
  ): Rapier.Vector3 {
    if (!rigidBodyComponent.body) {
      return new Rapier.Vector3(0, 0, 0)
    }

    const currentLinVel = rigidBodyComponent.body.linvel() // Current linear velocity
    const speed = 15 // Movement speed constant
    const lookingYAngle = inputComponent.lookingYAngle // Player's current facing direction

    // Initialize impulse with current vertical velocity
    const impulse = new Rapier.Vector3(0, currentLinVel.y, 0)

    // Adjust impulse based on directional input
    if (inputComponent.up) {
      impulse.z += -speed * Math.sin(lookingYAngle)
      impulse.x += -speed * Math.cos(lookingYAngle)
    }
    if (inputComponent.down) {
      impulse.z += speed * Math.sin(lookingYAngle)
      impulse.x += speed * Math.cos(lookingYAngle)
    }
    if (inputComponent.right) {
      impulse.z += speed * Math.sin(lookingYAngle - Math.PI / 2)
      impulse.x += speed * Math.cos(lookingYAngle - Math.PI / 2)
    }
    if (inputComponent.left) {
      impulse.z += speed * Math.sin(lookingYAngle + Math.PI / 2)
      impulse.x += speed * Math.cos(lookingYAngle + Math.PI / 2)
    }

    return impulse
  }

  /**
   * Apply the calculated velocity to the entity's rigid body.
   */
  setVelocity(rigidBodyComponent: DynamicRigidBodyComponent, impulse: Rapier.Vector3): void {
    if (!rigidBodyComponent.body) {
      return
    }
    rigidBodyComponent.body.setLinvel(impulse, true) // Apply the impulse to the rigid body
  }
}
