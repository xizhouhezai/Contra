/**
 * Enemy behaviour: chase, flight and armour.
 *
 * Source of truth: docs/game/requirements/stages.md - 机制 and
 * docs/game/design/modules.md - 敌人行为.
 *
 * Each function is a pure step: given an enemy, the player position and a time
 * delta, it returns the new position and state. The World owns the list; these
 * own the rules. That split is what lets behaviour be unit-tested without
 * building a stage.
 */
import type { EnemyDefinition, EnemyState } from '../data/enemies.js'
import type { Vec2 } from '../data/types.js'

/** Distance at which a charger starts its run, px. */
export const CHARGER_SIGHT_PX = 320

/** Speed multiplier while a charger is winding up. */
export const CHARGER_CHARGE_BOOST = 1.6

/** Seconds a charger stays knocked back after being hit, s. */
export const KNOCKBACK_SECONDS = 0.35

/** Amplitude of a flyer's vertical weave, px. */
export const FLYER_AMPLITUDE_PX = 48

/** Angular speed of a flyer's weave, rad/s. */
export const FLYER_WEAVE_RATE = 2

/**
 * How high above a flyer a shot must be aimed to connect, px.
 *
 * The player's horizontal shot travels level; a flyer bobbing above the muzzle
 * line is out of reach unless the aim is raised. Keeping the number here means
 * the stage spec and the enemy spec cannot drift apart.
 */
export const FLYER_MIN_AIM_OFFSET_PX = 24

export interface EnemyMotion {
  readonly position: Vec2
  readonly state: EnemyState
  /** Seconds of knockback still to run. */
  readonly knockedSeconds: number
}

/** True when the player is within the charger's sight range. */
export function inSight(enemy: Vec2, player: Vec2, sightPx = CHARGER_SIGHT_PX): boolean {
  return Math.abs(player.x - enemy.x) <= sightPx
}

/**
 * Steps a charger toward the player.
 *
 * Knockback takes precedence: while it runs the enemy slides away and does not
 * close distance, which is what makes a hit feel like it bought the player room.
 */
export function stepCharger(
  definition: EnemyDefinition,
  motion: EnemyMotion,
  player: Vec2,
  dt: number,
): EnemyMotion {
  if (motion.knockedSeconds > 0) {
    const remaining = Math.max(0, motion.knockedSeconds - dt)
    const direction = Math.sign(motion.position.x - player.x) || 1
    const slide = definition.speed * 0.5 * dt * direction
    return {
      position: { x: motion.position.x + slide, y: motion.position.y },
      state: remaining > 0 ? 'hurt' : 'chase',
      knockedSeconds: remaining,
    }
  }

  if (!inSight(motion.position, player)) {
    return { ...motion, state: 'idle' }
  }

  const direction = Math.sign(player.x - motion.position.x)
  if (direction === 0) return { ...motion, state: 'attack' }

  const speed = definition.speed * CHARGER_CHARGE_BOOST
  return {
    position: { x: motion.position.x + direction * speed * dt, y: motion.position.y },
    state: 'chase',
    knockedSeconds: 0,
  }
}

/** Applies a knockback to a charger. */
export function knockBack(motion: EnemyMotion): EnemyMotion {
  return { ...motion, state: 'hurt', knockedSeconds: KNOCKBACK_SECONDS }
}

/**
 * Steps a flyer along its weave.
 *
 * Flight ignores platforms entirely - that is the mechanic: the player has to
 * look up rather than follow the ground. `phase` advances with time so the
 * weave is deterministic given the same step count.
 */
export function stepFlyer(
  definition: EnemyDefinition,
  motion: EnemyMotion,
  player: Vec2,
  phase: number,
  dt: number,
): EnemyMotion {
  const direction = Math.sign(player.x - motion.position.x) || 1
  const nextPhase = phase + FLYER_WEAVE_RATE * dt
  const x = motion.position.x + direction * definition.speed * dt
  const y = motion.position.y + Math.cos(nextPhase) * FLYER_AMPLITUDE_PX * dt
  return { position: { x, y }, state: 'chase', knockedSeconds: 0 }
}

/**
 * Whether a level shot from `muzzleY` can reach a flyer at `flyerY`.
 *
 * Used by the rule layer to decide whether a bullet passes under the target, and
 * by the tests to prove that a flat shot misses.
 */
export function canReachFlyer(muzzleY: number, flyerY: number): boolean {
  return Math.abs(flyerY - muzzleY) <= FLYER_MIN_AIM_OFFSET_PX
}

/** Which side of an enemy a shot came from. */
export type AttackSide = 'front' | 'back'

/**
 * Where a shot landed relative to an armoured enemy's facing.
 *
 * Facing is the direction the enemy looks: a shot arriving from the same side is
 * a frontal hit and is absorbed. `facing` is +1 for right, -1 for left.
 */
export function attackSide(shooterX: number, enemyX: number, facing: 1 | -1): AttackSide {
  const fromRight = shooterX > enemyX
  const lookingRight = facing === 1
  return fromRight === lookingRight ? 'front' : 'back'
}

/**
 * Damage one hit deals to an enemy, after armour.
 *
 * Piercing rounds ignore armour: that is the second answer the spec gives to an
 * armoured enemy, alongside walking around it.
 */
export function damageAgainst(
  definition: EnemyDefinition,
  side: AttackSide,
  incomingDamage: number,
  piercing: boolean,
): number {
  if (!definition.armoredFront) return incomingDamage
  if (piercing) return incomingDamage
  return side === 'front' ? 0 : incomingDamage
}
