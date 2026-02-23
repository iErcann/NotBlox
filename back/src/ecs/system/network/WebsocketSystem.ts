import {
  App,
  DEDICATED_COMPRESSOR_3KB,
  HttpRequest,
  HttpResponse,
  SSLApp,
  us_listen_socket,
  us_socket_context_t,
} from 'uWebSockets.js'
import { unpack } from 'msgpackr'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { config } from '@shared/network/config.js'

import { EntityDestroyedEvent } from '@shared/component/events/EntityDestroyedEvent.js'
import {
  ChatMessage,
  InputMessage,
  ProximityPromptInteractMessage,
  SetPlayerNameMessage,
  ClientMessageType,
  ClientMessage,
} from '@shared/network/client/index.js'
import {
  ConnectionMessage,
  SerializedMessageType,
  ServerMessageType,
} from '@shared/network/server/index.js'
import { EventSystem } from '@shared/system/EventSystem.js'

import { MessageEvent } from '../../component/events/MessageEvent.js'
import { Player } from '../../entity/Player.js'
import { InputProcessingSystem } from '../InputProcessingSystem.js'
import { NetworkSystem } from './NetworkSystem.js'
import { ProximityPromptInteractEvent } from '../../component/events/ProximityPromptInteractEvent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { MessageListComponent } from '@shared/component/MessageComponent.js'
import { ChatComponent } from '../../component/tag/TagChatComponent.js'
import { WebSocketComponent } from '../../component/WebsocketComponent.js'
type MessageHandler = (ws: any, message: any) => void

export class WebsocketSystem {
  private port: number = 8001
  private players: Player[] = []
  private messageHandlers: Map<ClientMessageType, MessageHandler> = new Map()
  private inputProcessingSystem: InputProcessingSystem = new InputProcessingSystem()
  private limiter = new RateLimiterMemory({
    points: 10, // Max 10 points per second
    duration: 1, // Each point expires after 1 second
  })

  constructor() {
    this.initializeServer()
    this.initializeMessageHandlers()
  }
  private async isRateLimited(ip: string): Promise<boolean> {
    try {
      await this.limiter.consume(ip) // Use a unique identifier for each WebSocket connection
      return false // Not rate limited
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_rejRes) {
      return true // Rate limited
    }
  }

  private initializeServer() {
    const isProduction = process.env.NODE_ENV === 'production'
    const acceptedOrigin: string | undefined = process.env.FRONTEND_URL
    const sslKeyFile: string = process.env.SSL_KEY_FILE || '/etc/letsencrypt/live/npm-3/privkey.pem'
    const sslCertFile: string = process.env.SSL_CERT_FILE || '/etc/letsencrypt/live/npm-3/cert.pem'

    if (isProduction) {
      console.log('NODE_ENV : Running in production mode')
    } else {
      console.log('NODE_ENV : Running in development mode')
    }

    if (acceptedOrigin) {
      console.log('FRONTEND_URL : Only accepting connections from origin:', acceptedOrigin)
    }

    const app = isProduction
      ? SSLApp({
          key_file_name: sslKeyFile,
          cert_file_name: sslCertFile,
        })
      : App()

    // Add health check endpoint
    app.get('/health', (res) => {
      // Get connected players count
      const connectedPlayers = this.players.map(
        (player) => player.entity.getComponent(PlayerComponent)?.name
      )

      // Get message list from MessageListComponent if available
      const chatEntity = EntityManager.getFirstEntityWithComponent(
        EntityManager.getInstance().getAllEntities(),
        ChatComponent
      )
      const messageListComponent = chatEntity?.getComponent(MessageListComponent)
      const messages = messageListComponent?.list

      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        game: {
          script: process.env.GAME_SCRIPT || 'Unknown',
          tickrate: config.SERVER_TICKRATE,
        },
        players: connectedPlayers,
        messages: {
          globalChat: messages?.filter(
            ({ messageType }) => messageType === SerializedMessageType.GLOBAL_CHAT
          ),
          targetedChat: messages?.filter(
            ({ messageType }) => messageType === SerializedMessageType.TARGETED_CHAT
          ),
          globalNotification: messages?.filter(
            ({ messageType }) => messageType === SerializedMessageType.GLOBAL_NOTIFICATION
          ),
          targetedNotification: messages?.filter(
            ({ messageType }) => messageType === SerializedMessageType.TARGETED_NOTIFICATION
          ),
        },
      }

      // Send response
      res.writeHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(healthData))
    })

    app.ws('/*', {
      idleTimeout: 32,
      maxBackpressure: 1024,
      maxPayloadLength: 512,
      compression: DEDICATED_COMPRESSOR_3KB,
      message: this.onMessage.bind(this),
      open: this.onConnect.bind(this),
      drain: this.onDrain.bind(this),
      close: this.onClose.bind(this),
      upgrade: this.upgradeHandler.bind(this, isProduction, acceptedOrigin),
    })

    app.listen(this.port, this.listenHandler.bind(this))
  }
  private upgradeHandler(
    isProduction: boolean,
    acceptedOrigin: string | undefined,
    res: HttpResponse,
    req: HttpRequest,
    context: us_socket_context_t
  ) {
    // Only accept connections from the frontend
    const origin = req.getHeader('origin')
    if (isProduction && acceptedOrigin && origin !== acceptedOrigin) {
      res.writeStatus('403 Forbidden').end()
      return
    }

    res.upgrade(
      {}, // WebSocket handler will go here
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    )
  }

  private listenHandler(listenSocket: us_listen_socket) {
    if (listenSocket) {
      console.log(`WebSocket server listening on port ${this.port}`)
    } else {
      console.error(`Failed to listen on port ${this.port}`)
    }
  }

  private initializeMessageHandlers() {
    this.addMessageHandler(ClientMessageType.INPUT, this.handleInputMessage.bind(this))
    this.addMessageHandler(ClientMessageType.CHAT_MESSAGE, this.handleChatMessage.bind(this))
    this.addMessageHandler(
      ClientMessageType.PROXIMITY_PROMPT_INTERACT,
      this.handleProximityPromptInteractMessage.bind(this)
    )
    this.addMessageHandler(
      ClientMessageType.SET_PLAYER_NAME,
      this.handleSetPlayerNameMessage.bind(this)
    )
  }

  private addMessageHandler(type: ClientMessageType, handler: MessageHandler) {
    this.messageHandlers.set(type, handler)
  }

  private removeMessageHandler(type: ClientMessageType) {
    this.messageHandlers.delete(type)
  }

  private onMessage(ws: any, message: any) {
    const clientMessage: ClientMessage = unpack(message)
    const handler = this.messageHandlers.get(clientMessage.t)
    if (handler) {
      handler(ws, clientMessage)
    }
  }

  // TODO: Create EventOnPlayerConnect and EventOnPlayerDisconnect to respects ECS
  // Might be useful to query the chat and send a message to all players when a player connects or disconnects
  // Also could append scriptable events to be triggered on connect/disconnect depending on the game
  private async onConnect(ws: any) {
    const ipBuffer = ws.getRemoteAddressAsText() as ArrayBuffer
    const ip = Buffer.from(ipBuffer).toString()
    if (await this.isRateLimited(ip)) {
      // Respond to the client indicating that the connection is rate limited
      return ws.close(429, 'Rate limit exceeded')
    }
    const player = new Player(ws, Math.random() * 5, 5, Math.random() * 5)
    const connectionMessage: ConnectionMessage = {
      t: ServerMessageType.FIRST_CONNECTION,
      id: player.entity.id,
      tickRate: config.SERVER_TICKRATE,
    }
    // player.entity.addComponent(new RandomizeComponent(player.entity.id))
    ws.player = player
    ws.send(NetworkSystem.compress(connectionMessage), true)

    EventSystem.addEvent(
      new MessageEvent(
        player.entity.id,
        '🖥️ [SERVER]',
        `New player joined at ${new Date().toLocaleString()}`
      )
    )
    this.players.push(player)
  }

  private onDrain(ws: any) {
    console.log('WebSocket backpressure: ' + ws.getBufferedAmount())
  }

  private onClose(ws: any) {
    const disconnectedPlayer: Player = ws.player
    if (!disconnectedPlayer) {
      console.error('Disconnect: Player not found?', ws)
      return
    }

    console.log('Disconnect: Player found!')
    const entity = disconnectedPlayer.entity
    const entityId = entity.id

    EventSystem.addNetworkEvent(new EntityDestroyedEvent(entityId))

    // Remove player from players array
    this.players = this.players.filter((player) => player !== disconnectedPlayer)

    // Remove the WebsocketComponent directly to avoid sending messages to the client
    entity.removeComponent(WebSocketComponent)
  }

  private async handleInputMessage(ws: any, message: InputMessage) {
    const player: Player = ws.player
    if (!player) {
      console.error(`Player with WS ${ws} not found.`)
      return
    }
    const { u: up, d: down, l: left, r: right, s: space, y: angleY, i: interact } = message
    if (
      typeof up !== 'boolean' ||
      typeof down !== 'boolean' ||
      typeof left !== 'boolean' ||
      typeof right !== 'boolean' ||
      typeof space !== 'boolean' ||
      typeof angleY !== 'number' ||
      typeof interact !== 'boolean'
    ) {
      console.error('Invalid input message', message)
      return
    }

    this.inputProcessingSystem.receiveInputPacket(player.entity, message)
  }

  private handleChatMessage(ws: any, message: ChatMessage) {
    console.log('Chat message received', message)
    const player: Player = ws.player

    const { content } = message
    if (!content || typeof content !== 'string' || content.length === 0) {
      console.error(`Invalid chat message, sent from ${player}`, message)
      return
    }

    const playerName = player.entity.getComponent(PlayerComponent)?.name
    if (!playerName) {
      console.error(`Player name not found for player ${player.entity.id}`)
      return
    }

    EventSystem.addEvent(new MessageEvent(player.entity.id, playerName, content))
  }
  private handleProximityPromptInteractMessage(ws: any, message: ProximityPromptInteractMessage) {
    const player: Player = ws.player
    if (!player) {
      console.error(`Player with WS ${ws} not found.`)
      return
    }
    const { eId } = message
    EventSystem.addEvent(new ProximityPromptInteractEvent(player.entity.id, eId))
  }

  private handleSetPlayerNameMessage(ws: any, message: SetPlayerNameMessage) {
    const player: Player = ws.player
    if (!player) {
      console.error(`Player with WS ${ws} not found.`)
      return
    }

    const { name } = message
    if (!name || typeof name !== 'string') {
      console.error(`Invalid player name message, sent from ${player.entity.id}`, message)
      return
    }

    // Check if player already has a custom name (not the default "Player" name)
    const playerComponent = player.entity.getComponent(PlayerComponent)
    if (playerComponent && !playerComponent.name.startsWith('Player')) {
      console.log(`Player ${playerComponent.name} attempted to change name again. Not allowed.`)
      return
    }

    // Sanitize player name to prevent abuse
    let sanitizedName = name.trim().substring(0, 20)
    // Remove any HTML tags or potentially harmful characters
    sanitizedName = sanitizedName.replace(/<[^>]*>|[<>]/g, '')
    // Remove all spaces from the name
    sanitizedName = sanitizedName.replace(/\s+/g, '')
    // Default to "Player" if name is empty after sanitization
    if (!sanitizedName) sanitizedName = `Player ${player.entity.id}`

    // Check for duplicate names
    const isDuplicateName = this.players.some(
      (p) =>
        p.entity.id !== player.entity.id &&
        p.entity.getComponent(PlayerComponent)?.name === sanitizedName
    )
    if (isDuplicateName) {
      console.log(`Player ${player.entity.id} attempted to use duplicate name: ${sanitizedName}`)
      sanitizedName += `${player.entity.id}`
    }

    // The player component holds the name, but the TextComponent could be altered by game scripts
    // Like : [New Player] - iErcan (10)
    // To not lose the name of the player, store it in the PlayerComponent
    // TODO: Make it more abstract by using a NameComponent.
    // Find the PlayerComponent on the player entity and update it
    if (playerComponent) {
      playerComponent.name = sanitizedName
    } else {
      console.error(`PlayerComponent not found for player ${player.entity.id}`)
    }

    // Find the TextComponent on the player entity and update it
    // Visual update of the name, could be changed in the future because games will alter this
    // This resets the styling of the name
    const textComponent = player.entity.getComponent(TextComponent)
    if (textComponent) {
      textComponent.text = sanitizedName
      // Updated it gets broadcasted + re-rendered
      textComponent.updated = true
      console.log(`Player ${player.entity.id} set name to: ${sanitizedName}`)
    } else {
      console.error(`TextComponent not found for player ${player.entity.id}`)
    }
  }
}
