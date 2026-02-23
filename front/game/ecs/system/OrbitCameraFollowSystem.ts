import { Camera } from '@/game/Camera'
import { PositionComponent } from '@shared/component/PositionComponent'
import { Entity } from '@shared/entity/Entity'
import CameraControls from 'camera-controls'
import * as THREE from 'three'
import { CameraFollowComponent } from '../component/CameraFollowComponent'
import { InputMessage } from '@shared/network/client/inputMessage'
import { MeshComponent } from '../component/MeshComponent'

export class OrbitCameraFollowSystem {
  cameraControls: CameraControls
  y = 0
  private offset = new THREE.Vector3(0, 1, 0)

  constructor(camera: Camera, renderer: THREE.WebGLRenderer) {
    CameraControls.install({ THREE: THREE })
    this.cameraControls = new CameraControls(camera, renderer.domElement)
    this.initializeCameraControls()
    renderer.domElement.addEventListener('click', this.lockPointer.bind(this))
  }

  private initializeCameraControls(): void {
    this.cameraControls.minDistance = 1
    this.cameraControls.maxDistance = 1000
    this.cameraControls.azimuthRotateSpeed = 0.3 // negative value to invert rotation direction
    this.cameraControls.polarRotateSpeed = 0.2 // negative value to invert rotation direction
    this.cameraControls.minPolarAngle = 30 * THREE.MathUtils.DEG2RAD
    this.cameraControls.maxPolarAngle = 90 * THREE.MathUtils.DEG2RAD
    this.cameraControls.draggingSmoothTime = 1e-10
    this.cameraControls.dollyDragInverted = true

    this.cameraControls.mouseButtons.middle = CameraControls.ACTION.ZOOM
    this.cameraControls.mouseButtons.right = CameraControls.ACTION.ROTATE

    this.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY
    this.cameraControls.touches.three = CameraControls.ACTION.TOUCH_DOLLY
  }

  private lockPointer(): void {
    try {
      this.cameraControls.lockPointer()
    } catch {
      // Canvas may have been removed from the DOM (e.g. during navigation)
    }
  }

  private isDragging(): boolean {
    return this.cameraControls.currentAction === CameraControls.ACTION.OFFSET
  }

  update(dt: number, entities: Entity[], input: InputMessage): void {
    this.cameraControls.update(dt)

    for (const entity of entities) {
      const followComponent = entity.getComponent(CameraFollowComponent)
      if (!followComponent) continue

      const newTargetPosition = this.getTargetPosition(entity)

      if (!newTargetPosition) continue

      this.cameraControls.setFocalOffset(0, 0, 0, true)

      const oldTargetPosition = new THREE.Vector3()
      this.cameraControls.getTarget(oldTargetPosition)

      oldTargetPosition.lerp(newTargetPosition, 0.05)
      this.cameraControls.moveTo(
        oldTargetPosition.x,
        oldTargetPosition.y,
        oldTargetPosition.z,
        true
      )

      this.y = this.calculateAngle(newTargetPosition)
    }
  }

  /**
   * Prefer MeshComponent over PositionComponent
   * MeshComponent holds the visual interpolated position of the entity
   */
  private getTargetPosition(entity: Entity): THREE.Vector3 | null {
    const positionComponent = entity.getComponent(PositionComponent)
    const meshComponent = entity.getComponent(MeshComponent)

    if (meshComponent) {
      return new THREE.Vector3(
        meshComponent.mesh.position.x,
        meshComponent.mesh.position.y + this.offset.y,
        meshComponent.mesh.position.z
      )
    }

    if (positionComponent) {
      return new THREE.Vector3(
        positionComponent.x,
        positionComponent.y + this.offset.y,
        positionComponent.z
      )
    }

    return null
  }

  private calculateAngle(targetPosition: THREE.Vector3): number {
    return Math.atan2(
      this.cameraControls.camera.position.z - targetPosition.z,
      this.cameraControls.camera.position.x - targetPosition.x
    )
  }

  // Add this method to get the camera's azimuth angle
  getCameraAzimuthAngle(): number {
    return this.cameraControls.azimuthAngle
  }
}
