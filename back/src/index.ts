import 'dotenv/config'

import { EntityManager } from '../../shared/system/EntityManager.js'
import { config } from '../../shared/network/config.js'
import { EventSystem } from '../../shared/system/EventSystem.js'

import { Chat } from './ecs/entity/Chat.js'
import { AnimationSystem } from './ecs/system/AnimationSystem.js'
import { MovementSystem } from './ecs/system/MovementSystem.js'
import { RandomizeSystem } from './ecs/system/RandomizeSystem.js'
import { MessageEventSystem } from './ecs/system/events/MessageEventSystem.js'
import { ColorEventSystem } from './ecs/system/events/ColorEventSystem.js'
import { DestroyEventSystem } from './ecs/system/events/DestroyEventSystem.js'
import { SingleSizeEventSystem } from './ecs/system/events/SingleSizeEventSystem.js'
import { SizeEventSystem } from './ecs/system/events/SizeEventSystem.js'
import { NetworkSystem } from './ecs/system/network/NetworkSystem.js'
import { BoundaryCheckSystem } from './ecs/system/physics/BoundaryCheckSystem.js'
import { BoxColliderSystem } from './ecs/system/physics/BoxColliderSystem.js'
import { CapsuleColliderSystem } from './ecs/system/physics/CapsuleColliderSystem.js'
import { DynamicRigidBodySystem } from './ecs/system/physics/DynamicRigidBodySystem.js'
import { GroundedCheckSystem } from './ecs/system/physics/GroundedCheckSystem.js'
import { KinematicRigidBodySystem } from './ecs/system/physics/KinematicRigidBodySystem.js'
import { LockRotationSystem } from './ecs/system/physics/LockRotationSystem.js'
import { PhysicsSystem } from './ecs/system/physics/PhysicsSystem.js'
import { SleepCheckSystem } from './ecs/system/physics/SleepCheckSystem.js'
import { SphereColliderSystem } from './ecs/system/physics/SphereColliderSystem.js'
import { SyncPositionSystem } from './ecs/system/physics/SyncPositionSystem.js'
import { SyncRotationSystem } from './ecs/system/physics/SyncRotationSystem.js'
import { TrimeshColliderSystem } from './ecs/system/physics/TrimeshColliderSystem.js'
import { PlayerComponent } from '../../shared/component/PlayerComponent.js'
import { ZombieSystem } from './ecs/system/ZombieSystem.js'
import { ScriptableSystem } from './ecs/system/ScriptableSystem.js'
import { FollowTargetSystem } from './ecs/system/FollowTargetSystem.js'
import { ProximityPromptSystem } from './ecs/system/events/ProximityPromptEventSystem.js'
import { ConvexHullColliderSystem } from './ecs/system/physics/ConvexHullColliderSystem.js'
import { VehicleSystem } from './ecs/system/VehicleSystem.js'

// TODO: Make it wait for the websocket server to start
const eventSystem = EventSystem.getInstance()
const entityManager = EntityManager.getInstance()
const entities = entityManager.getAllEntities()

// Physics bodies
const kinematicPhysicsBodySystem = new KinematicRigidBodySystem()
const rigidPhysicsBodySystem = new DynamicRigidBodySystem()
// Physics colliders
const trimeshColliderSystem = new TrimeshColliderSystem()
const boxColliderSystem = new BoxColliderSystem()
const capsuleColliderSystem = new CapsuleColliderSystem()
const sphereColliderSystem = new SphereColliderSystem()
const convexHullColliderSystem = new ConvexHullColliderSystem()

const physicsSystem = PhysicsSystem.getInstance()
const groundedCheckSystem = new GroundedCheckSystem()
const lockedRotationSystem = new LockRotationSystem()

const colorEventSystem = new ColorEventSystem()
const singleSizeEventSystem = new SingleSizeEventSystem()
const sizeEventSystem = new SizeEventSystem()
const syncPositionSystem = new SyncPositionSystem()
const syncRotationSystem = new SyncRotationSystem()
const messageEventSystem = new MessageEventSystem()
const destroyEventSystem = new DestroyEventSystem()
const proximityPromptSystem = new ProximityPromptSystem()

const movementSystem = new MovementSystem()
const vehicleSystem = new VehicleSystem()
const networkSystem = new NetworkSystem()

const animationSystem = new AnimationSystem()
const sleepCheckSystem = new SleepCheckSystem()
const randomizeSystem = new RandomizeSystem()
const boundaryCheckSystem = new BoundaryCheckSystem()
const zombieSystem = new ZombieSystem()
const followTargetSystem = new FollowTargetSystem()

new Chat()

const fixedTimestep = 1000 / config.SERVER_TICKRATE
const LAG_THRESHOLD_MS = fixedTimestep * 1.5 // warn if a frame takes 50% longer than expected
const LAG_LOG_INTERVAL_MS = 2000 // avoid spamming — at most one warning every 2s
let lastLagLogTime = 0

let lastFrameTime = Date.now()
let accumulator = 0

function hasPlayers() {
  const player = EntityManager.getFirstEntityWithComponent(entities, PlayerComponent)
  return player !== undefined
}

async function updateGameState(dt: number) {
  destroyEventSystem.update(entities)
  physicsSystem.update(entities)
  boundaryCheckSystem.update(entities)
  ScriptableSystem.update(dt, entities)
  proximityPromptSystem.update(entities, dt)

  // Physics bodies
  kinematicPhysicsBodySystem.update(entities, physicsSystem.world)
  rigidPhysicsBodySystem.update(entities, physicsSystem.world)
  // Physics colliders
  /**
   * Trimesh & Convexhull colliders use a gltf model as a source
   * Waiting for them to be loaded
   * Example : The map has a Trimesh Collider, if we don't wait for it
   * the entities will have a wrong position and not respects script positions
   */
  await trimeshColliderSystem.update(entities, physicsSystem.world)
  await convexHullColliderSystem.update(entities, physicsSystem.world)
  boxColliderSystem.update(entities, physicsSystem.world)
  capsuleColliderSystem.update(entities, physicsSystem.world)
  sphereColliderSystem.update(entities, physicsSystem.world)

  // Other systems
  zombieSystem.update(dt, entities)
  followTargetSystem.update(dt, entities)
  randomizeSystem.update(entities)
  sizeEventSystem.update(entities)
  singleSizeEventSystem.update(entities)
  colorEventSystem.update(entities)

  groundedCheckSystem.update(entities, physicsSystem.world)
  movementSystem.update(dt, entities)
  vehicleSystem.update(entities, physicsSystem.world, dt)

  animationSystem.update(entities)
  syncRotationSystem.update(entities)
  syncPositionSystem.update(entities)

  messageEventSystem.update(entities)
  lockedRotationSystem.update(entities)
  networkSystem.update(entities)
  sleepCheckSystem.update(entities)

  // Finalize events
  destroyEventSystem.afterUpdate(entities)
  eventSystem.afterUpdate(entities)
}

function checkLag(deltaTime: number) {
  if (deltaTime <= LAG_THRESHOLD_MS) return
  const now = Date.now()
  if (now - lastLagLogTime < LAG_LOG_INTERVAL_MS) return
  lastLagLogTime = now
  const catchUpTicks = Math.floor(accumulator / fixedTimestep)
  console.warn(
    `[LAG] Frame took ${deltaTime.toFixed(1)}ms (budget: ${fixedTimestep.toFixed(1)}ms, +${(deltaTime - fixedTimestep).toFixed(1)}ms).` +
      (catchUpTicks > 1 ? ` Catching up ${catchUpTicks} ticks.` : '')
  )
}

function handleNoPlayers() {
  setTimeout(gameLoop, 1000) // Retry after 1 second
  accumulator = 0
}

async function gameLoop() {
  const now = Date.now()
  const deltaTime = now - lastFrameTime
  lastFrameTime = now
  accumulator += deltaTime

  if (!hasPlayers()) {
    handleNoPlayers()
    return
  }

  checkLag(deltaTime)

  while (accumulator >= fixedTimestep) {
    await updateGameState(fixedTimestep)
    accumulator -= fixedTimestep
  }

  // Schedule the next loop iteration
  setTimeout(gameLoop, config.SERVER_TICKRATE / 2)
}

export function startGameLoop() {
  lastFrameTime = Date.now()
  gameLoop()
}
