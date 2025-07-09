process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config()

// Get Discord webhook URL from environment variables
const webhookUrl = process.env.DISCORD_WEBHOOK_URL
if (!webhookUrl) {
  console.error('Error: DISCORD_WEBHOOK_URL environment variable is not set')
  process.exit(1)
}

const dockerGateway = process.env.DOCKER_GATEWAY || 'https://172.17.0.1'
// URLs to monitor (can be multiple game servers)
const serversToMonitor = [
  { name: '🟢 Default Test Server', url: `${dockerGateway}:8001/health` },
  { name: '🔵 Obby Parkour', url: `${dockerGateway}:8002/health` },
  { name: '⚽ Football', url: `${dockerGateway}:8003/health` },
  { name: '🐶 Pet Simulator', url: `${dockerGateway}:8004/health` },
]

// Check interval in milliseconds (default: 10 seconds)
const CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL) || 10000

// Track server state to detect changes
interface ServerState {
  isUp: boolean
  lastChecked: Date
  players: string[]
  lastNotified: {
    downtime?: Date
    uptime?: Date
  }
  firstCheck: boolean
  processedMessageIds: Set<string> // Track processed message IDs
}

// Message queue for batching Discord messages
const messageQueue: string[] = []
let isProcessingQueue = false

// Initialize state tracking for each server
const serverStates: Record<string, ServerState> = {}

// Initialize server states
serversToMonitor.forEach((server) => {
  serverStates[server.name] = {
    isUp: false,
    lastChecked: new Date(),
    players: [],
    lastNotified: {},
    firstCheck: true,
    processedMessageIds: new Set<string>(),
  }
})

// Function to send a message to Discord webhook
async function sendToDiscord(message: string): Promise<void> {
  // Add message to queue
  messageQueue.push(message)
}
function sanitizeDiscordInput(name: string): string {
  return name
    .replace(/@everyone/g, '@\u200Beveryone')
    .replace(/@here/g, '@\u200Bhere')
    .replace(/@/g, '@\u200B') // escape other @
    .replace(/([_*~`>|])/g, '\\$1'); // escape markdown
}
// Function to process the message queue and send batched messages
async function processMessageQueue(): Promise<void> {
  // If queue is empty or already processing, do nothing
  if (messageQueue.length === 0 || isProcessingQueue) return

  let messagesToSend: string[] = []

  try {
    isProcessingQueue = true

    // Copy the current queue and clear it
    messagesToSend = [...messageQueue]
    messageQueue.length = 0

    // Combine messages into a single batch content
    const content = messagesToSend.join('\n')
    console.log(`Sending batch of ${messagesToSend.length} messages to Discord`)


    console.log('SENDING', content)
    if (!webhookUrl) {
      console.error('Error: DISCORD_WEBHOOK_URL environment variable is not set')
      process.exit(1)
    }
    const embed = {
      title: 'NotBlox',
      description: sanitizeDiscordInput(content),
      color: 0x00ff00, 
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    })
  } catch (error) {
    console.error('Error sending batched messages to Discord:', error)

    // If sending fails, put messages back in queue
    if (messagesToSend.length > 0) {
      if (messageQueue.length > 0) {
        messageQueue.unshift(...messagesToSend)
      } else {
        messageQueue.push(...messagesToSend)
      }
    }

    // Try again after a delay
    if (messageQueue.length > 0) {
      setTimeout(async () => {
        await processMessageQueue()
      }, 1000) // 1 second delay
    }
  } finally {
    isProcessingQueue = false
  }
}

// Function to check a server's health
async function checkServerHealth(server: { name: string; url: string }): Promise<void> {
  const state = serverStates[server.name]
  const now = new Date()

  try {
    // Fetch health data
    const response = await fetch(server.url)
    const healthData = await response.json()

    // Server is up
    const wasDown = !state.isUp
    state.isUp = true
    state.lastChecked = now

    // Check if server just came back online (but not on first check)
    if (
      wasDown &&
      !state.firstCheck &&
      (!state.lastNotified.uptime || now.getTime() - state.lastNotified.uptime.getTime() > 3600000)
    ) {
      console.log(`${server.name} was down, now back online.`)
      // Notify once per hour
      await sendToDiscord(
        `🟢 **${server.name}** is back online! Uptime: ${formatUptime(healthData.uptime)}`
      )
      state.lastNotified.uptime = now
    }

    // After first successful check, set firstCheck to false
    if (state.firstCheck) {
      state.firstCheck = false
    }

    // Check for player changes
    const currentPlayers = healthData.players || []

    // Update player list
    state.players = currentPlayers

    // Check for new messages
    if (healthData.messages) {
      // Check each message category
      for (const category of ['globalChat', 'globalNotification'] as const) {
        const messages = healthData.messages[category] || []
        if (messages.length > 0) {
          // Process each message individually
          for (const message of messages) {
            // Create a unique ID for this message
            const messageId = `${message.timestamp}-${message.author}-${message.content.substring(
              0,
              10
            )}`

            // Only process messages we haven't seen before
            if (!state.processedMessageIds.has(messageId)) {
              // Mark this message as processed
              state.processedMessageIds.add(messageId)

              console.log(
                `New message in category ${category} for ${server.name}:`,
                message.content
              )

              // Only report global chat messages and notifications
              await sendToDiscord(`[${server.name}] **${message.author}**: ${message.content}`)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking health for ${server.name}:`, error)
    // Server is down or unreachable
    const wasUp = state.isUp
    state.isUp = false
    state.lastChecked = now

    // Only notify if the server just went down and we haven't notified recently
    if (
      wasUp &&
      (!state.lastNotified.downtime ||
        now.getTime() - state.lastNotified.downtime.getTime() > 900000)
    ) {
      console.log(`${server.name} was up, now appears to be down.`)
      // Notify once per 15 minutes
      await sendToDiscord(
        `🔴 **${server.name}** appears to be down! Last checked: ${now.toLocaleString()}`
      )
      state.lastNotified.downtime = now
    }
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

// Main function to check all servers
async function checkAllServers(): Promise<void> {
  for (const server of serversToMonitor) {
    console.log(`Checking ${server.name}...`)
    try {
      await checkServerHealth(server)
    } catch (error) {
      console.error(`Error checking ${server.name}:`, error)
    }
  }

  // Process message queue after checking all servers
  await processMessageQueue()
}

// Initial check
checkAllServers()

// Schedule regular checks
setInterval(checkAllServers, CHECK_INTERVAL)

console.log(
  `Server monitoring started. Checking ${serversToMonitor.length} servers every ${
    CHECK_INTERVAL / 1000
  } seconds.`
)
