import { SerializedComponent, SerializedComponentType } from '../network/server/serialized.js'
import { NetworkComponent } from '../network/NetworkComponent.js'

export interface InventoryItem {
  /** Unique item type identifier (e.g. 'sword', 'health_potion') */
  id: string
  /** Display name */
  name: string
  /** Stack size */
  quantity: number
  /** Optional icon URL or emoji */
  icon?: string
  /** Arbitrary game-specific data */
  metadata?: Record<string, unknown>
}

/**
 * Reusable inventory component – attach to any entity that needs to hold items.
 * Works for players, chests, NPCs, etc.
 */
export class InventoryComponent extends NetworkComponent {
  constructor(
    entityId: number,
    public items: InventoryItem[] = [],
    public maxSlots: number = 20
  ) {
    super(entityId, SerializedComponentType.INVENTORY)
  }

  /** Add or stack an item. Returns false when inventory is full. */
  addItem(item: InventoryItem): boolean {
    const existing = this.items.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity += item.quantity
      this.updated = true
      return true
    }
    if (this.items.length >= this.maxSlots) return false
    this.items.push({ ...item })
    this.updated = true
    return true
  }

  /** Remove `quantity` of an item. Returns false when item not found or quantity insufficient. */
  removeItem(itemId: string, quantity: number = 1): boolean {
    const index = this.items.findIndex((i) => i.id === itemId)
    if (index === -1) return false
    if (this.items[index].quantity < quantity) return false
    this.items[index].quantity -= quantity
    if (this.items[index].quantity <= 0) {
      this.items.splice(index, 1)
    }
    this.updated = true
    return true
  }

  /** Check whether the inventory contains at least `quantity` of an item. */
  hasItem(itemId: string, quantity: number = 1): boolean {
    const item = this.items.find((i) => i.id === itemId)
    return item !== undefined && item.quantity >= quantity
  }

  serialize(): SerializedInventoryComponent {
    return {
      items: this.items.map((i) => ({ ...i })),
      maxSlots: this.maxSlots,
    }
  }

  deserialize(data: SerializedInventoryComponent): void {
    this.items = data.items ?? []
    this.maxSlots = data.maxSlots ?? 20
  }
}

export interface SerializedInventoryComponent extends SerializedComponent {
  items: InventoryItem[]
  maxSlots: number
}

/** Convenience type used by HUD state in the frontend. */
export interface InventoryState {
  items: InventoryItem[]
  maxSlots: number
}
