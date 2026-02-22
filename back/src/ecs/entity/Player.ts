import { PositionComponent } from '@shared/component/PositionComponent.js'
import { RotationComponent } from '@shared/component/RotationComponent.js'
import { SingleSizeComponent } from '@shared/component/SingleSizeComponent.js'
import { StateComponent } from '@shared/component/StateComponent.js'
import { Entity } from '@shared/entity/Entity.js'
import { EntityManager } from '@shared/system/EntityManager.js'
import { SerializedEntityType, SerializedStateType } from '@shared/network/server/serialized.js'
import { GroundCheckComponent } from '../component/GroundedComponent.js'
import { InputComponent } from '../component/InputComponent.js'
import { NetworkDataComponent } from '@shared/network/NetworkDataComponent.js'
import { WebSocketComponent } from '../component/WebsocketComponent.js'
import { PlayerComponent } from '@shared/component/PlayerComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { LockedRotationComponent } from '../component/LockedRotationComponent.js'
import { CapsuleColliderComponent } from '../component/physics/CapsuleColliderComponent.js'
import { ColorComponent } from '@shared/component/ColorComponent.js'
import { ServerMeshComponent } from '@shared/component/ServerMeshComponent.js'
import { TextComponent } from '@shared/component/TextComponent.js'
import { PhysicsPropertiesComponent } from '../component/physics/PhysicsPropertiesComponent.js'

export class Player {
  entity: Entity

  constructor(ws: WebSocket, initialX: number, initialY: number, initialZ: number) {
    this.entity = EntityManager.createEntity(SerializedEntityType.PLAYER)
    // Tag
    const playerComponent = new PlayerComponent(this.entity.id)
    this.entity.addComponent(playerComponent)

    const positionComponent = new PositionComponent(this.entity.id, initialX, initialY, initialZ)
    this.entity.addComponent(positionComponent)

    const rotationComponent = new RotationComponent(this.entity.id, 0, 1, 2)
    this.entity.addComponent(rotationComponent)

    const sizeComponent = new SingleSizeComponent(this.entity.id, 1.5 + Math.random())
    this.entity.addComponent(sizeComponent)

    // Player name text on top of the head with offset
    const textComponent = new TextComponent(
      this.entity.id,
      'Player ' + this.entity.id,
      0,
      2,
      0,
      250
    )
    this.entity.addComponent(textComponent)

    this.entity.addComponent(new WebSocketComponent(this.entity.id, ws))

    // Components used for rendering by the client
    const colorComponent = new ColorComponent(this.entity.id, `#FFFFFF`)
    this.entity.addComponent(colorComponent)

    const stateComponent = new StateComponent(this.entity.id, SerializedStateType.IDLE)
    this.entity.addComponent(stateComponent)

    const serverMeshComponent = new ServerMeshComponent(
      this.entity.id,
      'https://notbloxo.fra1.cdn.digitaloceanspaces.com/Notblox-Assets/character/Character.glb'
    )
    this.entity.addComponent(serverMeshComponent)

    // Hold input data
    this.entity.addComponent(new InputComponent(this.entity.id))

    // Physics
    this.entity.addComponent(
      new PhysicsPropertiesComponent(this.entity.id, {
        enableCcd: true,
        angularDamping: 1.5,
        mass: 5,
      })
    )
    this.entity.addComponent(new GroundCheckComponent(this.entity.id))
    this.entity.addComponent(new DynamicRigidBodyComponent(this.entity.id))
    this.entity.addComponent(new LockedRotationComponent(this.entity.id))
    this.entity.addComponent(new CapsuleColliderComponent(this.entity.id))

    // Network
    const networkDataComponent = new NetworkDataComponent(this.entity.id, this.entity.type, [
      positionComponent,
      rotationComponent,
      sizeComponent,
      colorComponent,
      stateComponent,
      serverMeshComponent,
      textComponent,
      playerComponent,
    ])

    this.entity.addComponent(networkDataComponent)
  }
}
