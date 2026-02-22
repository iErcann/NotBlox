import { ClientMessage } from './base.js'

/**
 * Sent by the client when a player uses an item from their inventory.
 */
export interface UseItemMessage extends ClientMessage {
  /** The item type id to use (matches InventoryItem.id) */
  itemId: string
}
