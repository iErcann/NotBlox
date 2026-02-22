import { SerializedMessageType } from '@shared/network/server/serialized.js'
import { Component } from '@shared/component/Component.js'

/**
 * This event is triggered when a message is sent
 *
 * Messages can be :
 * - Global chat messages
 * - Targeted chat messages (to specific players)
 * - Global notifications
 * - Targeted notifications (to specific players)
 */
export class MessageEvent extends Component {
  constructor(
    entityId: number,
    public sender: string,
    public content: string,
    public messageType: SerializedMessageType = SerializedMessageType.GLOBAL_CHAT,
    public targetPlayerIds: number[] = [] // Only used for targeted messages
  ) {
    super(entityId)
  }
}
