import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'
import { NetworkComponent } from '../network/NetworkComponent.js'

/**
 * Reusable health component – attach to any entity that can take damage.
 * Works for players, enemies, destructible objects, etc.
 */
export class HealthComponent extends NetworkComponent {
  constructor(
    entityId: number,
    public health: number = 100,
    public maxHealth: number = 100
  ) {
    super(entityId, SerializedComponentType.HEALTH)
  }

  /** Apply damage, clamped to 0. */
  damage(amount: number): void {
    this.health = Math.max(0, this.health - amount)
    this.updated = true
  }

  /** Restore health, clamped to maxHealth. */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updated = true
  }

  /** True when health has reached zero. */
  isDead(): boolean {
    return this.health <= 0
  }

  serialize(): SerializedHealthComponent {
    return {
      hp: this.health,
      maxHp: this.maxHealth,
    }
  }

  deserialize(data: SerializedHealthComponent): void {
    this.health = data.hp ?? 100
    this.maxHealth = data.maxHp ?? 100
  }
}

export interface SerializedHealthComponent extends SerializedComponent {
  hp: number
  maxHp: number
}
