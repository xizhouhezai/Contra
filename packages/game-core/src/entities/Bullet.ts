import type { EntityId, MutableVec2, Vec2 } from '../data/types.js'

/** Who fired a bullet; faction checks live in the combat system (M1). */
export type BulletOwner = 'player' | 'enemy'

/** A single projectile travelling in a straight line. */
export interface Bullet {
  readonly id: EntityId
  readonly owner: BulletOwner
  /** Top-left corner of the bullet box, in world pixels. */
  readonly position: MutableVec2
  /** Velocity in px/s. */
  readonly velocity: Vec2
  readonly damage: number
}

/** Advances a bullet by one fixed step. */
export function stepBullet(bullet: Bullet, dt: number): void {
  bullet.position.x += bullet.velocity.x * dt
  bullet.position.y += bullet.velocity.y * dt
}
