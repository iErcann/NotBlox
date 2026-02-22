import { InventoryItem } from '@shared/component/InventoryComponent'
import { ClientMessageType } from '@shared/network/client/base'
import { UseItemMessage } from '@shared/network/client/useItemMessage'
import { Game } from '@/game/Game'

/** Maximum number of inventory slots visible in the hotbar row. */
const MAX_VISIBLE_SLOTS = 10

export interface InventoryHudProps {
  items: InventoryItem[]
  maxSlots: number
  gameInstance: Game
}

/**
 * Reusable inventory HUD overlay.
 * Renders a grid of inventory slots and fires a USE_ITEM message when clicked.
 */
export default function InventoryHud({ items, maxSlots, gameInstance }: InventoryHudProps) {
  const handleUseItem = (item: InventoryItem) => {
    const msg: UseItemMessage = {
      t: ClientMessageType.USE_ITEM,
      itemId: item.id,
    }
    gameInstance.websocketManager.send(msg)
  }

  // Build a fixed-size slot array so empty slots render as placeholders
  const slots: (InventoryItem | null)[] = Array.from({ length: maxSlots }, (_, i) => items[i] ?? null)

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
      <div
        className="grid gap-1 bg-black/60 rounded-xl p-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(maxSlots, MAX_VISIBLE_SLOTS)}, minmax(0, 1fr))` }}
      >
        {slots.slice(0, MAX_VISIBLE_SLOTS).map((item, index) => (
          <button
            key={index}
            onClick={() => item && handleUseItem(item)}
            title={item ? `${item.name} (x${item.quantity})` : 'Empty'}
            className={`
              w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs select-none
              transition-colors
              ${item
                ? 'border-gray-400 bg-gray-800/80 hover:bg-gray-600/80 cursor-pointer'
                : 'border-gray-700 bg-gray-900/40 cursor-default'
              }
            `}
          >
            {item ? (
              <>
                <span className="text-lg leading-none">{item.icon ?? '📦'}</span>
                {item.quantity > 1 && (
                  <span className="text-gray-300 font-semibold">{item.quantity}</span>
                )}
              </>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
