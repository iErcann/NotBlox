import { EntityManager } from '@shared/system/EntityManager.js'
import { EventSystem } from '@shared/system/EventSystem.js'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { SingleSizeComponent } from '@shared/component/SingleSizeComponent.js'
import { ProximityPromptComponent } from '@shared/component/ProximityPromptComponent.js'
import { SerializedMessageType } from '@shared/network/server/serialized.js'
import { ComponentAddedEvent } from '@shared/component/events/ComponentAddedEvent.js'
import { ComponentRemovedEvent } from '@shared/component/events/ComponentRemovedEvent.js'
import { MessageEvent } from '../ecs/component/events/MessageEvent.js'
import { FollowTargetComponent } from '../ecs/component/FollowTargetComponent.js'
import { ScriptableSystem } from '../ecs/system/ScriptableSystem.js'
import { ChatComponent } from '../ecs/component/tag/TagChatComponent.js'
import { Cube } from '../ecs/entity/Cube.js'
import { FloatingText } from '../ecs/entity/FloatingText.js'
import { MapWorld } from '../ecs/entity/MapWorld.js'
import { Mesh } from '../ecs/entity/Mesh.js'
import { OrbitalCompanion } from '../ecs/entity/OrbitalCompanion.js'
import { TriggerCube } from '../ecs/entity/TriggerCube.js'
import { Entity } from '@shared/entity/Entity.js'

new MapWorld('https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/world/PetSim.glb')

const s3Base = 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/animal/'

// ---- Types ---------------------------------------------------------------

interface PetTypeData {
  name: string
  rarity: Rarity
  bonus: number // Base coin multiplier granted by this pet
  url: string // Path to the 3D .glb model
  size: number // Base physical scaling of the companion mesh
}

interface RarityData {
  color: string
  chance: number // Base percentage chance to roll this rarity (0-100)
  emoji: string
}

// Egg shop configuration - defines what players can buy and how it alters drop rates
interface EggTypeData {
  name: string
  price: number
  description: string
  emoji: string
  // Modifiers multiply the base `RarityData.chance`. >1 increases odds, <1 decreases them.
  rarityModifier: Record<Rarity, number>
  buyPosition: { x: number; y: number; z: number } // 3D coordinates for the shop vendor mesh
}

// Individual pet instance owned by a specific player
interface Pet {
  type: string // Maps back to the key in PET_TYPES
  bonus: number // Current calculated bonus (baseBonus * level multiplier)
  rarity: Rarity
  level: number
  purchaseDate: Date
  baseBonus?: number // Stored to accurately recalculate the bonus upon leveling up
}

// Player's localized game data - tracks progression, inventory, and economy
interface PlayerData {
  coins: number
  pets: Pet[]
  eggs: number // Total egg count
  joinDate: Date
  lastActive: Date
  level: number
  name: string
  selectedPetIndex: number // Currently active/equipped pet
  eggInventory: Record<string, number> // Tracks quantities of specific egg types (e.g., {'BASIC': 2})
}

// Configuration for random drops that occur when players collect coins
interface RandomReward {
  type: 'coins' | 'egg'
  amount?: number
  chance: number // Relative weight for this reward to be chosen
  message: string
}

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// ---- Static data ---------------------------------------------------------

const PET_TYPES: Record<string, PetTypeData> = {
  CAT: { name: 'Cat', rarity: 'common', bonus: 2, url: `${s3Base}Cat.glb`, size: 1 },
  CHICK: { name: 'Chick', rarity: 'common', bonus: 1, url: `${s3Base}Chick.glb`, size: 1 },
  CHICKEN: { name: 'Chicken', rarity: 'common', bonus: 3, url: `${s3Base}Chicken.glb`, size: 1 },
  DOG: { name: 'Dog', rarity: 'uncommon', bonus: 5, url: `${s3Base}Dog.glb`, size: 1 },
  HORSE: { name: 'Horse', rarity: 'rare', bonus: 10, url: `${s3Base}Horse.glb`, size: 1 },
  PIG: { name: 'Pig', rarity: 'uncommon', bonus: 4, url: `${s3Base}Pig.glb`, size: 1 },
  RACCOON: { name: 'Raccoon', rarity: 'rare', bonus: 8, url: `${s3Base}Raccoon.glb`, size: 1 },
  SHEEP: { name: 'Sheep', rarity: 'uncommon', bonus: 6, url: `${s3Base}Sheep.glb`, size: 1 },
  WOLF: { name: 'Wolf', rarity: 'epic', bonus: 15, url: `${s3Base}Wolf.glb`, size: 1 },
  GOLDEN_WOLF: {
    name: 'Golden Wolf',
    rarity: 'legendary',
    bonus: 30,
    url: `${s3Base}Wolf.glb`,
    size: 2, // Legendary pets are physically larger
  },
}

// Base probabilities and aesthetics for the gacha system
const RARITY_DATA: Record<Rarity, RarityData> = {
  common: { color: '#AAAAAA', chance: 60, emoji: '⚪' }, // 60% base chance
  uncommon: { color: '#55AA55', chance: 25, emoji: '🟢' },
  rare: { color: '#5555FF', chance: 10, emoji: '🔵' },
  epic: { color: '#AA00AA', chance: 4, emoji: '🟣' },
  legendary: { color: '#FFAA00', chance: 1, emoji: '🟠' }, // 1% base chance
}

// Rewards table used by the coin trigger area
const RANDOM_REWARDS: RandomReward[] = [
  { type: 'coins', amount: 10, chance: 30, message: 'Found a small coin stash!' },
  { type: 'coins', amount: 50, chance: 10, message: 'Found a medium coin stash!' },
  { type: 'coins', amount: 200, chance: 2, message: 'Found a large coin stash!' },
  { type: 'coins', amount: 1000, chance: 1, message: 'JACKPOT! Found a huge coin stash!' },
  { type: 'egg', chance: 1, message: 'Found a mystery egg!' },
]

// Shop configs. Notice how `rarityModifier` drastically alters the base drop tables.
const EGG_TYPES: Record<string, EggTypeData> = {
  BASIC: {
    name: 'Basic Egg',
    price: 100,
    description: 'Contains mostly common pets',
    emoji: '🥚',
    rarityModifier: { common: 1.2, uncommon: 0.9, rare: 0.8, epic: 0.5, legendary: 0.2 },
    buyPosition: { x: -97.73, y: -12.08, z: 13.17 },
  },
  SPOTTED: {
    name: 'Spotted Egg',
    price: 350,
    description: 'Higher chance for uncommon and rare pets',
    emoji: '🥚🟢',
    rarityModifier: { common: 0.5, uncommon: 1.5, rare: 1.2, epic: 0.8, legendary: 0.5 },
    buyPosition: { x: -89.87, y: -12.59, z: -2.18 },
  },
  GOLDEN: {
    name: 'Golden Egg',
    price: 1000,
    description: 'Much higher chance for rare and epic pets',
    emoji: '🥚✨',
    rarityModifier: { common: 0.2, uncommon: 0.8, rare: 1.5, epic: 1.5, legendary: 1.0 },
    buyPosition: { x: -82.12, y: -12.46, z: -17.4 },
  },
  CRYSTAL: {
    name: 'Crystal Egg',
    price: 2500,
    description: 'High chance for epic and legendary pets',
    emoji: '🥚💎',
    rarityModifier: { common: 0.1, uncommon: 0.3, rare: 0.7, epic: 2.0, legendary: 3.0 },
    buyPosition: { x: -73.78, y: -12.07, z: -29.45 },
  },
}

// Pet upgrade scaling. Getting duplicate pets levels them up instead of hoarding them.
const LEVEL_MULTIPLIERS: Record<number, number> = {
  1: 1.0, // Base level multiplier
  2: 1.5, // e.g., Base bonus 10 * 1.5 = 15
  3: 2.0,
  4: 3.0,
  5: 4.0,
  6: 6.0,
  7: 8.0,
  8: 12.0,
  9: 18.0,
  10: 25.0, // Max level provides a massive 25x multiplier
}

// ---- State ---------------------------------------------------------------

const entityManager = EntityManager.getInstance()
const allEntities = entityManager.getAllEntities()
const chatEntity = EntityManager.getFirstEntityWithComponent(allEntities, ChatComponent)!

// In-memory store linking a player's Entity ID to their specific progression data
const playerDataMap = new Map<number, PlayerData>()

// ---- Leaderboard ---------------------------------------------------------

// Instantiate a 3D text object in the world to display top players
const leaderboardText = new FloatingText('👑 LEADERBOARD 🏆', 93.47, -12.45, 39.26, 150)

/**
 * Sorts all active players by coin count and updates the 3D leaderboard text.
 * Called whenever a player's coin balance changes.
 */
function updateLeaderboard() {
  const entries = Array.from(playerDataMap.entries())
  entries.sort((a, b) => b[1].coins - a[1].coins)

  let leaderboardString = '<b>✨ TOP PLAYERS ✨</b><br/>'
  entries.forEach(([, data], index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'
    const legendaryCount = data.pets.filter((p) => p.rarity === 'legendary').length
    const legendaryBadge = legendaryCount > 0 ? `⭐${legendaryCount}` : ''

    leaderboardString += `${medal} ${data.name}: ${data.coins} coins | 🐾 ${data.pets.length} pets ${legendaryBadge}<br/>`
  })

  leaderboardText.updateText(leaderboardString)
}

// ---- Messaging helpers ---------------------------------------------------

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

// ---- Player data helpers -------------------------------------------------

/**
 * Creates a fresh profile for a new or connecting player.
 */
function initializePlayerData(playerId: number): PlayerData {
  const playerEntity = EntityManager.getEntityById(allEntities, playerId)
  const name = playerEntity?.getComponent(PlayerComponent)?.name ?? `Player${playerId}`
  return {
    coins: 100, // Starting capital
    pets: [],
    eggs: 1, // Give 1 starter egg
    joinDate: new Date(),
    lastActive: new Date(),
    level: 1,
    name,
    selectedPetIndex: -1,
    eggInventory: {},
  }
}

/**
 * Safely fetches player data, initializing it if they don't exist in the map yet.
 */
function getPlayerData(playerId: number): PlayerData {
  if (!playerDataMap.has(playerId)) playerDataMap.set(playerId, initializePlayerData(playerId))
  return playerDataMap.get(playerId)!
}

function getPlayerCoins(playerId: number): number {
  return getPlayerData(playerId).coins
}

/**
 * Modifies coin balance and triggers a leaderboard update since standings may have changed.
 */
function addPlayerCoins(playerId: number, amount: number): number {
  const data = getPlayerData(playerId)
  data.coins += amount
  data.lastActive = new Date()
  updateLeaderboard()
  return data.coins
}

/**
 * Adds a specific type of egg to the player's inventory map.
 */
function addPlayerEgg(playerId: number, amount = 1, eggType = 'BASIC'): number {
  const data = getPlayerData(playerId)
  data.eggInventory[eggType] = (data.eggInventory[eggType] ?? 0) + amount
  data.eggs += amount
  data.lastActive = new Date()
  return data.eggs
}

/**
 * Grants a new pet, calculates its actual coin bonus based on level, and spawns its 3D mesh.
 */
function addPlayerPet(playerId: number, pet: Pet): number {
  const data = getPlayerData(playerId)
  pet.level = pet.level ?? 1
  pet.baseBonus = pet.bonus
  // Apply the level multiplier to the base static bonus
  pet.bonus = Math.round(pet.baseBonus * LEVEL_MULTIPLIERS[pet.level])

  data.pets.push(pet)
  data.lastActive = new Date()
  updateLeaderboard()
  spawnPetCompanion(playerId, pet)

  return data.pets.length
}

// ---- Pet helpers ---------------------------------------------------------

// Utility to format text with the pet's corresponding rarity emoji
function getRarityColoredText(text: string, rarity: Rarity): string {
  const rarityInfo = RARITY_DATA[rarity] ?? RARITY_DATA.common
  return `${rarityInfo.emoji} ${text}`
}

/**
 * Spawns an ECS OrbitalCompanion entity that follows the player around the map.
 */
function spawnPetCompanion(playerId: number, pet: Pet) {
  const playerEntity = EntityManager.getEntityById(allEntities, playerId)
  if (!playerEntity) return

  const petData = PET_TYPES[pet.type]
  if (!petData) return

  const levelIndicator = pet.level > 1 ? ` Lvl ${pet.level}` : ''

  // Creates a floating pet mesh that orbits the player entity
  new OrbitalCompanion({
    position: { x: 0, y: 0, z: 0 },
    meshUrl: petData.url,
    targetEntityId: playerEntity.id,
    offset: { x: 0, y: 0, z: 0 },
    name: getRarityColoredText(`${petData.name}${levelIndicator}`, pet.rarity),
    // Scale pet size up slightly as it levels
    size: petData.size * (1 + (pet.level - 1) * 0.15),
  })
}

/**
 * Core Gacha Logic: Determines which pet hatches from an egg using weighted probabilities.
 */
function getRandomPetType(eggType = 'BASIC'): string {
  const eggData = EGG_TYPES[eggType] ?? EGG_TYPES.BASIC
  const rarityModifiers = eggData.rarityModifier

  const rarityRoll = Math.random() * 100
  let selectedRarity: Rarity = 'common'
  let cumulativeChance = 0

  const modifiedRarityData: Record<string, { modifiedChance: number }> = {}
  let totalModifiedChance = 0

  // 1. Calculate new weights for each rarity based on the specific egg's modifiers
  for (const [rarity, data] of Object.entries(RARITY_DATA) as [Rarity, RarityData][]) {
    const modifier = rarityModifiers[rarity] ?? 1.0
    const modifiedChance = data.chance * modifier
    modifiedRarityData[rarity] = { modifiedChance }
    totalModifiedChance += modifiedChance
  }

  // 2. Normalize weights so they equal 100%, then roll against cumulative totals
  for (const [rarity, data] of Object.entries(modifiedRarityData)) {
    const normalizedChance = (data.modifiedChance / totalModifiedChance) * 100
    cumulativeChance += normalizedChance
    if (rarityRoll <= cumulativeChance) {
      selectedRarity = rarity as Rarity
      break
    }
  }

  // 3. Filter pets to only the selected rarity, and pick one uniformly at random
  const petsOfRarity = Object.entries(PET_TYPES).filter(([, p]) => p.rarity === selectedRarity)
  const randomIndex = Math.floor(Math.random() * petsOfRarity.length)
  return petsOfRarity[randomIndex][0]
}

// Checks if the player already owns a pet of this type (used for merging/leveling)
function findExistingPet(playerId: number, petType: string): { pet: Pet; index: number } | null {
  const data = getPlayerData(playerId)
  const index = data.pets.findIndex((p) => p.type === petType)
  return index >= 0 ? { pet: data.pets[index], index } : null
}

/**
 * Handles the logic of pulling a duplicate pet.
 * Instead of giving a second pet, it increases the level and stats of the existing one.
 */
function levelUpPet(playerId: number, petIndex: number) {
  const data = getPlayerData(playerId)
  const pet = data.pets[petIndex]
  if (!pet) return null

  const nextLevel = (pet.level ?? 1) + 1

  // Hard cap at level 10; give bonus coins if they roll a duplicate of a maxed pet
  if (nextLevel > 10) {
    const maxLevelBonus = 500
    addPlayerCoins(playerId, maxLevelBonus)
    return { pet, maxLevelBonus }
  }

  pet.level = nextLevel
  const oldBonus = pet.bonus
  // Recalculate multiplier
  pet.bonus = Math.round((pet.baseBonus ?? pet.bonus) * LEVEL_MULTIPLIERS[nextLevel])

  // Update the visual representation of the pet in the world
  const playerEntity = EntityManager.getEntityById(allEntities, playerId)
  if (playerEntity) {
    // Find all companions following this specific player
    const companionEntities = allEntities.filter((entity) => {
      const followComponent = entity.getComponent(FollowTargetComponent)
      return followComponent && followComponent.targetEntityId === playerId
    })

    const companion = companionEntities[petIndex]
    if (companion) {
      const petData = PET_TYPES[pet.type]
      if (petData) {
        // Update the floating nameplate text
        const textComponent = companion.getComponent(TextComponent)
        if (textComponent) {
          const levelIndicator = pet.level > 1 ? ` Lvl ${pet.level}` : ''
          textComponent.text = getRarityColoredText(`${petData.name}${levelIndicator}`, pet.rarity)
          textComponent.updated = true // Flag for network sync
        }

        // Increase physical size based on new level
        const sizeComponent = companion.getComponent(SingleSizeComponent)
        if (sizeComponent) {
          sizeComponent.size = petData.size * (1 + (pet.level - 1) * 0.05)
          sizeComponent.updated = true // Flag for network sync
        }
      }
    } else {
      // Failsafe: if the companion entity was missing, spawn it
      spawnPetCompanion(playerId, pet)
    }
  }

  return { pet, bonusIncrease: pet.bonus - oldBonus, newLevel: nextLevel }
}

/**
 * Rolls for a random bonus event (extra coins, free eggs) when jumping in the farm area.
 */
function getRandomReward(): RandomReward {
  const rewardRoll = Math.random() * 100
  let cumulativeChance = 0
  for (const reward of RANDOM_REWARDS) {
    cumulativeChance += reward.chance
    if (rewardRoll <= cumulativeChance) return reward
  }
  return RANDOM_REWARDS[0]
}

// ---- Trigger helpers -----------------------------------------------------

/**
 * Creates an invisible collision box in the world.
 * When a player entity intersects it, the `onTrigger` callback is executed.
 */
function createTriggerArea(
  posA: { x: number; y: number; z: number },
  posB: { x: number; y: number; z: number },
  onTrigger: (player: Entity) => void
) {
  new TriggerCube(
    (posA.x + posB.x) / 2, // Center X
    (posA.y + posB.y) / 2, // Center Y
    (posA.z + posB.z) / 2, // Center Z
    Math.abs(posA.x - posB.x) / 2, // Extents (Half-width)
    Math.abs(posA.y - posB.y) / 2,
    Math.abs(posA.z - posB.z) / 2,
    (collidedWithEntity) => {
      // Ensure only players trigger the area (ignore pets/objects)
      if (collidedWithEntity.getComponent(PlayerComponent)) onTrigger(collidedWithEntity)
    },
    () => {}, // onExit (unused)
    false // Not visible
  )
}

// ---- Egg shops -----------------------------------------------------------

// Iterates through static config to spawn interactable shop meshes
Object.entries(EGG_TYPES).forEach(([eggType, eggData]) => {
  const eggShop = new Mesh({
    position: eggData.buyPosition,
    colliderProperties: { isSensor: true }, // Players can walk through it
    physicsProperties: { mass: 0, gravityScale: 0 }, // Static object
    meshUrl: 'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/base/Egg.glb',
  })

  // Floating label above the shop
  eggShop.entity.addNetworkComponent(
    new TextComponent(eggShop.entity.id, eggData.name, 0, 2, 0, 20)
  )

  // Interactive prompt (press E / tap to buy)
  eggShop.entity.addNetworkComponent(
    new ProximityPromptComponent(eggShop.entity.id, {
      text: `${eggData.emoji} Buy ${eggData.name} (${eggData.price} coins)`,
      onInteract: (playerEntity) => {
        const playerId = playerEntity.id
        const data = getPlayerData(playerId)

        // Transaction logic
        if (data.coins >= eggData.price) {
          addPlayerCoins(playerId, -eggData.price)
          addPlayerEgg(playerId, 1, eggType)

          sendTargetedNotification(
            `${eggData.emoji} Purchased!`,
            `You bought a ${eggData.name} for ${eggData.price} coins! ${eggData.description}`,
            [playerId]
          )
          sendTargetedChat(
            `${eggData.emoji} Purchased!`,
            `You now have ${data.eggs} eggs. Go to the hatching station to use them!`,
            [playerId]
          )
        } else {
          sendTargetedChat(
            '❌ Not enough coins',
            `You need ${eggData.price - data.coins} more coins to buy this egg!`,
            [playerId]
          )
        }
      },
      interactionCooldown: 1000, // Prevent spam clicking
      holdDuration: 0,
      maxInteractDistance: 12,
    })
  )
})

// ---- Egg hatching station ------------------------------------------------

// Create the central interactable spot where eggs are turned into pets
const eggHatchingStation = new Cube({
  position: { x: 90.27, y: -15, z: -57.81 },
  size: { width: 0.1, height: 0.1, depth: 0.1 },
  colliderProperties: { isSensor: true, friction: 0, restitution: 0 },
  physicsProperties: { mass: 0, gravityScale: 0 },
})

eggHatchingStation.entity.addNetworkComponent(
  new ProximityPromptComponent(eggHatchingStation.entity.id, {
    text: '🥚 Hatch Egg',
    onInteract: (playerEntity) => {
      const playerId = playerEntity.id
      const data = getPlayerData(playerId)
      const playerName = data.name

      // Guard clause: ensure they have inventory
      if (data.eggs < 1) {
        sendTargetedChat(
          '❌',
          `You don't have any eggs! Find them by jumping in the play area or buy them at the shop.`,
          [playerId]
        )
        sendTargetedNotification('❌ No eggs', `You don't have any eggs!`, [playerId])
        return
      }

      // Priority system: Auto-consume the most valuable/rarest egg first
      let selectedEggType = 'BASIC'
      const rarityOrder = ['CRYSTAL', 'GOLDEN', 'SPOTTED', 'BASIC']

      if (Object.keys(data.eggInventory).length > 0) {
        for (const eggType of rarityOrder) {
          if ((data.eggInventory[eggType] ?? 0) > 0) {
            selectedEggType = eggType
            break
          }
        }
        // Fallback: If inventory is somehow out of sync, just use the first available type
        if (!data.eggInventory[selectedEggType] || data.eggInventory[selectedEggType] <= 0) {
          for (const [eggType, count] of Object.entries(data.eggInventory)) {
            if (count > 0) {
              selectedEggType = eggType
              break
            }
          }
        }
        // Deduct items
        data.eggInventory[selectedEggType]--
        data.eggs--
      } else {
        data.eggs--
      }

      const eggData = EGG_TYPES[selectedEggType] ?? EGG_TYPES.BASIC
      const petType = getRandomPetType(selectedEggType) // Roll the gacha
      const petData = PET_TYPES[petType]
      const existingPet = findExistingPet(playerId, petType)

      // Handle duplicate pulls
      if (existingPet) {
        const result = levelUpPet(playerId, existingPet.index)!

        if ('maxLevelBonus' in result) {
          sendTargetedNotification(
            '✨ Max Level Pet!',
            `Your ${petData.name} is already max level! You received ${result.maxLevelBonus} bonus coins!`,
            [playerId]
          )
          sendTargetedChat('✨ Max Level Pet!', `Received ${result.maxLevelBonus} bonus coins!`, [
            playerId,
          ])
        } else {
          sendTargetedNotification(
            '⬆️ Pet Leveled Up!',
            `Your ${eggData.emoji} ${eggData.name} upgraded your ${petData.name} to level ${result.newLevel}! Bonus +${result.bonusIncrease} coins/jump.`,
            [playerId]
          )
          sendTargetedChat(
            '⬆️ Pet Leveled Up!',
            `Level ${result.newLevel} ${petData.name} now gives +${result.pet.bonus} coins per jump!`,
            [playerId]
          )

          // Broadcast high-level milestones to everyone
          if (result.newLevel >= 8) {
            sendGlobalChatMessage(
              '🌟',
              `${playerName} leveled up their ${petData.name} to level ${result.newLevel}!`
            )
          }
        }
      } else {
        // Handle brand new pet pulls
        const pet: Pet = {
          type: petType,
          bonus: petData.bonus,
          rarity: petData.rarity,
          level: 1,
          purchaseDate: new Date(),
        }
        addPlayerPet(playerId, pet)

        const rarityInfo = RARITY_DATA[petData.rarity]
        const rarityText = getRarityColoredText(petData.name, petData.rarity)
        const hatchMessage = `Your ${eggData.emoji} ${eggData.name} hatched into a ${rarityText}! +${pet.bonus} coins/jump!`

        sendTargetedNotification('🐣 New Pet!', hatchMessage, [playerId])
        sendTargetedChat('🐣', hatchMessage, [playerId])

        // Server-wide announcements for rare+ drops
        if (
          petData.rarity === 'rare' ||
          petData.rarity === 'epic' ||
          petData.rarity === 'legendary'
        ) {
          sendGlobalChatMessage(
            '🎉',
            `${playerName} just hatched a ${rarityInfo.emoji} ${petData.rarity.toUpperCase()} ${petData.name} from a ${eggData.name}!`
          )

          // Legendary drops give all online players 50 bonus coins
          if (petData.rarity === 'legendary') {
            sendGlobalNotification(
              '⭐ LEGENDARY PET',
              `${playerName} hatched a LEGENDARY ${petData.name}! Everyone gets 50 coins!`
            )
            Array.from(playerDataMap.keys()).forEach((id) => {
              addPlayerCoins(id, 50)
              sendTargetedChat('🎁', `${playerName} found a legendary pet! You got 50 coins!`, [id])
            })
          }
        }
      }

      // Status update
      if (data.eggs > 0) {
        sendTargetedChat('🥚', `You have ${data.eggs} eggs remaining.`, [playerId])
      }
    },
    interactionCooldown: 1000,
    holdDuration: 0,
    maxInteractDistance: 30, // Large interaction distance to accommodate multiple players clustering
  })
)

// ---- Coin trigger area ---------------------------------------------------

// Creates the main "farm area" where players physically move/jump around to earn coins
createTriggerArea(
  { x: 54.24, y: -16.33, z: -134.82 + 25 }, // Bounding box corner A
  { x: -57.94, y: -5.33, z: -244.3 + 25 }, // Bounding box corner B
  (player) => {
    const data = getPlayerData(player.id)

    // Calculates the combined multiplier based on all equipped/owned pets
    const bonus = data.pets.reduce((sum, p) => sum + p.bonus, 0) || 1
    const newCoins = addPlayerCoins(player.id, bonus)

    sendTargetedNotification(`${newCoins} 💰`, `You received ${bonus} coins!`, [player.id])
    sendTargetedChat(`+💰 ${bonus} coins`, `Total: ${newCoins} 💰`, [player.id])

    // 15% chance to trigger a random bonus reward inside the farming area
    if (Math.random() < 0.15) {
      const reward = getRandomReward()
      if (reward.type === 'coins' && reward.amount) {
        addPlayerCoins(player.id, reward.amount)
        sendTargetedNotification(`🎁 BONUS!`, `${reward.message} +${reward.amount} coins!`, [
          player.id,
        ])
        sendTargetedChat(`🎁 BONUS!`, `${reward.message} +${reward.amount} coins!`, [player.id])
      } else if (reward.type === 'egg') {
        addPlayerEgg(player.id, 1)
        sendTargetedNotification(
          `🥚 EGG FOUND!`,
          `${reward.message} You now have ${data.eggs} eggs.`,
          [player.id]
        )
        sendTargetedChat(`🥚 EGG FOUND!`, `${reward.message} Go to the hatching station!`, [
          player.id,
        ])
        // Rare server announcement for randomly finding an egg on the ground
        if (Math.random() < 0.3) sendGlobalChatMessage('🥚', `${data.name} found a mystery egg!`)
      }
    }
  }
)

// ---- Game loop -----------------------------------------------------------

let helpMessageTimer = 0
const HELP_MESSAGE_INTERVAL = 60 * 5 // Broadcasts tips every 5 minutes

// The main update tick function hooked into the server's ECS loop
ScriptableSystem.update = (dt, entities) => {
  /**
   * Catch player disconnect events.
   * Cleans up state to prevent memory leaks in `playerDataMap`.
   */
  const playerRemovedEvents = EventSystem.getEventsWrapped(ComponentRemovedEvent, PlayerComponent)
  for (const event of playerRemovedEvents) {
    const playerId = event.entityId
    const data = getPlayerData(playerId)
    sendGlobalChatMessage(
      '👋',
      `${data.name} disconnected. Coins: ${data.coins}, Pets: ${data.pets.length}`
    )
    playerDataMap.delete(playerId)
  }

  /**
   * Catch player connect events.
   * Initializes state and issues starter items.
   */
  const playerAddedEvents = EventSystem.getEventsWrapped(ComponentAddedEvent, PlayerComponent)
  for (const event of playerAddedEvents) {
    const playerId = event.entityId
    const data = initializePlayerData(playerId)
    playerDataMap.set(playerId, data)

    sendTargetedNotification(
      '🐾 Welcome to Pet Simulator!',
      'Jump in the play area to collect coins and find eggs!',
      [playerId]
    )
    sendTargetedChat(
      '🐾 Welcome to Pet Simulator!',
      'Jump in the play area to collect coins and find eggs!',
      [playerId]
    )

    // Helpful tips with delay so the user isn't overwhelmed immediately upon joining
    setTimeout(() => {
      sendTargetedNotification(
        '🥚 Tips',
        'Find eggs to hatch pets! Rarer pets give more coins per jump!',
        [playerId]
      )
      sendTargetedChat('🥚 Tips', 'Find eggs to hatch pets! Rarer pets give more coins per jump!', [
        playerId,
      ])
    }, 5000)

    // Spawn existing pets for reconnecting players (gives the 3D meshes time to load)
    if (data.pets.length > 0) {
      setTimeout(() => {
        sendTargetedChat('🐾', `Respawning your ${data.pets.length} pets...`, [playerId])
        data.pets.forEach((pet) => spawnPetCompanion(playerId, pet))
      }, 2000)
    }

    // New player initialization logic
    if (data.pets.length === 0 && data.eggs === 0) {
      addPlayerEgg(playerId, 1)
      setTimeout(() => {
        sendTargetedNotification(
          '🎁 Welcome Gift',
          'You received 1 mystery egg! Visit the hatching station to use it!',
          [playerId]
        )
        sendTargetedChat(
          '🎁 Welcome Gift',
          'You received 1 mystery egg! Visit the hatching station to use it!',
          [playerId]
        )
      }, 10000)
    }
  }

  /**
   * Catch chat events to implement command logic (/help, /give, etc.)
   */
  const messageEvents = EventSystem.getEvents(MessageEvent)
  for (const event of messageEvents) {
    // We only care about global chat inputs for commands
    if (event.messageType !== SerializedMessageType.GLOBAL_CHAT) continue

    const senderName = event.sender
    const content = event.content

    // Skip normal chat messages
    if (!content.startsWith('/')) continue

    const args = content.split(' ')
    const command = args[0].toLowerCase() // Normalize capitalization

    if (command === '/help') {
      sendGlobalChatMessage(
        '🤖',
        'Commands: /help, /coins, /eggs, /pets, /give <player> <amount>, /stats'
      )
    } else if (command === '/coins') {
      sendGlobalChatMessage('💰', `${senderName} has ${getPlayerCoins(event.entityId)} coins`)
    } else if (command === '/eggs') {
      const data = getPlayerData(event.entityId)
      sendGlobalChatMessage('🥚', `${senderName} has ${data.eggs} eggs`)
    } else if (command === '/pets') {
      const data = getPlayerData(event.entityId)
      const petsByRarity: Record<string, number> = {}

      // Tally owned pets up by rarity
      data.pets.forEach((p) => {
        petsByRarity[p.rarity] = (petsByRarity[p.rarity] ?? 0) + 1
      })

      // Construct a summary string containing counts and rarity emojis
      let msg = `${senderName}'s pets (${data.pets.length} total):`
      for (const [rarity, count] of Object.entries(petsByRarity)) {
        msg += ` ${RARITY_DATA[rarity as Rarity].emoji} ${count} ${rarity},`
      }

      sendGlobalChatMessage('🐾', msg.slice(0, -1))
    } else if (command === '/give' && args.length >= 3) {
      // Economy transfer logic
      // Combines multi-word names (slice from 1 to the second-to-last item)
      const targetName = args.slice(1, -1).join(' ')
      const amount = parseInt(args[args.length - 1])

      // Validation to prevent bad inputs or exploits (like negative numbers draining accounts)
      if (isNaN(amount) || amount <= 0) {
        sendTargetedChat('❌', 'Please enter a valid positive number', [event.entityId])
        continue
      }

      const senderCoins = getPlayerCoins(event.entityId)
      if (senderCoins < amount) {
        sendTargetedChat('❌', `You don't have enough coins. Balance: ${senderCoins}`, [
          event.entityId,
        ])
        continue
      }

      // Find player by name
      const targetPlayerId = Array.from(playerDataMap.keys()).find(
        (id) => playerDataMap.get(id)?.name === targetName
      )

      if (!targetPlayerId) {
        sendTargetedChat('❌', `"${targetName}" not found`, [event.entityId])
        continue
      }

      // Execute transaction
      addPlayerCoins(event.entityId, -amount)
      addPlayerCoins(targetPlayerId, amount)
      sendGlobalChatMessage('💰', `${senderName} gave ${amount} coins to ${targetName}`)
    } else if (command === '/stats') {
      // Aggregate detailed player information
      const data = getPlayerData(event.entityId)
      const playtime = (Date.now() - data.joinDate.getTime()) / 1000 // In seconds
      const playtimeString = `${Math.floor(playtime / 3600)}h ${Math.floor((playtime % 3600) / 60)}m`
      const legendaryPets = data.pets.filter((p) => p.rarity === 'legendary').length
      const legendaryString = legendaryPets > 0 ? ` | 🌟 ${legendaryPets} legendary` : ''

      sendGlobalChatMessage(
        '📊',
        `${data.name}: 💰 ${data.coins} | 🥚 ${data.eggs} | 🐾 ${data.pets.length}${legendaryString} | ⏱️ ${playtimeString}`
      )
    } else if (command === '/pos') {
      // Admin/Debug command to fetch current world coordinates
      const data = getPlayerData(event.entityId)
      const entity = EntityManager.getEntityById(entities, event.entityId)
      if (!entity) continue
      const pos = entity.getComponent(PositionComponent)?.serialize()
      if (!pos) continue
      sendGlobalChatMessage('📍', `${data.name} is at ${pos.x}, ${pos.y}, ${pos.z}`)
    }
  }

  /**
   * Periodic help message handling using the delta time (`dt`) provided by the engine loop
   */
  if (helpMessageTimer >= HELP_MESSAGE_INTERVAL) {
    sendGlobalChatMessage(
      '🤖',
      'Commands: /help, /coins, /eggs, /pets, /give <player> <amount>, /stats'
    )
    helpMessageTimer = 0
  } else {
    helpMessageTimer += dt / 1000
  }

  /**
   * Random global event generator.
   */
  if (Math.random() < 0.0005 * (dt / 1000)) {
    const events = [
      { message: '🌟 Lucky Star event! Everyone gets an egg!', action: 'egg' },
      { message: '💰 Money Rain! Everyone gets 100 coins!', action: 'coins' },
      { message: '🍀 Lucky Clover event! Double coins for the next minute!', action: 'none' },
    ]
    const randomEvent = events[Math.floor(Math.random() * events.length)]
    sendGlobalNotification('✨ EVENT', randomEvent.message)
    sendGlobalChatMessage('✨ EVENT', randomEvent.message)

    // Apply the event effect to all online players
    if (randomEvent.action === 'egg') {
      Array.from(playerDataMap.keys()).forEach((id) => {
        addPlayerEgg(id, 1)
        sendTargetedChat('🎁', `You received a mystery egg!`, [id])
      })
    } else if (randomEvent.action === 'coins') {
      Array.from(playerDataMap.keys()).forEach((id) => {
        addPlayerCoins(id, 100)
        sendTargetedChat('💰', `You received 100 coins!`, [id])
      })
    }
  }
}
