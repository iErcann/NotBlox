import { Entity } from '@shared/entity/Entity.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { FollowTargetComponent } from '../component/FollowTargetComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import { EntityDestroyedEvent } from '@shared/component/events/EntityDestroyedEvent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'

/**
 * System that manages entities with FollowTargetComponent, making them follow
 * other entities with a specified offset. Useful for creating floating pets,
 * companion items, or visual effects that trail behind players.
 */
export class FollowTargetSystem {
  update(dt: number, entities: Entity[]): void {
    for (const entity of entities) {
      const followComponent = entity.getComponent(FollowTargetComponent)
      if (!followComponent) continue
      // Find the target entity (most likely a player.)
      const target = EntityManager.getEntityById(entities, followComponent.targetEntityId)
      if (!target) {
        // Target not found? Player could have been disconnected.
        // Let's remove this entity entirely, so it dissapears from the simulation
        // and the client will remove it from the scene.
        EventSystem.addNetworkEvent(new EntityDestroyedEvent(entity.id))
        continue
      }
      this.processFollowEntity(entity, target, followComponent, dt)
    }
  }

  /**
   * Processes an entity with a FollowTargetComponent to make it follow its target
   * with the specified offset, creating a floating pet-like behavior.
   */
  private processFollowEntity(
    currentEntity: Entity,
    targetEntity: Entity,
    followComponent: FollowTargetComponent,
    dt: number
  ): void {
    const position = currentEntity.getComponent(PositionComponent)
    if (!position) return

    const targetPosition = targetEntity.getComponent(PositionComponent)
    if (!targetPosition) return

    const rotation = currentEntity.getComponent(RotationComponent)
    if (!rotation) return

    // Calculate the target position with offset
    const targetX = targetPosition.x + followComponent.offset.x
    const targetY = targetPosition.y + followComponent.offset.y
    const targetZ = targetPosition.z + followComponent.offset.z

    // Use entity ID to create variation in behavior
    // This creates a value between 0.0 and 0.9
    const entityIdFactor = (currentEntity.id % 10) / 10

    // Different phase for each entity
    const timeOffset = currentEntity.id % 1000

    // Create more variation with secondary factors
    const secondaryFactor = (currentEntity.id % 7) / 7 // Different modulo for more variation
    const tertiaryFactor = (currentEntity.id % 13) / 13 // Third variation factor

    // Floating behavior with variable amplitude based on entity ID
    const floatingAmplitude = 0.5 + entityIdFactor * 1.5 // Between 0.5 and 2.0
    const floatingOffset =
      Math.sin((Date.now() + timeOffset) * (0.002 + entityIdFactor * 0.001)) * floatingAmplitude

    // Create orbital rotation around the player with significant variation
    // Vary the orbit parameters using the different factors
    const baseOrbitRadius = 3 + entityIdFactor * 3 // Base radius between 3 and 6
    const orbitEccentricity = 0.5 + secondaryFactor // Orbit eccentricity between 0.5 and 1.5
    const verticalOffset = -1 + tertiaryFactor * 2 // Vertical distribution between -1 and 1

    // Different orbital speeds and phases
    const orbitSpeed = 0.0003 + entityIdFactor * 0.0002
    const orbitPhase = Math.PI * 2 * secondaryFactor // Different starting position in orbit

    // Calculate the orbital position with proper distribution
    const angle = (Date.now() + timeOffset) * orbitSpeed + orbitPhase

    // Apply different orbital planes using secondary factor
    const planeAngle = Math.PI * 2 * tertiaryFactor

    // Calculate 3D position on orbital ellipse
    const horizontalOffsetX = Math.cos(angle) * baseOrbitRadius
    const horizontalOffsetZ = Math.sin(angle) * (baseOrbitRadius * orbitEccentricity)

    // Apply orbital plane rotation
    const rotatedOffsetX =
      horizontalOffsetX * Math.cos(planeAngle) - horizontalOffsetZ * Math.sin(planeAngle)
    const rotatedOffsetZ =
      horizontalOffsetX * Math.sin(planeAngle) + horizontalOffsetZ * Math.cos(planeAngle)

    // Add vertical variation
    const finalOffsetY = floatingOffset + verticalOffset

    // Smoothly interpolate current position to target position
    const interpolationFactor = (1.5 * dt) / 1000
    position.x = position.x + (targetX + rotatedOffsetX - position.x) * interpolationFactor
    position.y = position.y + (targetY + finalOffsetY - position.y) * interpolationFactor
    position.z = position.z + (targetZ + rotatedOffsetZ - position.z) * interpolationFactor

    // Update rotation - make the entity face the movement direction
    const dx = targetX + rotatedOffsetX - position.x
    const dz = targetZ + rotatedOffsetZ - position.z

    // Only update rotation if there's significant movement
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      // Calculate the target angle based on movement direction
      const targetAngle = Math.atan2(dz, dx)

      // Get current rotation angle from quaternion
      const currentAngle = 2 * Math.atan2(rotation.y, rotation.w)

      // Interpolate between current and target angles using dt
      const rotationSpeed = 5.0 // Adjust this value to control rotation speed
      const newAngle =
        currentAngle +
        ((((targetAngle - currentAngle + Math.PI) % (Math.PI * 2)) - Math.PI) *
          rotationSpeed *
          dt) /
          1000

      // Convert interpolated angle to quaternion
      rotation.x = 0
      rotation.y = Math.sin(newAngle / 2)
      rotation.z = 0
      rotation.w = Math.cos(newAngle / 2)
    }

    rotation.updated = true
    position.updated = true
  }
}
