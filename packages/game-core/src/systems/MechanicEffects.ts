/**
 * Stage mechanics as the World applies them.
 *
 * Terrain.ts answers "where is this platform at time t" and Mechanics.ts answers
 * "which way does a reflected velocity point". Neither owns a fixed step, and
 * until this module existed nothing called them: bounce walls, motion platforms
 * and breakable blocks were authored in stage data, unit-tested, and invisible in
 * play. This is the seam where the authored field changes what the player can do.
 */

import { BULLET_HEIGHT, BULLET_WIDTH } from '../data/constants.js'
import type { EnemyDefinition } from '../data/enemies.js'
import type { Rect, Vec2 } from '../data/types.js'
import type { Bullet } from '../entities/Bullet.js'
import { attackSide, damageAgainst } from './EnemyBehaviour.js'
import { overlaps, reflectVelocity, struckFace, type WallFace } from './Mechanics.js'
import { blocksMovement, platformAt, type TerrainPlatform, type TerrainState } from './Terrain.js'

/** How far a rider's feet may sit from a plank's top and still be carried. */
const RIDE_TOLERANCE_PX = 2

/** Movement smaller than this counts as standing still, so facing does not flicker. */
const FACING_EPSILON_PX = 0.01

/** The bullet's body in world space; the collision rules all work on this box. */
export function bulletBox(bullet: Bullet): Rect {
  return {
    x: bullet.position.x,
    y: bullet.position.y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
  }
}

/** Puts a reflected round back outside the wall it just struck. */
function pushOut(bullet: Bullet, face: WallFace, wall: Rect): void {
  switch (face) {
    case 'left':
      bullet.position.x = wall.x - BULLET_WIDTH
      break
    case 'right':
      bullet.position.x = wall.x + wall.width
      break
    case 'top':
      bullet.position.y = wall.y - BULLET_HEIGHT
      break
    default:
      bullet.position.y = wall.y + wall.height
      break
  }
}

/**
 * Reflects every round that overlaps a bounce wall, returning how many turned.
 *
 * Depenetration is the part that makes the mechanic visible: a round left inside
 * the wall would reflect again on the next step and oscillate in place, which
 * reads as a bullet stuck on the wall rather than one that bounced off it. Only
 * the first wall is applied for the same reason - a round wedged in a corner
 * would otherwise flip twice and fly on as though it had never touched anything.
 */
export function reflectBulletsOffWalls(bullets: readonly Bullet[], walls: readonly Rect[]): number {
  if (walls.length === 0) return 0

  let bounced = 0
  for (const bullet of bullets) {
    const box = bulletBox(bullet)
    for (const wall of walls) {
      if (!overlaps(box, wall)) continue
      const face = struckFace(box, wall)
      const reflected = reflectVelocity(bullet.velocity, face)
      bullet.velocity.x = reflected.x
      bullet.velocity.y = reflected.y
      pushOut(bullet, face, wall)
      bounced += 1
      break
    }
  }
  return bounced
}

/**
 * Damage one round deals to an enemy, after its armoured front.
 *
 * The rule the player learns: an armoured enemy shrugs off everything arriving at
 * its face, so the answer is to get behind it - or to carry a piercing round,
 * which is the other answer the spec gives.
 */
export function armourDamage(
  definition: EnemyDefinition,
  shot: Rect,
  enemy: Rect,
  facing: 1 | -1,
  damage: number,
  piercing: boolean,
): number {
  const shooterX = shot.x + shot.width / 2
  const enemyX = enemy.x + enemy.width / 2
  return damageAgainst(definition, attackSide(shooterX, enemyX, facing), damage, piercing)
}

/**
 * Which way a body faces after it moved by `movedX`.
 *
 * A body keeps the direction it already had until it actually travels: armour
 * that re-aimed itself at the shooter every step would be unkillable from the
 * front by definition, and the "get behind it" rule would never be reachable.
 */
export function facingFromMotion(movedX: number, previous: 1 | -1): 1 | -1 {
  if (movedX > FACING_EPSILON_PX) return 1
  if (movedX < -FACING_EPSILON_PX) return -1
  return previous
}

/**
 * The platforms that block movement this step.
 *
 * Displaced by their motion and without the ones already broken: both are facts
 * about the current instant, so they are recomputed rather than accumulated.
 */
export function solidPlatforms(
  platforms: readonly TerrainPlatform[],
  terrain: TerrainState,
  seconds: number,
): readonly TerrainPlatform[] {
  // TerrainPlatform, not the bare Rect: the caller has to be able to tell a
  // moving plank from a still one, and platformAt() returns the position at this
  // instant while the motion description stays on the platform.
  const solid: TerrainPlatform[] = []
  for (let index = 0; index < platforms.length; index += 1) {
    const platform = platforms[index]
    if (platform === undefined) continue
    if (!blocksMovement(platform, terrain, index)) continue
    solid.push({ ...platform, ...platformAt(platform, seconds) })
  }
  return solid
}

/** Where a rider's feet are, as the carry rule needs to see them. */
export interface RiderFeet {
  readonly x: number
  readonly width: number
  readonly bottom: number
}

/**
 * How far the plank under a pair of feet moved this step.
 *
 * Returned as a delta rather than as the plank's new surface: a rider that was
 * displaced by the plank's own travel stays glued to it while a rider mid-jump
 * is not teleported onto it.
 */
export function platformCarry(
  platforms: readonly TerrainPlatform[],
  terrain: TerrainState,
  fromSeconds: number,
  toSeconds: number,
  feet: RiderFeet,
): Vec2 {
  let dx = 0
  let dy = 0

  for (let index = 0; index < platforms.length; index += 1) {
    const platform = platforms[index]
    if (platform === undefined || platform.motion === undefined) continue
    if (!blocksMovement(platform, terrain, index)) continue

    const before = platformAt(platform, fromSeconds)
    if (Math.abs(feet.bottom - before.y) > RIDE_TOLERANCE_PX) continue
    if (feet.x + feet.width <= before.x || feet.x >= before.x + before.width) continue

    const after = platformAt(platform, toSeconds)
    dx += after.x - before.x
    dy += after.y - before.y
  }

  return { x: dx, y: dy }
}
