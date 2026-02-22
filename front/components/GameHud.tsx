/* eslint-disable react/jsx-no-undef */
import { useEffect, useRef, useState } from 'react'
import { Joystick } from 'react-joystick-component'
import { Game } from '@/game/Game'
import Link from 'next/link'
import { SerializedMessageType } from '@shared/network/server/serialized'
import { MessageComponent } from '@shared/component/MessageComponent'
import { InventoryState } from '@shared/component/InventoryComponent'
import { Maximize } from 'lucide-react'
import { MicroGameCard } from './GameCard'
import { GameInfo } from '@/types'
import gameData from '../public/gameData.json'
import InventoryHud from './InventoryHud'

export interface GameHudProps {
  messages: MessageComponent[]
  sendMessage: (message: string) => void
  gameInstance: Game
  /** Optional inventory state – rendered only when items are present */
  inventory?: InventoryState
}

export default function GameHud({
  messages: messageComponents,
  sendMessage,
  gameInstance,
  inventory,
}: GameHudProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refContainer = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<
    Array<{ id: number; content: string; author: string; timestamp: number }>
  >([])
  const processedMessagesRef = useRef<Set<number>>(new Set())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageComponents])

  // Handle notifications from chat messages
  useEffect(() => {
    if (!messageComponents || messageComponents.length === 0) return

    // Process new messages for notifications
    messageComponents.forEach((messageComponent, index) => {
      const messageType = messageComponent.messageType
      const messageId = messageComponent.timestamp

      // Skip if we've already processed this message
      if (processedMessagesRef.current.has(messageId)) {
        return
      }

      // Only process global notifications
      // Check if the message is a notification type
      if (
        messageType === SerializedMessageType.GLOBAL_NOTIFICATION ||
        (messageType === SerializedMessageType.TARGETED_NOTIFICATION &&
          gameInstance?.currentPlayerEntityId &&
          messageComponent.targetPlayerIds?.includes(gameInstance?.currentPlayerEntityId))
      ) {
        // Mark as processed
        processedMessagesRef.current.add(messageId)

        // Add new notification
        const newNotification = {
          id: Date.now() + index, // Unique ID
          content: messageComponent.content,
          author: messageComponent.author,
          timestamp: Date.now(),
        }

        // Only show one at a time for now
        setNotifications([newNotification])

        // Remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
        }, 5000)
      }
    })
  }, [messageComponents, gameInstance?.currentPlayerEntityId])

  const handleFullscreenClick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  // Filter messages based on type and target
  const getFilteredMessages = () => {
    if (!messageComponents || messageComponents.length === 0) return []

    return messageComponents.filter((message) => {
      const messageType = message.messageType
      const targetPlayerIds = message.targetPlayerIds || []
      // Show global chat messages
      if (messageType === SerializedMessageType.GLOBAL_CHAT) return true

      // Show targeted chat messages if player is in target list
      if (
        messageType === SerializedMessageType.TARGETED_CHAT &&
        gameInstance?.currentPlayerEntityId
      ) {
        return targetPlayerIds.includes(gameInstance?.currentPlayerEntityId)
      }

      // Don't show notifications in chat
      if (
        messageType === SerializedMessageType.GLOBAL_NOTIFICATION ||
        messageType === SerializedMessageType.TARGETED_NOTIFICATION
      ) {
        return false
      }

      return true
    })
  }

  // Add CSS for animations

  return (
    <div
      id="hud"
      className="fixed inset-0 bg-gray-800 bg-opacity-0 text-white p-4 z-50 pointer-events-none"
      ref={refContainer}
    >
      {/* Global Notifications */}
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-black/60 text-white w-full max-w-sm p-3 rounded-lg shadow-xl text-center transition-opacity duration-500"
            style={{
              animation: 'bounceIn 0.4s ease-out, fadeOut 0.6s ease 4s forwards',
              transformOrigin: 'top center',
            }}
          >
            <div className="flex flex-col items-center">
              <p className="font-semibold font-sans text-yellow-400 text-lg sm:text-xl">
                {notification.author}
              </p>
              <p className="text-white text-base sm:text-lg">{notification.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <div className="shadow-4xl p-4 rounded-lg space-y-1 bg-gray-800 bg-opacity-20">
          <p className="text-sm">👋 Welcome to </p>
          <a
            className="text-sm md:text-2xl font-bold pointer-events-auto hover:text-gray-400"
            href="/"
          >
            NotBlox<span className="font-medium">.online</span>
          </a>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
            <Link
              href="https://discord.gg/kPhgtj49U2"
              target="_blank"
              className="flex items-center justify-center mt-2 gap-2 px-3 py-1 w-full bg-transparent border border-b-2 hover:bg-blue-900/30 rounded-md transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 512"
                className="h-5 w-5 text-white fill-white"
              >
                <path d="M524.5 69.8a1.5 1.5 0 0 0 -.8-.7A485.1 485.1 0 0 0 404.1 32a1.8 1.8 0 0 0 -1.9 .9 337.5 337.5 0 0 0 -14.9 30.6 447.8 447.8 0 0 0 -134.4 0 309.5 309.5 0 0 0 -15.1-30.6 1.9 1.9 0 0 0 -1.9-.9A483.7 483.7 0 0 0 116.1 69.1a1.7 1.7 0 0 0 -.8 .7C39.1 183.7 18.2 294.7 28.4 404.4a2 2 0 0 0 .8 1.4A487.7 487.7 0 0 0 176 479.9a1.9 1.9 0 0 0 2.1-.7A348.2 348.2 0 0 0 208.1 430.4a1.9 1.9 0 0 0 -1-2.6 321.2 321.2 0 0 1 -45.9-21.9 1.9 1.9 0 0 1 -.2-3.1c3.1-2.3 6.2-4.7 9.1-7.1a1.8 1.8 0 0 1 1.9-.3c96.2 43.9 200.4 43.9 295.5 0a1.8 1.8 0 0 1 1.9 .2c2.9 2.4 6 4.9 9.1 7.2a1.9 1.9 0 0 1 -.2 3.1 301.4 301.4 0 0 1 -45.9 21.8 1.9 1.9 0 0 0 -1 2.6 391.1 391.1 0 0 0 30 48.8 1.9 1.9 0 0 0 2.1 .7A486 486 0 0 0 610.7 405.7a1.9 1.9 0 0 0 .8-1.4C623.7 277.6 590.9 167.5 524.5 69.8zM222.5 337.6c-29 0-52.8-26.6-52.8-59.2S193.1 219.1 222.5 219.1c29.7 0 53.3 26.8 52.8 59.2C275.3 311 251.9 337.6 222.5 337.6zm195.4 0c-29 0-52.8-26.6-52.8-59.2S388.4 219.1 417.9 219.1c29.7 0 53.3 26.8 52.8 59.2C470.7 311 447.5 337.6 417.9 337.6z" />
              </svg>
              <span className="font-medium">Join Discord</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-black bg-opacity-20 rounded-xl p-4 z-50 hidden lg:flex flex-col w-[360px] pointer-events-auto space-y-2">
        {/* Other games cards mini section */}
        <div className="grid grid-cols-4 gap-3">
          {gameData.slice(0, 4).map((game: GameInfo) => (
            <MicroGameCard
              key={game.slug}
              title={game.title}
              imageUrl={game.imageUrl}
              slug={game.slug}
            />
          ))}
        </div>

        <div className="overflow-y-auto max-h-64 h-64 space-y-2 pr-2">
          {getFilteredMessages().map((messageComponent, index) => {
            return (
              <div
                key={index}
                ref={index === getFilteredMessages().length - 1 ? messagesEndRef : null}
              >
                <div
                  className={`rounded-lg p-2 ${
                    messageComponent.messageType === SerializedMessageType.TARGETED_CHAT
                      ? 'bg-gray-900 bg-opacity-40 p-2'
                      : 'bg-gray-700 bg-opacity-30'
                  }`}
                >
                  <p className="text-sm break-words">
                    <span
                      className={`font-medium ${
                        messageComponent.messageType === SerializedMessageType.TARGETED_CHAT
                          ? 'text-gray-1000'
                          : ''
                      }`}
                    >
                      {messageComponent.author}
                    </span>
                    : {messageComponent.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <input
          type="text"
          placeholder="Type your message..."
          className="p-2 bg-gray-700 bg-opacity-30 text-white rounded-lg"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              sendMessage(e.currentTarget.value)
              e.currentTarget.value = ''
              e.currentTarget.blur() // Remove focus from the input
            }
          }}
        />
      </div>

      <div className="flex lg:hidden pointer-events-auto">
        <div className="absolute top-2 right-2">
          <button onClick={handleFullscreenClick} className="text-white hover:text-gray-300">
            <Maximize className="size-16" />
          </button>
        </div>
        <div className="absolute bottom-12 left-12">
          <Joystick
            size={100}
            baseColor="rgba(255, 255, 255, 0.5)"
            stickColor="rgba(255, 255, 255, 0.2)"
            move={(props) => gameInstance?.inputManager.handleJoystickMove(props)}
            stop={(props) => gameInstance?.inputManager.handleJoystickStop(props)}
          />
        </div>
        <div className="absolute bottom-12 right-12">
          <button
            className="bg-gray-500 bg-opacity-20 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-transform transform hover:bg-gray-600 hover:bg-opacity-100 focus:bg-green-600 focus:bg-opacity-100 focus:outline-none active:translate-y-1 w-24 h-24 flex items-center justify-center"
            onTouchStart={() => gameInstance && (gameInstance.inputManager.inputState.s = true)}
            onMouseDown={() => gameInstance && (gameInstance.inputManager.inputState.s = true)}
            onTouchEnd={() => gameInstance && (gameInstance.inputManager.inputState.s = false)}
            onMouseOut={() => gameInstance && (gameInstance.inputManager.inputState.s = false)}
          >
            <span className="pointer-events-none">Jump</span>
          </button>
        </div>
      </div>

      {/* Inventory HUD – only shown when the player has items */}
      {inventory && inventory.items.length > 0 && (
        <InventoryHud
          items={inventory.items}
          maxSlots={inventory.maxSlots}
          gameInstance={gameInstance}
        />
      )}
    </div>
  )
}
