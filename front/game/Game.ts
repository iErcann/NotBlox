import { EntityManager } from '@shared/system/EntityManager'
import { config } from '@shared/network/config'
import { InputManager } from './InputManager'
import { WebSocketManager } from './WebsocketManager'
import {
  AnimationSystem,
  ChatSystem,
  DestroySystem,
  SleepCheckSystem,
  SyncColorSystem,
  SyncComponentsSystem,
  SyncPositionSystem,
  SyncRotationSystem,
  SyncSizeSystem,
  MeshSystem,
  ServerMeshSystem,
  IdentifyFollowedMeshSystem,
  TextComponentSystem,
  InvisibilitySystem,
  VehicleSystem,
} from './ecs/system'
import { Hud } from './Hud'
import { Renderer } from './Renderer'
import { EventSystem } from '@shared/system/EventSystem'
import { MutableRefObject } from 'react'
import { ClientMessageType, SetPlayerNameMessage } from '@shared/network/client'

export class Game {
  private static instance: Game
  entityManager = EntityManager
  currentPlayerEntityId: number | undefined
  private lastRenderTime = Date.now()
  private loopFunction: () => void = this.loop.bind(this)
  syncComponentSystem: SyncComponentsSystem
  private syncPositionSystem: SyncPositionSystem
  private syncRotationSystem: SyncRotationSystem
  private syncColorSystem: SyncColorSystem
  private syncSizeSystem: SyncSizeSystem
  private eventSystem: EventSystem
  websocketManager: WebSocketManager
  private animationSystem: AnimationSystem
  private sleepCheckSystem: SleepCheckSystem
  private destroySystem: DestroySystem
  private chatSystem: ChatSystem
  inputManager: InputManager
  private meshSystem: MeshSystem
  private serverMeshSystem: ServerMeshSystem
  private textComponentSystem: TextComponentSystem
  private vehicleSystem: VehicleSystem
  private invisibilitySystem: InvisibilitySystem
  renderer: Renderer
  hud: Hud
  private identifyFollowedMeshSystem: IdentifyFollowedMeshSystem
  private constructor(gameContainerRef: MutableRefObject<any>, slug?: string) {
    this.syncComponentSystem = new SyncComponentsSystem(this)
    this.syncPositionSystem = new SyncPositionSystem()
    this.syncRotationSystem = new SyncRotationSystem()
    this.syncColorSystem = new SyncColorSystem()
    this.syncSizeSystem = new SyncSizeSystem()
    this.websocketManager = new WebSocketManager(this, slug)
    this.animationSystem = new AnimationSystem()
    this.sleepCheckSystem = new SleepCheckSystem()
    this.chatSystem = new ChatSystem()
    this.destroySystem = new DestroySystem()
    this.meshSystem = new MeshSystem()
    this.serverMeshSystem = new ServerMeshSystem()
    this.identifyFollowedMeshSystem = new IdentifyFollowedMeshSystem()
    this.eventSystem = EventSystem.getInstance()
    this.textComponentSystem = new TextComponentSystem()
    this.vehicleSystem = new VehicleSystem()
    this.invisibilitySystem = new InvisibilitySystem()

    this.renderer = new Renderer(gameContainerRef)
    this.inputManager = new InputManager(this.websocketManager, this.renderer.camera.controlSystem)
    this.hud = new Hud()
  }

  static getInstance(slug?: string, gameContainerRef?: MutableRefObject<any>): Game {
    if (!Game.instance) {
      if (!gameContainerRef) {
        throw new Error('Game instance not initialized with gameContainerRef')
      }
      Game.instance = new Game(gameContainerRef, slug)
    }
    return Game.instance
  }

  async start() {
    // Wait for the WebSocket connection to be established
    await this.websocketManager.connect()
    this.renderer.appendChild()
    this.renderer.setAnimationLoop(this.loopFunction)
  }

  /**
   * Sets the player's name and sends it to the server
   * @param name The player name to set
   */
  setPlayerName(name: string) {
    if (!name || !name.trim()) return
    
    // Send the player name to the server using the correct message format
    const message: SetPlayerNameMessage = {
      t: ClientMessageType.SET_PLAYER_NAME,
      name: name.trim()
    }
    this.websocketManager.send(message)
  }

  private loadingPromise: Promise<void> | null = null

  private async loop() {
    const entities = EntityManager.getInstance().getAllEntities()
    const now = Date.now()
    const deltaTime = now - this.lastRenderTime
    this.syncComponentSystem.update(entities)

    // Server can send us ServerMeshComponents to load.
    // This await is necessary to wait for the loading to finish before updating the entities
    // This will also delay all the other event operations until the loading is finished
    if (!this.loadingPromise) {
      this.loadingPromise = this.serverMeshSystem.update(entities)
    }

    // Wait for the loading operation to finish
    await this.loadingPromise
    this.loadingPromise = null

    this.identifyFollowedMeshSystem.update(entities, this)
    this.inputManager.update(entities, now - this.lastRenderTime)
    this.inputManager.sendInput(entities)
    this.destroySystem.update(entities, this.renderer)
    this.meshSystem.update(entities, this.renderer)
    this.vehicleSystem.update(entities)
    this.invisibilitySystem.update(entities)
    const positionInterpFactor = deltaTime / (1000 / config.SERVER_TICKRATE)
    this.syncPositionSystem.update(entities, positionInterpFactor / 2)
    this.syncRotationSystem.update(entities, 0.7)
    this.syncColorSystem.update(entities)
    this.chatSystem.update(entities, this.hud)
    this.textComponentSystem.update(entities, deltaTime)
    this.syncSizeSystem.update(entities)
    this.animationSystem.update(deltaTime, entities)
    this.destroySystem.afterUpdate(entities)
    this.eventSystem.afterUpdate(entities)
    this.renderer.update(deltaTime, entities, this.inputManager.inputState)
    this.sleepCheckSystem.update(entities)
    this.websocketManager.timeSinceLastServerUpdate += deltaTime
    this.lastRenderTime = now
  }
}
