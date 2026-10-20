import type { EntityId, MutableVec2, Vec2, WeaponId } from '../data/types.js'

/** Who fired a bullet; faction checks live in the combat system (M1). */
export type BulletOwner = 'player' | 'enemy'

/** A single projectile travelling in a straight — or steered — line. */
export interface Bullet {
  readonly id: EntityId
  readonly owner: BulletOwner
  /** Weapon that fired it; decides the blast radius and the pickup sync. */
  readonly weaponId: WeaponId
  /** Top-left corner of the bullet box, in world pixels. */
  readonly position: MutableVec2
  /** Velocity in px/s. Homing rounds and thrown weapons rewrite it in flight. */
  readonly velocity: MutableVec2
  readonly damage: number
  /** Extra live targets this round may still pass through (pierce / prism). */
  remainingPierces: number
  /** Target a homing round is steering at; null once it flies straight. */
  lockedTargetId: EntityId | null
  /** Downward acceleration, px/s²; non-zero only for thrown weapons. */
  gravity: number
}

/** Every option a caller may leave out when spawning a projectile. */
export interface BulletOptions {
  readonly weaponId: WeaponId
  readonly remainingPierces?: number
  readonly lockedTargetId?: EntityId | null
  readonly gravity?: number
}

export function createBullet(
  id: EntityId,
  owner: BulletOwner,
  position: Vec2,
  velocity: Vec2,
  damage: number,
  options: BulletOptions,
): Bullet {
  return {
    id,
    owner,
    weaponId: options.weaponId,
    position: { x: position.x, y: position.y },
    velocity: { x: velocity.x, y: velocity.y },
    damage,
    remainingPierces: options.remainingPierces ?? 0,
    lockedTargetId: options.lockedTargetId ?? null,
    gravity: options.gravity ?? 0,
  }
}

/**
 * Advances a bullet by one fixed step.
 *
 * Gravity is applied first, so a thrown weapon's arc is the same integral the
 * player jumps under rather than a separate curve.
 */
export function stepBullet(bullet: Bullet, dt: number): void {
  if (bullet.gravity !== 0) bullet.velocity.y += bullet.gravity * dt
  bullet.position.x += bullet.velocity.x * dt
  bullet.position.y += bullet.velocity.y * dt
}
