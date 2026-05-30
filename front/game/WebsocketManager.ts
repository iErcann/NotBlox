import { unpack, pack } from 'msgpackr'
import { ServerMessage, ServerMessageType } from '@shared/network/server/base'
import { SnapshotMessage } from '@shared/network/server/serialized'
import { Game } from './Game'
import { ConnectionMessage } from '@shared/network/server/connection'
import { ClientMessage } from '@shared/network/client/base'
import { isNativeAccelerationEnabled } from 'msgpackr'
import pako from 'pako'
import { config } from '@shared/network/config'

if (!isNativeAccelerationEnabled)
  console.warn('Native acceleration not enabled, verify that install finished properly')

type MessageHandler = (message: ServerMessage) => void

export class WebSocketManager {
  private websocket: WebSocket | null = null
  private messageHandlers: Map<ServerMessageType, MessageHandler> = new Map()
  private serverUrl: string

  timeSinceLastServerUpdate: number = 0
  constructor(game: Game, path: string = 'test') {
    // Prod: NEXT_PUBLIC_SERVER_URL=wss://back.notblox.online -> wss://back.notblox.online/<slug>
    // Dev:  NEXT_PUBLIC_SERVER_URL=ws://localhost:8001         -> ws://localhost:8001/<slug>
    // uWS app.ws('/*') accepts any path, so dev keeps working against a single backend.
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'ws://localhost:8001'
    this.serverUrl = `${baseUrl.replace(/\/$/, '')}/${path}`

    this.addMessageHandler(ServerMessageType.FIRST_CONNECTION, (message) => {
      const connectionMessage = message as ConnectionMessage
      game.currentPlayerEntityId = connectionMessage.id
      config.SERVER_TICKRATE = connectionMessage.tickRate
      console.log(
        `Connected to server with player ID: ${game.currentPlayerEntityId}, server tick rate: ${connectionMessage.tickRate}`
      )
    })

    this.addMessageHandler(ServerMessageType.SNAPSHOT, (message) => {
      this.timeSinceLastServerUpdate = 0
      game.syncComponentSystem.addSnapshotMessage(message as SnapshotMessage)
    })
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnected()) {
        this.websocket = new WebSocket(this.serverUrl)
        this.websocket.addEventListener('open', (event) => {
          console.log('WebSocket connection opened:', event)
          resolve() // Resolve the promise when the connection is open.
        })
        this.websocket.addEventListener('message', this.onMessage.bind(this))
        this.websocket.addEventListener('error', (errorEvent) => {
          console.error('WebSocket error:', errorEvent)
          reject(errorEvent) // Reject the promise on error.
        })
        this.websocket.addEventListener('close', (closeEvent) => {
          if (closeEvent.wasClean) {
            console.log(
              `WebSocket connection closed cleanly, code=${closeEvent.code}, reason=${closeEvent.reason}`
            )
          } else {
            console.error('WebSocket connection abruptly closed')
          }
        })
      } else {
        resolve() // WebSocket already exists, resolve without a value.
      }
    })
  }
  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
  }

  addMessageHandler(type: ServerMessageType, handler: MessageHandler) {
    this.messageHandlers.set(type, handler)
  }

  removeMessageHandler(type: ServerMessageType) {
    this.messageHandlers.delete(type)
  }

  private onOpen(event: Event) {
    console.log('WebSocket connection opened:', event)
  }

  send(message: ClientMessage) {
    if (!this.isConnected()) {
      console.error("Websocket not connected, can't send message", message)
      return
    }

    if (!this.websocket) {
      console.error("Websocket not initialized, can't send message", message)
      return
    }

    try {
      // Compress with msgpackr
      const packed = pack(message)
      this.websocket.send(packed)
    } catch (error) {
      console.error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message
      )
    }
  }
  private isConnected(): boolean {
    return this.websocket != null && this.websocket.readyState === WebSocket.OPEN
  }

  private async onMessage(event: MessageEvent) {
    const buffer = await event.data.arrayBuffer()
    // Decompress the zlib first
    const decompressed = pako.inflate(buffer)
    // Then decompress the msgpackr
    const message: ServerMessage = unpack(decompressed)

    const handler = this.messageHandlers.get(message.t)
    if (handler) {
      handler(message)
    }
  }
}
