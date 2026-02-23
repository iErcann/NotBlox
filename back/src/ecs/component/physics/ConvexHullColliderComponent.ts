import Rapier from '@back/physics/rapier.js'
import { Component } from '@shared/component/Component.js'

/**
 * https://rapier.rs/docs/user_guides/javascript/colliders/#convex-meshes
 * it will automatically compute the convex hull of the given set of points. A convex hull is the smallest convex shape that contains all the given points.
 */

/**
 * @param entityId Entity ID.
 * @param meshUrl Compute the convex hull from the given mesh .glb file (Path to the mesh file).
 * @param collider Rapier collider.
 */
export class ConvexHullColliderComponent extends Component {
  constructor(
    entityId: number,
    public meshUrl: string,
    public collider?: Rapier.Collider
  ) {
    super(entityId)
  }
}
