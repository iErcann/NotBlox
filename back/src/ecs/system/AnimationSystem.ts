// AnimationSystem.js
import { InputComponent } from '../component/InputComponent.js'
import * as THREE from 'three'
import { Entity } from '@shared/entity/Entity.js'
import { StateComponent } from '@shared/component/StateComponent.js'
import { SerializedStateType } from '@shared/network/server/serialized.js'
import { PositionComponent } from '@shared/component/PositionComponent.js'
import Rapier from '../../physics/rapier.js'
import { GroundCheckComponent } from '../component/GroundedComponent.js'
import { DynamicRigidBodyComponent } from '../component/physics/DynamicRigidBodyComponent.js'
import { CapsuleColliderComponent } from '../component/physics/CapsuleColliderComponent.js'

export class AnimationSystem {
  update(entities: Entity[]): void {
    entities.forEach((entity) => {
      const inputComponent = entity.getComponent(InputComponent)
      const rigidBodyComponent = entity.getComponent(DynamicRigidBodyComponent)
      const positionComponent = entity.getComponent(PositionComponent)
      const colliderComponent = entity.getComponent(CapsuleColliderComponent)
      const stateComponent = entity.getComponent(StateComponent)

      if (
        inputComponent &&
        rigidBodyComponent &&
        positionComponent &&
        colliderComponent &&
        stateComponent
      ) {
        const groundedComponent = entity.getComponent(GroundCheckComponent)
        this.updateState(inputComponent, stateComponent, groundedComponent?.grounded || false)

        if (stateComponent.state !== SerializedStateType.IDLE) {
          const { down, up, left, right } = inputComponent
          const isInputDirectional = down || up || left || right

          if (stateComponent.state !== SerializedStateType.FALL || isInputDirectional) {
            const quaternion = this.calculateRotation(inputComponent)
            this.rotatePlayer(rigidBodyComponent, quaternion)
          }
        }
      }
    })
  }

  isGrounded(
    positionComponent: PositionComponent,
    colliderComponent: CapsuleColliderComponent,
    world: Rapier.World
  ): boolean {
    const ray = new Rapier.Ray(
      {
        x: positionComponent.x,
        y: positionComponent.y - 1,
        z: positionComponent.z,
      },
      {
        x: 0,
        y: -1,
        z: 0,
      }
    )

    const hit = world.castRay(ray, 1, false, undefined, undefined, colliderComponent.collider)
    return hit !== null
  }

  updateState(
    inputComponent: InputComponent,
    stateComponent: StateComponent,
    isGrounded: boolean
  ): void {
    const { up, down, left, right } = inputComponent
    let newState

    if (!isGrounded) {
      newState = SerializedStateType.FALL
    } else if (!up && !down && !left && !right) {
      newState = SerializedStateType.IDLE
    } else {
      newState = SerializedStateType.RUN
    }

    if (newState !== stateComponent.state) {
      stateComponent.state = newState
      stateComponent.updated = true
    }
  }

  calculateRotation(inputComponent: InputComponent): THREE.Quaternion {
    const { up, down, left, right, lookingYAngle } = inputComponent
    let angle = 0

    if (down) angle += Math.PI / 2
    if (up) angle += -Math.PI / 2
    if (right) angle += Math.PI
    // if (left) angle += 0;
    if (up && left) angle += Math.PI / 4
    if (up && right) angle += Math.PI - Math.PI / 4
    if (down && left) angle += -Math.PI / 4
    if (down && right) angle += Math.PI + Math.PI / 4

    return new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle - lookingYAngle
    )
  }

  rotatePlayer(rigidBodyComponent: DynamicRigidBodyComponent, quaternion: THREE.Quaternion): void {
    if (!rigidBodyComponent.body) {
      console.error('AnimationSystem: BodyComponent.body not  initialized')
      return
    }
    rigidBodyComponent.body.setRotation(
      {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w,
      },
      true
    )
  }
}
