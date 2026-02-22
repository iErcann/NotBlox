import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'
import { NetworkComponent } from '../network/NetworkComponent.js'

/**
 * Reusable team component – assign any entity to a team.
 * Works for players in football, battle-royale squads, co-op, etc.
 */
export class TeamComponent extends NetworkComponent {
  constructor(
    entityId: number,
    public teamId: number = 0,
    public teamName: string = '',
    public teamColor: string = '#FFFFFF'
  ) {
    super(entityId, SerializedComponentType.TEAM)
  }

  serialize(): SerializedTeamComponent {
    return {
      teamId: this.teamId,
      teamName: this.teamName,
      teamColor: this.teamColor,
    }
  }

  deserialize(data: SerializedTeamComponent): void {
    this.teamId = data.teamId ?? 0
    this.teamName = data.teamName ?? ''
    this.teamColor = data.teamColor ?? '#FFFFFF'
  }
}

export interface SerializedTeamComponent extends SerializedComponent {
  teamId: number
  teamName: string
  teamColor: string
}
