/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entity } from '@shared/entity/Entity'

export class ScriptableSystem {
  // Static function that can be overridden by a script
  public static update: (dt: number, entities: Entity[]) => void = (
    dt: number,
    entities: Entity[]
  ) => {}
}
