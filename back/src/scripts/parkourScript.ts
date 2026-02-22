import { EntityManager } from '../../../shared/system/EntityManager.js'
import { EventSystem } from '../../../shared/system/EventSystem.js'
import { PlayerComponent } from '../../../shared/component/PlayerComponent.js'
import { PositionComponent } from '../../../shared/component/PositionComponent.js'
import { SerializedMessageType } from '../../../shared/network/server/serialized.js'
import { ComponentAddedEvent } from '../../../shared/component/events/ComponentAddedEvent.js'
import { ComponentRemovedEvent } from '../../../shared/component/events/ComponentRemovedEvent.js'
import { MessageEvent } from '../ecs/component/events/MessageEvent.js'
import { SpawnPositionComponent } from '../ecs/component/SpawnPositionComponent.js'
import { ZombieComponent } from '../ecs/component/ZombieComponent.js'
import { ScriptableSystem } from '../ecs/system/ScriptableSystem.js'
import { ChatComponent } from '../ecs/component/tag/TagChatComponent.js'
import { MapWorld } from '../ecs/entity/MapWorld.js'
import { Sphere } from '../ecs/entity/Sphere.js'

new MapWorld('https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/world/Obby.glb')

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const chatEntity = EntityManager.getFirstEntityWithComponent(
  EntityManager.getInstance().getAllEntities(),
  ChatComponent
)!

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

function sendGlobalChatMessage(author: string, message: string) {
  EventSystem.addEvent(
    new MessageEvent(chatEntity.id, author, message, SerializedMessageType.GLOBAL_CHAT)
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

// Create falling spheres for the parkour challenge
for (let i = 1; i <= 4; i++) {
  const fallingSpherePosition = {
    x: 263,
    y: 426 + i * 5,
    z: -986 - randomInt(-40, 0),
  }

  const sphere = new Sphere({
    position: fallingSpherePosition,
    radius: 4,
    physicsProperties: {
      enableCcd: true,
    },
  })
  sphere.entity.addComponent(
    new SpawnPositionComponent(
      sphere.entity.id,
      fallingSpherePosition.x,
      fallingSpherePosition.y,
      fallingSpherePosition.z
    )
  )
  sphere.entity.addComponent(new ZombieComponent(sphere.entity.id))
}

// Periodic help message
let helpMessageTimer = 0
const HELP_MESSAGE_INTERVAL = 60 * 5 // Send help message every 5 minutes

ScriptableSystem.update = (dt, entities) => {
  /**
   * Catch player disconnect events.
   */
  const playerRemovedEvents = EventSystem.getEventsWrapped(ComponentRemovedEvent, PlayerComponent)
  if (playerRemovedEvents.length > 0) {
    sendGlobalChatMessage('👋', `Player left the obby parkour challenge!`)
  }

  /**
   * Catch player connect events.
   */
  const playerAddedEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, PlayerComponent)
  for (const event of playerAddedEvents) {
    const playerId = event.entityId
    const playerEntity = EntityManager.getEntityById(entities, playerId)
    if (!playerEntity) continue

    const position = playerEntity.getComponent(PositionComponent)
    const playerName = playerEntity.getComponent(PlayerComponent)?.name ?? 'Player'

    if (position) {
      playerEntity.addComponent(
        new SpawnPositionComponent(playerId, position.x, position.y, position.z)
      )

      sendTargetedChat(
        '🏁 Parkour Challenge',
        `Welcome ${playerName}! Use /cp command to save your current position as a checkpoint.`,
        [playerId]
      )
      sendTargetedNotification(
        '🏁 Parkour Challenge',
        `Welcome ${playerName}! Use /cp command to save your current position as a checkpoint.`,
        [playerId]
      )
    }
  }

  // Process chat messages for checkpoint commands
  const messageEvents = EventSystem.getEvents(MessageEvent)

  for (const event of messageEvents) {
    if (event.messageType !== SerializedMessageType.GLOBAL_CHAT) continue

    const content = event.content.trim()

    // Check if message is a checkpoint command
    if (content.startsWith('/cp') || content.startsWith('/checkpoint')) {
      const playerId = event.entityId
      const playerEntity = EntityManager.getEntityById(entities, playerId)
      const position = playerEntity?.getComponent(PositionComponent)

      if (playerEntity && position) {
        try {
          // Update the player's checkpoint position
          const spawnPos = playerEntity.getComponent(SpawnPositionComponent)
          if (spawnPos) {
            spawnPos.x = position.x
            spawnPos.y = position.y
            spawnPos.z = position.z
          } else {
            // If player somehow doesn't have SpawnPositionComponent, add it
            playerEntity.addComponent(
              new SpawnPositionComponent(playerId, position.x, position.y, position.z)
            )
          }
          // Send confirmation message to the player
          sendTargetedChat('🏁 Checkpoint', `Checkpoint set successfully!`, [playerId])
          sendTargetedNotification('🏁 Checkpoint', 'Checkpoint set successfully!', [playerId])
        } catch (error) {
          // Handle any errors that might occur
          console.error(`Error setting checkpoint for player ${playerId}:`, error)
          sendTargetedChat('❌ Error', 'Failed to set checkpoint. Please try again.', [playerId])
        }
      } else {
        // Player entity not found or doesn't have position component
        sendTargetedChat('❌ Error', 'Unable to set checkpoint. Please try again later.', [
          event.entityId,
        ])
      }
    } else if (content === '/help') {
      sendTargetedChat('🏁 Help Menu', 'Available commands: /cp, /checkpoint', [event.entityId])
      sendTargetedNotification('🏁 Help Menu', 'Available commands: /cp, /checkpoint', [
        event.entityId,
      ])
    }
  }

  /**
   * Periodic help message
   */
  if (helpMessageTimer >= HELP_MESSAGE_INTERVAL) {
    sendGlobalChatMessage('🤖', 'Available commands: /help, /cp, /checkpoint')
    helpMessageTimer = 0
  } else {
    helpMessageTimer += dt / 1000
  }
}
