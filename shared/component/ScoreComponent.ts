import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'
import { NetworkComponent } from '../network/NetworkComponent.js'

/**
 * Reusable score component – attach to any entity that accumulates points.
 * Works for players in any game mode (football, parkour, pet sim, etc.).
 */
export class ScoreComponent extends NetworkComponent {
  constructor(entityId: number, public score: number = 0) {
    super(entityId, SerializedComponentType.SCORE)
  }

  /** Add points to the score. */
  addScore(amount: number): void {
    this.score += amount
    this.updated = true
  }

  /** Reset the score to zero. */
  reset(): void {
    this.score = 0
    this.updated = true
  }

  serialize(): SerializedScoreComponent {
    return { score: this.score }
  }

  deserialize(data: SerializedScoreComponent): void {
    this.score = data.score ?? 0
  }
}

export interface SerializedScoreComponent extends SerializedComponent {
  score: number
}
