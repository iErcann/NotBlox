import { Entity } from '@shared/entity/Entity.js'
import { InputMessage } from '@shared/network/client/inputMessage.js'
import { InputComponent } from '../component/InputComponent'

export class InputProcessingSystem {
  constructor() {}

  receiveInputPacket(playerEntity: Entity, inputMessage: InputMessage) {
    let inputComponent = playerEntity.getComponent(InputComponent)

    if (!inputComponent) {
      inputComponent = new InputComponent(playerEntity.id)
      playerEntity.addComponent(inputComponent)
    }

    // Update the InputComponent based on the received packet
    inputComponent.down = inputMessage.d
    inputComponent.up = inputMessage.u
    inputComponent.left = inputMessage.l
    inputComponent.right = inputMessage.r
    inputComponent.space = inputMessage.s
    inputComponent.lookingYAngle = inputMessage.y
    inputComponent.interact = inputMessage.i
  }
}
