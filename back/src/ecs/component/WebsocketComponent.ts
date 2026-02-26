import { Component } from '@shared/component/Component.js'
import type { WebSocket } from 'uWebSockets.js'

export class WebSocketComponent extends Component {
  /**
   * Constructor for the WebSocketComponent class.
   * @param entityId - The ID of the entity this component is attached to.
   * @param ws - The WebSocket connection associated with the entity.
   * @param isFirstSnapshotSent - A flag indicating whether the first snapshot has been sent over the WebSocket connection.
   *                              On the first snapshot, all NetworkComponents are sent, regardless of their `updated` flag.
   */
  constructor(
    entityId: number,
    public ws: WebSocket<unknown>,
    public isFirstSnapshotSent = false
  ) {
    super(entityId)
  }
}
