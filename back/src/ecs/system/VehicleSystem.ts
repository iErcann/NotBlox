import { Entity } from '@shared/entity/Entity.js'
import { VehicleCreationSystem } from './VehicleCreationSystem.js'
import { VehicleMovementSystem } from './VehicleMovementSystem.js'
import Rapier from '../../physics/rapier.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import { ComponentAddedEvent } from '@shared/component/events/ComponentAddedEvent.js'
import { VehicleComponent } from '@shared/component/VehicleComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { ComponentRemovedEvent } from '@shared/component/events/ComponentRemovedEvent.js'
import { VehicleOccupancyComponent } from '@shared/component/VehicleOccupancyComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { InvisibleComponent } from '@shared/component/InvisibleComponent.js'
import { VehicleRayCastComponent } from '../component/physics/VehicleRayCastComponent.js'
export class VehicleSystem {
  private vehicleCreationSystem = new VehicleCreationSystem()
  private vehicleMovementSystem = new VehicleMovementSystem()

  update(entities: Entity[], world: Rapier.World, dt: number): void {
    /**
     * Catch vehicle creation (VehicleComponent)
     */
    this.vehicleCreationSystem.update(entities, world)
    /**
     * Vehicle movement based on player input
     */
    this.vehicleMovementSystem.update(entities)
    /**
     * Catch player entering a vehicle (VehicleOccupancyComponent)
     */
    this.handlePlayerEnterVehicle(entities)
    /**
     * Catch player exiting a vehicle (VehicleOccupancyComponent)
     */
    this.handlePlayerExitVehicle(entities)
    /**
     * Update vehicle controller raycast
     * To optimize this : Only update the raycast if a player is inside the vehicle
     * But since wheels can be non physical, idle vehicles will have their chassis on the ground
     */
    for (const entity of entities) {
      const vehicleRayCastComponent = entity.getComponent(VehicleRayCastComponent)
      if (vehicleRayCastComponent) {
        vehicleRayCastComponent.raycastController.updateVehicle(dt / 1000)
      }
    }
  }

  /**
   * Handle the proximity prompt interaction (Press E to enter/exit)
   */
  static handleProximityPrompt(vehicleEntity: Entity, playerEntity: Entity) {
    // Ensure a player is interacting with the car
    const playerComponent = playerEntity.getComponent(PlayerComponent)
    const playerVehicleOccupancyComponent = playerEntity.getComponent(VehicleOccupancyComponent)
    const vehicleComponent = vehicleEntity.getComponent(VehicleComponent)

    if (!playerComponent || !vehicleComponent) return

    // Is the current player already occupying a vehicle?
    const playerInsideVehicle = playerVehicleOccupancyComponent !== undefined

    if (playerInsideVehicle) {
      // Check if player is inside the car they're interacting with
      const insideVehicle =
        vehicleComponent.driverEntityId === playerEntity.id ||
        vehicleComponent.passengerEntityIds.includes(playerEntity.id)

      // If so, they're exiting the car
      if (insideVehicle) {
        // Remove the vehicle occupancy component from the player
        // This also removes the VehicleOccupancyComponent from the NetworkDataComponent
        // This will throw a OnComponentRemoved<VehicleOccupancyComponent> event
        // Catch both by the front & back.
        // The back will clean up the vehicle component
        // The front will stop visually following the vehicle client-side (No more FollowComponent)
        playerEntity.removeComponent(VehicleOccupancyComponent)
      }
    } else {
      // Player is not in a vehicle, so they're entering this one
      // Create the vehicle occupancy component regardless of whether they'll be driver or passenger
      const vehicleOccupancyComponent = new VehicleOccupancyComponent(
        playerEntity.id,
        vehicleEntity.id
      )
      playerEntity.addNetworkComponent(vehicleOccupancyComponent)
      // Note: The driver/passenger assignment happens in handlePlayerEnterVehicle
    }
  }

  // When a player disconnects, it will throw a ComponentRemovedEvent<VehicleOccupancyComponent> event
  // Update the related VehicleComponent to reflect this change
  // This is also catched by the destruction system on player disconnection
  private handlePlayerExitVehicle(entities: Entity[]) {
    const exitedEvents = EventSystem.getEventsWrapped(
      ComponentRemovedEvent,
      VehicleOccupancyComponent
    )
    for (const exitEvent of exitedEvents) {
      const component: VehicleOccupancyComponent = exitEvent.component
      const exitingPlayerEntityId = component.entityId
      const vehicleEntity = EntityManager.getEntityById(entities, component.vehicleEntityId)

      if (vehicleEntity) {
        const vehicleComponent = vehicleEntity.getComponent(VehicleComponent)
        if (vehicleComponent) {
          // If the exiting entity is the driver, remove the driver
          if (vehicleComponent.driverEntityId === exitingPlayerEntityId) {
            console.log('Removing driver', exitingPlayerEntityId)
            vehicleComponent.driverEntityId = undefined
          }
          // If the exiting entity is a passenger, remove it from the passengers
          else {
            console.log('Removing passenger', exitingPlayerEntityId)
            vehicleComponent.passengerEntityIds = vehicleComponent.passengerEntityIds.filter(
              (id) => id !== exitingPlayerEntityId
            )
          }
          // Update the vehicle component to reflect the changes
          vehicleComponent.updated = true
          const exitingPlayerEntity = EntityManager.getEntityById(entities, exitingPlayerEntityId)

          if (exitingPlayerEntity) {
            // Handle rigid body
            const playerRigidBody =
              exitingPlayerEntity.getComponent(DynamicRigidBodyComponent)?.body
            if (playerRigidBody) {
              // Re-enable physics for player
              playerRigidBody.setEnabled(true)

              // Position player next to vehicle
              const vehiclePosition = vehicleEntity.getComponent(PositionComponent)
              if (vehiclePosition) {
                const exitPosition = new Rapier.Vector3(
                  vehiclePosition.x + 10, // Offset to side of vehicle
                  vehiclePosition.y + 5, // Slight height offset
                  vehiclePosition.z
                )
                playerRigidBody.setTranslation(exitPosition, true)
              }
            }

            // Make player visible again
            exitingPlayerEntity.removeComponent(InvisibleComponent)
          }

          // Update the text component to reflect the changes
          const textComponent = vehicleEntity.getComponent(TextComponent)
          if (textComponent) {
            this.updateText(textComponent, vehicleComponent)
          }
        }
      }
    }
  }

  // When a player gets a VehicleOccupancyComponent, it means he just entered a vehicle
  // Update the related VehicleComponent to reflect this change
  private handlePlayerEnterVehicle(entities: Entity[]) {
    const addEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, VehicleOccupancyComponent)
    for (const addEvent of addEvents) {
      const component: VehicleOccupancyComponent = addEvent.component
      const playerEntity = EntityManager.getEntityById(entities, component.entityId)
      const vehicleEntity = EntityManager.getEntityById(entities, component.vehicleEntityId)

      if (playerEntity && vehicleEntity) {
        const vehicleComponent = vehicleEntity.getComponent(VehicleComponent)
        if (vehicleComponent) {
          if (vehicleComponent.driverEntityId === undefined) {
            // If there's no driver, the player becomes the driver
            vehicleComponent.driverEntityId = playerEntity.id
            console.log('Player became the driver', playerEntity.id)
            console.log(vehicleComponent)
          } else {
            // If there's already a driver, the player becomes a passenger
            vehicleComponent.passengerEntityIds.push(playerEntity.id)
            console.log('Player became a passenger', playerEntity.id)
          }
          // Disable player rigid body
          const playerRigidBody = playerEntity.getComponent(DynamicRigidBodyComponent)?.body
          if (playerRigidBody) {
            playerRigidBody.setEnabled(false)
          }
          // Make the player invisible
          const invisibleComponent = new InvisibleComponent(playerEntity.id)
          playerEntity.addNetworkComponent(invisibleComponent)

          // Update the vehicle component to reflect the changes
          vehicleComponent.updated = true

          // Update the text component to reflect the changes
          const textComponent = vehicleEntity.getComponent(TextComponent)
          if (textComponent) {
            this.updateText(textComponent, vehicleComponent)
          }
        }
      }
    }
  }
  private updateText(textComponent: TextComponent, vehicleComponent: VehicleComponent) {
    const hasDriver = !!vehicleComponent.driverEntityId
    const passengerCount = vehicleComponent.passengerEntityIds.length

    textComponent.text = [
      hasDriver ? '' : '🚗 Car',
      passengerCount > 0 ? `👥 ${passengerCount} passenger${passengerCount > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    textComponent.updated = true
  }
}
