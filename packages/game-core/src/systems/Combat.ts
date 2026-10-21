/**
 * Damage resolution, faction checks and the invulnerability window.
 *
 * Source of truth: docs/game/requirements/gdd.md §3.1 and
 * docs/game/requirements/gameplay.md §战斗 · §状态效果.
 */
import { INVULNERABLE_SECONDS } from '../data/constants.js'

/** Faction of an entity that can deal or receive damage. */
export type Faction = 'player' | 'enemy'

/** The slice of a player the combat rules need. */
export interface Damageable {
  hearts: number
  invulnerableUntil: number
}

/** What one resolved hit did. */
export interface DamageResult {
  /** True when the hit actually landed. */
  readonly applied: boolean
  /** True when this hit reduced hearts to zero. */
  readonly died: boolean
  readonly heartsLeft: number
}

/** Two factions are hostile when exactly one of them is the player. */
export function isHostile(a: Faction, b: Faction): boolean {
  return a !== b
}

/**
 * Whether a projectile fired by \`owner\` may damage a target of \`target\`.
 *
 * Both sides of the check are explicit so a friendly-fire regression cannot
 * hide inside a default argument.
 */
export function canDamage(owner: Faction, target: Faction): boolean {
  return isHostile(owner, target)
}

/** True when the target is currently immune to damage. */
export function isInvulnerable(target: Damageable, now: number): boolean {
  return now < target.invulnerableUntil
}

/**
 * Applies one hit of one heart.
 *
 * A hit always costs exactly one heart regardless of the incoming damage number:
 * hearts are a discrete resource (gameplay.md §生命与伤害). Every hit inside the
 * invulnerability window is dropped, which is what makes several bullets landing
 * in the same frame cost a single heart (T-M1-06 acceptance).
 *
 * @param now seconds elapsed in the current run
 */
export function applyHit(target: Damageable, now: number): DamageResult {
  if (isInvulnerable(target, now)) {
    return { applied: false, died: false, heartsLeft: target.hearts }
  }
  if (target.hearts <= 0) {
    return { applied: false, died: true, heartsLeft: 0 }
  }

  target.hearts -= 1
  const died = target.hearts <= 0
  if (!died) target.invulnerableUntil = now + INVULNERABLE_SECONDS
  return { applied: true, died, heartsLeft: target.hearts }
}
/**
 * Spread accumulation for one weapon slot.
 *
 * The rule itself lives here because it is a combat state effect
 * (gameplay.md §状态效果 · 散射衰减); the slot merely stores the charge.
 */

/** How much of the cone one shot adds, as a fraction of the weapon's spread. */
export const SPREAD_GAIN_PER_SHOT = 1 / 3

/** Charge recovered per second while the trigger rests; 1.5 clears a cone in 0.67s. */
export const SPREAD_RECOVERY_PER_SECOND = 1.5

/** Widens the cone by one shot, clamped to fully spread. */
export function accumulateSpread(slot: { spreadAccum: number }): void {
  slot.spreadAccum = Math.min(1, slot.spreadAccum + SPREAD_GAIN_PER_SHOT)
}

/** Recovers the cone while the trigger rests. */
export function recoverSpread(slot: { spreadAccum: number }, dt: number): void {
  slot.spreadAccum = Math.max(0, slot.spreadAccum - SPREAD_RECOVERY_PER_SECOND * dt)
}

/**
 * Offset of one projectile inside the firing cone, in radians.
 *
 * A pellet at index i of n is placed evenly across the cone, so the first and
 * last pellet sit on the cone edge and the spread is symmetric around the aim.
 */
export function spreadOffsetRadians(index: number, count: number, coneRadians: number): number {
  if (count <= 1 || coneRadians === 0) return 0
  return (index / (count - 1) - 0.5) * coneRadians
}
