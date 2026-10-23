import type { EnemyWeapon } from '../data/enemyWeapons.js'
import type { EntityId, Vec2 } from '../data/types.js'
import type { TargetState } from '../entities/Target.js'

/**
 * Per-enemy attack timing.
 *
 * Kept beside TargetState rather than inside it: TargetState is the target's
 * body, this is its intent. A target with no entry here never fires, which is
 * what a graybox target in an early test should do.
 */
export interface AttackState {
  /** Seconds until this enemy may start its next attack. */
  cooldownUntil: number
  /** Seconds remaining in the current wind-up, or 0 when not winding up. */
  telegraphLeft: number
  /** Set while winding up, so the pause is not restarted every step. */
  windingUp: boolean
  /** Rounds already emitted for the current attack. */
  fired: boolean
}

export function createAttackState(): AttackState {
  return { cooldownUntil: 0, telegraphLeft: 0, windingUp: false, fired: false }
}

/** What one step of the attack produced. */
export interface AttackStep {
  /** A wind-up started this step; the presentation layer should draw it. */
  readonly startedTelegraph: boolean
  /** A wind-up completed this step; the rounds leave now. */
  readonly fired: boolean
  /** Where the rounds originate, when fired. */
  readonly origin: Vec2 | null
  /** Aim toward the player, when fired. */
  readonly aim: Vec2 | null
}

const NOTHING: AttackStep = {
  startedTelegraph: false,
  fired: false,
  origin: null,
  aim: null,
}

/** Centre of an enemy's box, which is where its weapon points from. */
export function enemyCentre(target: TargetState): Vec2 {
  return {
    x: target.box.x + target.box.width / 2,
    y: target.box.y + target.box.height / 2,
  }
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Advances one enemy's attack timer.
 *
 * Three phases and no more: wait out the cooldown, wind up for telegraphSeconds
 * with the aim locked at the moment the wind-up began, then fire once. Locking
 * the aim at the start is deliberate - a shot that keeps tracking through the
 * whole warning cannot be dodged by moving, only by having already moved.
 *
 * @param now seconds of simulation elapsed
 * @param canFire false while the act's shooter budget is spent
 */
export function stepAttack(
  state: AttackState,
  weapon: EnemyWeapon,
  target: TargetState,
  player: Vec2,
  playerOnGround: boolean,
  now: number,
  canFire: boolean,
): AttackStep {
  if (!target.alive) return NOTHING
  // A melee-only archetype has nothing to fire; its damage is contact damage,
  // which the world already resolves.
  if (weapon.kind === 'melee') return NOTHING

  const centre = enemyCentre(target)
  const inRange = distance(centre, player) <= weapon.rangePx
  if (!inRange) {
    // Losing sight abandons a wind-up rather than banking it, so an enemy that
    // the player ran away from does not fire the instant they return.
    if (state.windingUp) {
      state.windingUp = false
      state.telegraphLeft = 0
      state.fired = false
    }
    return NOTHING
  }

  if (state.windingUp) {
    state.telegraphLeft -= 1 / 60
    if (state.telegraphLeft > 0) return NOTHING
    if (state.fired) return NOTHING
    state.fired = true
    state.windingUp = false
    state.telegraphLeft = 0
    state.cooldownUntil = now + weapon.cooldownSeconds

    const dx = player.x - centre.x
    const dy = player.y - centre.y
    const length = Math.hypot(dx, dy) || 1
    return {
      startedTelegraph: false,
      fired: true,
      origin: centre,
      aim: { x: dx / length, y: dy / length },
    }
  }

  if (now < state.cooldownUntil) return NOTHING

  // A ground attack is pointless against a player in the air, and firing it
  // anyway would waste the enemy's only window.
  if (weapon.kind === 'ground-spike' && !playerOnGround) return NOTHING

  if (!canFire) return NOTHING

  state.windingUp = true
  state.telegraphLeft = weapon.telegraphSeconds
  state.fired = false
  // A zero-telegraph weapon resolves on the following step, which is the only
  // way to keep "no warning" from also meaning "no cooldown".
  if (weapon.telegraphSeconds <= 0) {
    state.telegraphLeft = 0
  }
  return { startedTelegraph: true, fired: false, origin: centre, aim: null }
}

/**
 * Direction vectors for one volley.
 *
 * The fan is centred on the aim, not swept from one side: an off-centre fan
 * makes the "middle" round miss whenever the player is exactly on the aim, which
 * reads as a bug rather than as a pattern.
 */
export function volleyDirections(aim: Vec2, count: number, spreadDeg: number): Vec2[] {
  if (count <= 0) return []
  const base = Math.atan2(aim.y, aim.x)
  if (count === 1) return [{ x: Math.cos(base), y: Math.sin(base) }]

  const spread = (spreadDeg * Math.PI) / 180
  const step = spread / (count - 1)
  const out: Vec2[] = []
  for (let i = 0; i < count; i += 1) {
    const angle = base - spread / 2 + step * i
    out.push({ x: Math.cos(angle), y: Math.sin(angle) })
  }
  return out
}

/** True when this enemy is close enough for its contact damage to count. */
export function isContactKind(weapon: EnemyWeapon): boolean {
  return weapon.kind === 'melee'
}

/** Exposed for tests that need a stable id for one target's attack state. */
export type AttackKey = EntityId
