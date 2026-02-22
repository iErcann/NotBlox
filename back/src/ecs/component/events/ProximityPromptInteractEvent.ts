import { Component } from '@shared/component/Component.js'

export class ProximityPromptInteractEvent extends Component {
  constructor(
    entityId: number,
    public otherEntity: number
  ) {
    super(entityId)
  }
}
