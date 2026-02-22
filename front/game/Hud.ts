// Binding react states - game

import { Dispatch, SetStateAction } from 'react'
import { MessageComponent } from '@shared/component/MessageComponent'
import { InventoryState } from '@shared/component/InventoryComponent'
import { Game } from './Game'
import { ClientMessageType } from '@shared/network/client/base'
import { ChatMessage } from '@shared/network/client/chatMessage'
import { config } from '@shared/network/config'

// Props drill
export class Hud {
  updateChat: Dispatch<SetStateAction<MessageComponent[]>> | undefined
  updateInventory: Dispatch<SetStateAction<InventoryState>> | undefined

  passChatState(updateChat: Dispatch<SetStateAction<MessageComponent[]>>) {
    this.updateChat = updateChat
  }

  passInventoryState(updateInventory: Dispatch<SetStateAction<InventoryState>>) {
    this.updateInventory = updateInventory
  }

  sendMessageToServer(message: string) {
    if (message === '') return
    // Limit message length to 300 characters
    const trimmedMessage = message.slice(0, config.MAX_MESSAGE_CONTENT_LENGTH)
    const chatMessage: ChatMessage = {
      t: ClientMessageType.CHAT_MESSAGE,
      content: trimmedMessage,
    }
    Game.getInstance().websocketManager.send(chatMessage)
  }
}
