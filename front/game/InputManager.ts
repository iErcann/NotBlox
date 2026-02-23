import { ClientMessageType } from '@shared/network/client/base'
import { InputMessage } from '@shared/network/client/inputMessage'
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick'
import { OrbitCameraFollowSystem } from './ecs/system'
import { WebSocketManager } from './WebsocketManager'
import { ProximityPromptSystem } from './ecs/system/ProximityPromptSystem'
import { Entity } from '@shared/entity/Entity'

export class InputManager {
  pcUser: boolean = true
  inputState: InputMessage = {
    t: ClientMessageType.INPUT,
    // UP
    u: false,
    // DOWN
    d: false,
    // LEFT
    l: false,
    // RIGHT
    r: false,
    // SPACE
    s: false,
    // YAW (looking direction)
    y: 0,
    // INTERACTION
    i: false,
  }
  proximityPromptSystem = new ProximityPromptSystem()

  private cameraFollowSystem: OrbitCameraFollowSystem

  constructor(
    private webSocketManager: WebSocketManager,
    cameraFollowSystem: OrbitCameraFollowSystem
  ) {
    this.cameraFollowSystem = cameraFollowSystem

    // Add event listeners to handle user input
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
  }

  private isGameFocused(event: KeyboardEvent) {
    return event.target === document.body
  }

  public handleJoystickMove(joystick: IJoystickUpdateEvent) {
    if (this.pcUser) this.pcUser = false
    // Calculate angle from current looking direction vs joystick direction
    const joystickAngleRad = Math.atan2(joystick.x!, joystick.y!)

    // Adjust the joystick angle by the camera's azimuth angle
    const adjustedJoystickAngleRad = joystickAngleRad + this.cameraFollowSystem.y

    // Calculate the difference between the current looking direction and the joystick direction
    this.inputState.y = adjustedJoystickAngleRad
    this.inputState.u = true
  }

  update(entities: Entity[], dt: number) {
    if (this.pcUser) this.inputState.y = this.cameraFollowSystem.y
    this.proximityPromptSystem.update(entities, dt)
  }

  public handleJoystickStop(joystick: IJoystickUpdateEvent) {
    // Stop moving forward
    this.inputState.u = false
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.pcUser) this.pcUser = true
    if (!this.isGameFocused(event)) return
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.u = true
        break
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.d = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.l = true
        break
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.r = true
        break
      case 'Space':
        this.inputState.s = true
        break
      case 'KeyE':
        this.inputState.i = true
        break
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.u = false
        break
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.d = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.l = false
        break
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.r = false
        break
      case 'Space':
        this.inputState.s = false
        break
      case 'KeyE':
        this.inputState.i = false
        break
    }
  }

  private previousInputState: InputMessage | null = null

  // TODO: To lower the bandiwdth even more, send at a maxrate of config.SERVER_TICKRATE
  // Only sending when the input state changes
  sendInput(entities: Entity[]) {
    // Check if the current input state is different from the previous one
    if (
      !this.previousInputState ||
      !this.areInputStatesEqual(this.inputState, this.previousInputState)
    ) {
      // Send the updated input state to the WebSocketManager
      this.webSocketManager.send(this.inputState)

      // Update the previous input state
      this.previousInputState = { ...this.inputState }

      if (this.inputState.i) {
        const message = this.proximityPromptSystem.getMessage(entities)
        if (message) this.webSocketManager.send(message)
      }
    }
  }

  private areInputStatesEqual(state1: InputMessage, state2: InputMessage): boolean {
    return (
      state1.u === state2.u &&
      state1.d === state2.d &&
      state1.l === state2.l &&
      state1.r === state2.r &&
      state1.s === state2.s &&
      state1.y === state2.y
    )
  }
}
