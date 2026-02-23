import { Component } from '@shared/component/Component.js'

export class InputComponent extends Component {
  up: boolean = false
  down: boolean = false
  left: boolean = false
  right: boolean = false
  space: boolean = false
  lookingYAngle = 0
  interact: boolean = false
}
