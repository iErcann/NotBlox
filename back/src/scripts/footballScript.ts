import Rapier from '../physics/rapier.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'
import { ProximityPromptComponent } from '@shared/component/ProximityPromptComponent.js'
import { SerializedMessageType } from '@shared/network/server/serialized.js'
import { ComponentAddedEvent } from '@shared/component/events/ComponentAddedEvent.js'
import { ColorEvent } from '../ecs/component/events/ColorEvent.js'
import { MessageEvent } from '../ecs/component/events/MessageEvent.js'
import { DynamicRigidBodyComponent } from '../ecs/component/physics/DynamicRigidBodyComponent.js'
import { InputComponent } from '../ecs/component/InputComponent.js'
import { ScriptableSystem } from '../ecs/system/ScriptableSystem.js'
import { ChatComponent } from '../ecs/component/tag/TagChatComponent.js'
import { FloatingText } from '../ecs/entity/FloatingText.js'
import { MapWorld } from '../ecs/entity/MapWorld.js'
import { Sphere } from '../ecs/entity/Sphere.js'
import { TriggerCube } from '../ecs/entity/TriggerCube.js'

// Initialize world and ball
new MapWorld('https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/world/Stadium.glb')

const ballSpawnPosition = { x: 0, y: -20, z: -350 }

const ball = new Sphere({
  radius: 1.4,
  position: {
    x: ballSpawnPosition.x,
    y: ballSpawnPosition.y,
    z: ballSpawnPosition.z,
  },
  meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Ball.glb',
  physicsProperties: {
    mass: 1.5,
    enableCcd: true,
    angularDamping: 0.3,
    linearDamping: 0.2,
  },
  colliderProperties: {
    friction: 0.2,
    restitution: 0.8,
  },
})

// Score display and management
const scoreText = new FloatingText('🔴 0 - 0 🔵', 0, 0, -450, 200)
let redScore = 0
let blueScore = 0

// Chat functionality
const chatEntity = EntityManager.getFirstEntityWithComponent(
  EntityManager.getInstance().getAllEntities(),
  ChatComponent
)!

function sendGlobalChatMessage(author: string, message: string) {
  EventSystem.addEvent(
    new MessageEvent(chatEntity.id, author, message, SerializedMessageType.GLOBAL_CHAT)
  )
}

function sendGlobalNotification(author: string, message: string) {
  EventSystem.addEvent(
    new MessageEvent(chatEntity.id, author, message, SerializedMessageType.GLOBAL_NOTIFICATION)
  )
}

function sendTargetedNotification(author: string, message: string, targetPlayerIds: number[]) {
  EventSystem.addEvent(
    new MessageEvent(
      chatEntity.id,
      author,
      message,
      SerializedMessageType.TARGETED_NOTIFICATION,
      targetPlayerIds
    )
  )
}

function sendTargetedChat(author: string, message: string, targetPlayerIds: number[]) {
  EventSystem.addEvent(
    new MessageEvent(
      chatEntity.id,
      author,
      message,
      SerializedMessageType.TARGETED_CHAT,
      targetPlayerIds
    )
  )
}

const updateScore = () => {
  sendGlobalChatMessage('⚽', `Score: 🔴 Red ${redScore} - ${blueScore} Blue 🔵`)
  scoreText.updateText(`🔴 ${redScore} - ${blueScore} 🔵`)
}

sendGlobalChatMessage('⚽', 'Football NotBlox.Online')
updateScore()

function createTeamTrigger(x: number, y: number, z: number, color: string, spawnX: number) {
  return new TriggerCube(
    x,
    y,
    z,
    12,
    2,
    12,
    (collidedWithEntity) => {
      // If the player collides with the trigger, we change his color and teleport him to the stadium
      if (collidedWithEntity.getComponent(PlayerComponent)) {
        // Change the player color
        EventSystem.addEvent(new ColorEvent(collidedWithEntity.id, color))
        // Teleport the player to the spawn point
        const playerBody = collidedWithEntity.getComponent(DynamicRigidBodyComponent)!.body!
        playerBody.setTranslation(new Rapier.Vector3(spawnX, 5, -350), true)
        // Reset player velocity
        playerBody.setLinvel(new Rapier.Vector3(0, 0, 0), true)

        // Determine team info
        const isRedTeam = color === '#f0513c'
        const teamColor = isRedTeam ? 'red' : 'blue'
        const teamEmoji = isRedTeam ? '🔴' : '🔵'
        const playerName = collidedWithEntity.getComponent(TextComponent)?.text ?? 'Player'

        // Broadcast join message
        sendGlobalNotification(
          `${teamEmoji} New Player`,
          `${playerName} joined the ${teamColor} team`
        )
      }
    },
    () => {},
    false // We don't want the trigger to be visible, put it to true if you want to debug its position
  )
}

createTeamTrigger(-24, -4, -29, '#f0513c', -80) // Red team
createTeamTrigger(24, -4, -29, '#3c9cf0', 80) // Blue team

function handleGoal(scoringTeam: 'red' | 'blue') {
  if (scoringTeam === 'blue') blueScore++
  else redScore++

  sendGlobalChatMessage('⚽', `${scoringTeam === 'blue' ? '🔵 Blue' : '🔴 Red'} team scores! 🎉`)
  sendGlobalNotification(
    '⚽ GOAL!',
    `${scoringTeam === 'blue' ? '🔵 Blue' : '🔴 Red'} team scores!`
  )
  updateScore()

  const body = ball.entity.getComponent(DynamicRigidBodyComponent)!.body!
  body.setTranslation(
    new Rapier.Vector3(ballSpawnPosition.x, ballSpawnPosition.y, ballSpawnPosition.z),
    true
  )
  body.setRotation(new Rapier.Quaternion(0, 0, 0, 1), true)
  body.setLinvel(new Rapier.Vector3(0, 0, 0), true)
}

// Create goal triggers
new TriggerCube(
  -120,
  -40,
  -350,
  5,
  10,
  13,
  (collidedWithEntity) => collidedWithEntity.id === ball.entity.id && handleGoal('blue'),
  () => {},
  false
)
new TriggerCube(
  120,
  -40,
  -350,
  5,
  10,
  13,
  (collidedWithEntity) => collidedWithEntity.id === ball.entity.id && handleGoal('red'),
  () => {},
  false
)

// When the player is near the ball, he can shoot it
// For that, we need to add a proximity prompt component to the ball
// The front also needs to render a proximity prompt above the ball

// That's why the proximity prompt component is added to the network data component to be synced with the front
const proximityPromptComponent = new ProximityPromptComponent(ball.entity.id, {
  text: 'Kick',
  onInteract: (playerEntity) => {
    const ballRigidbody = ball.entity.getComponent(DynamicRigidBodyComponent)
    const playerRotationComponent = playerEntity.getComponent(RotationComponent)

    if (ballRigidbody && playerRotationComponent && playerEntity.getComponent(InputComponent)) {
      // Convert rotation to direction vector
      const direction = playerRotationComponent.getForwardDirection()

      sendTargetedNotification('', 'You kicked the ball!', [playerEntity.id])

      const playerLookingDirectionVector = new Rapier.Vector3(
        direction.x * 750,
        0,
        direction.z * 750
      )
      ballRigidbody.body!.applyImpulse(playerLookingDirectionVector, true)
    }
  },
  maxInteractDistance: 10,
  interactionCooldown: 2000,
  holdDuration: 0,
})
ball.entity.addNetworkComponent(proximityPromptComponent)

ScriptableSystem.update = (dt, entities) => {
  /**
   * Catch player connect events.
   */
  const playerAddedEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, PlayerComponent)
  for (const event of playerAddedEvents) {
    sendTargetedNotification('⚽ Welcome to Football NotBlox!', 'Choose a team to get started', [
      event.entityId,
    ])
  }

  // Check if there are any players
  const hasPlayers = entities.some((entity) => entity.getComponent(PlayerComponent))

  if (!hasPlayers) {
    // No players are present. Reset the game
    sendGlobalChatMessage('⚽', 'No players, resetting game...')

    const ballBody = ball.entity.getComponent(DynamicRigidBodyComponent)!.body!
    ballBody.setTranslation(
      new Rapier.Vector3(ballSpawnPosition.x, ballSpawnPosition.y, ballSpawnPosition.z),
      true
    )
    ballBody.setRotation(new Rapier.Quaternion(0, 0, 0, 1), true)
    ballBody.setLinvel(new Rapier.Vector3(0, 0, 0), true)

    redScore = 0
    blueScore = 0
    updateScore()
  }
}
