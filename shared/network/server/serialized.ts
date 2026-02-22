import { ServerMessage } from './base'
export enum SerializedComponentType {
  NONE = 0,
  POSITION = 1,
  ROTATION = 2,
  SIZE = 3,
  COLOR = 4,
  ENTITY_DESTROYED_EVENT = 5,
  SINGLE_SIZE = 6,

  // Used for animations mostly
  STATE = 7,

  CHAT_LIST = 8,
  MESSAGE = 9,

  SERVER_MESH = 10,
  PROXIMITY_PROMPT = 11,
  TEXT = 12,
  VEHICLE = 13,
  PLAYER = 14,
  VEHICLE_OCCUPANCY = 15,
  COMPONENT_REMOVED_EVENT = 16,
  WHEEL = 17,
  INVISIBLE = 18,
  INVENTORY = 19,
  HEALTH = 20,
  SCORE = 21,
  TEAM = 22,
}

export enum SerializedEntityType {
  NONE = 0,
  PLAYER = 1,
  CUBE = 2,
  WORLD = 3,
  SPHERE = 4,
  CHAT = 5,
  EVENT_QUEUE = 6,
  FLOATING_TEXT = 7,
  VEHICLE = 8,
  ORBITAL_COMPANION = 9,
}

// Movement states
export enum SerializedStateType {
  IDLE = 'Idle',
  WALK = 'Walk',
  RUN = 'Run',
  JUMP = 'Jump',
  FALL = 'Fall',
  DEATH = 'Death',
}

export interface SerializedComponent {
  t?: SerializedComponentType
}

export interface SerializedEntity {
  id: number
  // Type
  t: SerializedEntityType
  // Components
  c: SerializedComponent[]
}

export interface SnapshotMessage extends ServerMessage {
  e: SerializedEntity[]
}

/**
 * Message types for different kinds of chat messages
 */
export enum SerializedMessageType {
  // Chat messages
  GLOBAL_CHAT = 1, // Regular chat message
  TARGETED_CHAT = 2, // Message to specific players

  // Notifications
  GLOBAL_NOTIFICATION = 3, // Global notification at top of screen
  TARGETED_NOTIFICATION = 4, // Message to specific players
}
