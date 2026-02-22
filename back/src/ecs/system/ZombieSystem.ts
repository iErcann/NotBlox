import { Entity } from '@shared/entity/Entity.js'
import { ZombieComponent } from '../component/ZombieComponent.js'
import { ColorComponent } from '@shared/component/ColorComponent.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import * as THREE from 'three'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import Rapier from '../../physics/rapier.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { ColorEvent } from '../component/events/ColorEvent.js'

export class ZombieSystem {
  private followDistance = 20
  private wanderRadius = 10
  private wanderTime = 0
  private wanderInterval = 2

  update(dt: number, entities: Entity[]): void {
    const players = []
    for (const entity of entities) {
      if (entity.getComponent(PlayerComponent)) {
        players.push(entity)
      }
    }

    for (const entity of entities) {
      if (entity.getComponent(ZombieComponent)) {
        this.processZombieEntity(entity, players, dt)
      }
    }
  }

  private processZombieEntity(entity: Entity, players: Entity[], dt: number): void {
    const rigidBodyComponent = entity.getComponent(DynamicRigidBodyComponent)
    const positionComponent = entity.getComponent(PositionComponent)
    const colorComponent = entity.getComponent(ColorComponent)

    if (!rigidBodyComponent || !positionComponent || !colorComponent) {
      return // Skip processing this entity if any required component is missing
    }

    const nearbyPlayers = this.findNearbyPlayers(players, positionComponent)
    if (nearbyPlayers.length === 0) {
      this.wander(entity, rigidBodyComponent, dt)
      this.handleDistantProximity(entity, colorComponent)
      return
    }

    for (const player of nearbyPlayers) {
      const direction = this.calculateDirection(player, positionComponent)
      this.handleCloseProximity(entity, direction, rigidBodyComponent, colorComponent, dt)
    }
  }

  private findNearbyPlayers(players: Entity[], positionComponent: PositionComponent): Entity[] {
    const nearbyPlayers: Entity[] = []

    for (const player of players) {
      const playerPosition = player.getComponent(PositionComponent)
      if (!playerPosition) continue

      const dx = playerPosition.x - positionComponent.x
      const dy = playerPosition.y - positionComponent.y
      const dz = playerPosition.z - positionComponent.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (distance < this.followDistance) {
        nearbyPlayers.push(player)
      }
    }

    return nearbyPlayers
  }

  private calculateDirection(target: Entity, sourcePosition: PositionComponent): THREE.Vector3 {
    const targetPosition = target.getComponent(PositionComponent)
    if (!targetPosition) return new THREE.Vector3(0, 0, 0)

    const direction = new THREE.Vector3(
      targetPosition.x - sourcePosition.x,
      targetPosition.y - sourcePosition.y,
      targetPosition.z - sourcePosition.z
    )
    direction.normalize()

    return direction
  }

  private handleCloseProximity(
    entity: Entity,
    direction: THREE.Vector3,
    rigidBodyComponent: DynamicRigidBodyComponent,
    colorComponent: ColorComponent,
    dt: number
  ): void {
    if (!rigidBodyComponent.body) {
      return
    }
    direction.multiplyScalar(0.3 * dt)
    const impulse = new Rapier.Vector3(direction.x, rigidBodyComponent.body.linvel().y, direction.z)
    rigidBodyComponent.body.setLinvel(impulse, true)

    // Dirty state
    if (colorComponent.color !== '#ff0000') {
      this.setZombieToRed(entity)
    }
  }

  private handleDistantProximity(entity: Entity, colorComponent: ColorComponent): void {
    // Dirty state
    if (colorComponent.color !== '#00ff00') {
      this.setZombieToGreen(entity)
    }
  }

  private setZombieToRed(entity: Entity): void {
    EventSystem.addEvent(new ColorEvent(entity.id, '#ff0000'))
  }

  private setZombieToGreen(entity: Entity): void {
    EventSystem.addEvent(new ColorEvent(entity.id, '#00ff00'))
  }

  private wander(entity: Entity, rigidBodyComponent: DynamicRigidBodyComponent, dt: number): void {
    if (!rigidBodyComponent.body) {
      return
    }

    this.wanderTime += dt
    if (this.wanderTime > this.wanderInterval) {
      this.wanderTime = 0

      const angle = Math.random() * Math.PI * 2
      const wanderDirection = new THREE.Vector3(
        Math.cos(angle) * this.wanderRadius,
        0,
        Math.sin(angle) * this.wanderRadius
      )
      wanderDirection.normalize()

      wanderDirection.multiplyScalar(1.1 * dt)
      const impulse = new Rapier.Vector3(wanderDirection.x, wanderDirection.y, wanderDirection.z)
      rigidBodyComponent.body.applyImpulse(impulse, true)
    }
  }
}
