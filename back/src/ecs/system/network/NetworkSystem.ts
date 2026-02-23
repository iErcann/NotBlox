import { Packr } from 'msgpackr'
import { Entity } from '@shared/entity/Entity.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { ServerMessage, ServerMessageType } from '@shared/network/server/base.js'
import { SerializedEntity } from '@shared/network/server/serialized.js'
import { WebSocketComponent } from '../../component/WebsocketComponent.js'
import { WebsocketSystem } from './WebsocketSystem.js'
import pako from 'pako'

export class NetworkSystem {
  //  Serializes the given entities.
  private static packr = new Packr({})
  private websocketSystem = new WebsocketSystem()
  private serialize(entities: Entity[], serializeAll: boolean): SerializedEntity[] {
    const serializedEntities: SerializedEntity[] = []

    for (const entity of entities) {
      const networkDataComponent = entity.getComponent(NetworkDataComponent)
      if (networkDataComponent) {
        const _serializedEntities = networkDataComponent.serialize(serializeAll)
        // Skip entities without any components to reduce bandwidth
        if (_serializedEntities != null) {
          serializedEntities.push(_serializedEntities)
        }
      }
    }
    return serializedEntities
  }

  static compress<T extends ServerMessage>(message: T): Uint8Array {
    const msgpackrCompressed = NetworkSystem.packr.pack(message)
    return pako.deflate(msgpackrCompressed)
  }

  // Builds a snapshot message to send to the clients.
  private buildSnapshotMessage(serializedEntities: SerializedEntity[]) {
    return NetworkSystem.compress({
      t: ServerMessageType.SNAPSHOT,
      e: serializedEntities,
    })
  }

  // Updates the network state and sends snapshots to clients.
  update(entities: Entity[]): void {
    // 1. Handle new clients that need full snapshots
    let fullSnapshotMessage: Uint8Array | undefined
    // 2. Get all entities with WebSocketComponent that need a full snapshot
    const newClients = entities.filter((entity) => {
      const websocketComponent = entity.getComponent(WebSocketComponent)
      return websocketComponent && !websocketComponent.isFirstSnapshotSent
    })

    // 3. Only build the full snapshot if there are new clients
    if (newClients.length > 0) {
      fullSnapshotMessage = this.buildSnapshotMessage(this.serialize(entities, true))

      // 4. Send to all new clients
      for (const entity of newClients) {
        const websocketComponent = entity.getComponent(WebSocketComponent)
        if (!websocketComponent) {
          console.error('Websocket not found', websocketComponent)
          continue
        }
        if (!websocketComponent.ws) {
          console.error('Websocket not found', websocketComponent)
          continue
        }
        websocketComponent.ws.send(fullSnapshotMessage, true)
        websocketComponent.isFirstSnapshotSent = true
      }
    }

    // 5. Send delta snapshots to all clients
    const serializedEntities = this.serialize(entities, false)
    const snapshotMessage = this.buildSnapshotMessage(serializedEntities)
    this.broadcast(entities, snapshotMessage)
  }

  // Broadcasts a message to all connected clients.
  private broadcast(entities: Entity[], message: any): void {
    for (const entity of entities) {
      const websocketComponent = entity.getComponent(WebSocketComponent)
      if (websocketComponent) {
        if (!websocketComponent.ws) {
          console.error('Websocket not found', websocketComponent)
        } else {
          websocketComponent.ws.send(message, true)
        }
      }
    }
  }
}
