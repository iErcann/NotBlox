import { Game } from '@/game/Game'
import { Entity } from '@shared/entity/Entity'
import { Cube } from '../entity/Cube'
import { Player } from '../entity/Player'
import { Sphere } from '../entity/Sphere'
import { Chat } from '../entity/Chat'
import { FloatingText } from '../entity/FloatingText'
import { InvisibleComponent } from '../../../../shared/component/InvisibleComponent.js'

import {
  SerializedComponent,
  SerializedComponentType,
  SerializedEntity,
  SerializedEntityType,
  SerializedStateType,
  SnapshotMessage,
} from '@shared/network/server/serialized'

import { MessageListComponent } from '@shared/component/MessageComponent'
import { ColorComponent } from '@shared/component/ColorComponent'
import { HealthComponent } from '@shared/component/HealthComponent'
import { InventoryComponent } from '@shared/component/InventoryComponent'
import { PositionComponent } from '@shared/component/PositionComponent'
import { RotationComponent } from '@shared/component/RotationComponent'
import { ScoreComponent } from '@shared/component/ScoreComponent'
import { SingleSizeComponent } from '@shared/component/SingleSizeComponent'
import { SizeComponent } from '@shared/component/SizeComponent'
import { StateComponent } from '@shared/component/StateComponent'
import { TeamComponent } from '@shared/component/TeamComponent'
import { EntityDestroyedEvent } from '@shared/component/events/EntityDestroyedEvent'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent'
import { ProximityPromptComponent } from '@shared/component/ProximityPromptComponent'
import { TextComponent } from '@shared/component/TextComponent'
import { VehicleComponent } from '@shared/component/VehicleComponent'
import { PlayerComponent } from '@shared/component/PlayerComponent'
import { VehicleOccupancyComponent } from '@shared/component/VehicleOccupancyComponent'

import { NetworkComponent } from '@shared/network/NetworkComponent'
import { EventSystem } from '@shared/system/EventSystem'
import { EntityManager } from '@shared/system/EntityManager'
import { SerializableComponentRemovedEvent } from '@shared/component/events/ComponentRemovedEvent'
import { ComponentConstructor } from '@shared/component/Component'

export class SyncComponentsSystem {
  private snapshotMessages: SnapshotMessage[] = []
  constructor(public game: Game) {}
  addSnapshotMessage(snapshotMessage: SnapshotMessage) {
    this.snapshotMessages.push(snapshotMessage)
  }
  handleEventEntity(serializedEventQueueEntity: SerializedEntity) {
    const eventEntity = EventSystem.getInstance().eventQueue.entity

    for (const serializedComponent of serializedEventQueueEntity.c) {
      const eventComponent = this.createComponent(serializedComponent, eventEntity.id)
      if (!eventComponent) {
        console.error(
          "Can't create event component, add it to createComponent",
          serializedComponent
        )
        continue
      }
      EventSystem.addEvent(eventComponent)
    }
  }
  update(entities: Entity[]) {
    for (const [index, snapshotMessage] of this.snapshotMessages.entries()) {
      const serializedEntities = snapshotMessage.e
      for (const serializedEntity of serializedEntities) {
        // The EventQueue entity already exist on the client (EventSystem instance constructor creates it), we don't need to create it
        // We need to handle the events by adding them to the EventQueue entity on the EventSystem instance
        if (serializedEntity.t === SerializedEntityType.EVENT_QUEUE) {
          this.handleEventEntity(serializedEntity)
          continue
        }

        let entity = entities.find((entity) => entity.id === serializedEntity.id)

        if (!entity) {
          entity = this.createEntity(serializedEntity)
          if (!entity) {
            console.error("Can't create entity, add it to createEntity")
            return
          }
        }

        for (const serializedComponent of serializedEntity.c) {
          this.updateOrCreateComponent(entity, serializedComponent)
        }
      }
      // Remove the processed snapshotMessage from the array
      this.snapshotMessages.splice(index, 1)
    }
    this.catchRemoveComponentEvent(entities)
  }

  updateOrCreateComponent(entity: Entity, serializedComponent: SerializedComponent) {
    // Find the replicated components
    const component = entity.getNetworkComponentBySerializedType(serializedComponent.t!)

    if (component) {
      // If the NetworkComponent exists, we update it
      const networkComponent = component as NetworkComponent
      networkComponent.deserialize(serializedComponent)
      networkComponent.updated = true
    } else {
      // If the NetworkComponent doesn't exist, create it
      const newComponent = this.createComponent(serializedComponent, entity.id)
      if (newComponent) {
        // Reminder : This will create a ComponentAddedEvent<T>
        entity.addComponent(newComponent)
      } else {
        console.error(
          `Can't create received NetworkComponent of type ${serializedComponent.t}, add it to the createComponent function.`
        )
      }
    }
  }

  createEntity(serializedEntity: SerializedEntity): Entity | undefined {
    let newEntity: Entity | undefined

    switch (serializedEntity.t) {
      case SerializedEntityType.PLAYER:
        const player = new Player(serializedEntity.id)
        newEntity = player.entity
        break
      case SerializedEntityType.CUBE:
        const cube = new Cube(serializedEntity.id)
        newEntity = cube.entity
        break
      case SerializedEntityType.SPHERE:
        const sphere = new Sphere(serializedEntity.id)
        newEntity = sphere.entity
        break
      case SerializedEntityType.CHAT:
        newEntity = new Chat(serializedEntity.id).entity
        break
      case SerializedEntityType.FLOATING_TEXT:
        newEntity = new FloatingText(serializedEntity.id).entity
        break
      case SerializedEntityType.EVENT_QUEUE:
        newEntity = EventSystem.getInstance().eventQueue.entity
        break
      case SerializedEntityType.VEHICLE:
        newEntity = EntityManager.createEntity(serializedEntity.t, serializedEntity.id)
        break
      default:
        newEntity = EntityManager.createEntity(serializedEntity.t, serializedEntity.id)
        console.log('Unknown entity type, fallbacking to default entity', serializedEntity.t)
        break
    }
    console.log('newEntity', newEntity)

    return newEntity
  }

  createComponent(
    serializedComponent: SerializedComponent,
    entityId: number
  ): NetworkComponent | undefined {
    let component: NetworkComponent | undefined

    switch (serializedComponent.t) {
      case SerializedComponentType.POSITION:
        component = new PositionComponent(entityId, 1, 1, 1)
        break
      case SerializedComponentType.ROTATION:
        component = new RotationComponent(entityId, 1, 1, 1, 1)
        break
      case SerializedComponentType.SIZE:
        component = new SizeComponent(entityId, 1, 1, 1)
        break
      case SerializedComponentType.ENTITY_DESTROYED_EVENT:
        component = new EntityDestroyedEvent(entityId)
        break
      case SerializedComponentType.COLOR:
        component = new ColorComponent(entityId, '0xffffff')
        break
      case SerializedComponentType.SINGLE_SIZE:
        component = new SingleSizeComponent(entityId, 0)
        break
      case SerializedComponentType.STATE:
        component = new StateComponent(entityId, SerializedStateType.IDLE)
        break
      case SerializedComponentType.CHAT_LIST:
        component = new MessageListComponent(entityId, [])
        break
      case SerializedComponentType.SERVER_MESH:
        component = new ServerMeshComponent(entityId, '')
        break
      case SerializedComponentType.PROXIMITY_PROMPT:
        component = new ProximityPromptComponent(entityId, {
          onInteract: () => {},
        })
        break
      case SerializedComponentType.TEXT:
        component = new TextComponent(entityId, '', 0, 0, 0)
        break
      case SerializedComponentType.VEHICLE:
        component = new VehicleComponent(entityId, [])
        break
      case SerializedComponentType.PLAYER:
        component = new PlayerComponent(entityId)
        break
      case SerializedComponentType.VEHICLE_OCCUPANCY:
        component = new VehicleOccupancyComponent(entityId, 0)
        break
      case SerializedComponentType.COMPONENT_REMOVED_EVENT:
        component = new SerializableComponentRemovedEvent(entityId, serializedComponent.t)
        break
      case SerializedComponentType.INVISIBLE:
        component = new InvisibleComponent(entityId)
        break
      case SerializedComponentType.HEALTH:
        component = new HealthComponent(entityId)
        break
      case SerializedComponentType.INVENTORY:
        component = new InventoryComponent(entityId)
        break
      case SerializedComponentType.SCORE:
        component = new ScoreComponent(entityId)
        break
      case SerializedComponentType.TEAM:
        component = new TeamComponent(entityId)
        break
      default:
        console.error("Unknown component type, can't create component")
    }
    // Default values will be overwritten by the serialized values
    component?.deserialize(serializedComponent)
    return component
  }

  // Catch all the serialized component removed events and remove the component from the entity
  catchRemoveComponentEvent(entities: Entity[]) {
    const removedComponent = EventSystem.getEvents(SerializableComponentRemovedEvent)
    for (const componentRemovedEvent of removedComponent) {
      const entity = EntityManager.getEntityById(entities, componentRemovedEvent.entityId)
      if (entity) {
        const componentType = componentRemovedEvent.removedComponentType
        const component = entity.getNetworkComponentBySerializedType(componentType)
        if (component) {
          entity.removeComponent(component.constructor as ComponentConstructor)
        }
      }
    }
  }
}
