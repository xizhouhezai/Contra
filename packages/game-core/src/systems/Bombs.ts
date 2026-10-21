/**
 * Bomb skills - one per character, three charges per stage.
 *
 * Source of truth: docs/game/requirements/characters.md and
 * docs/game/requirements/gameplay.md - bomb skills.
 *
 * A bomb returns a description of what it does; the World turns that into
 * bullets or damage. Keeping the description declarative is what lets every bomb
 * differ without six near-identical methods in the World.
 */
import type { BombId } from '../data/characters.js'
import type { Vec2 } from '../data/types.js'

/** Charges a character starts a stage with (GDD 3.1). */
export const INITIAL_BOMBS = 3

/** A bomb's effect, expressed in terms the World can apply. */
export interface BombEffect {
  readonly kind: 'radial' | 'beam' | 'volley' | 'shield' | 'replay' | 'refract'
  /** Damage carried by the effect, if any. */
  readonly damage: number
  /** Blast radius in pixels for radial and shield effects. */
  readonly radius: number
  /** Projectiles spawned, for volley and refract. */
  readonly projectiles: number
  /** Seconds the effect lasts, for shield and replay. */
  readonly durationSeconds: number
}

/** Per-character bomb tuning, so the numbers stay in one table. */
const EFFECTS: Readonly<Record<BombId, BombEffect>> = {
  blast: { kind: 'radial', damage: 60, radius: 240, projectiles: 0, durationSeconds: 0 },
  'laser-pierce': { kind: 'beam', damage: 45, radius: 0, projectiles: 1, durationSeconds: 0 },
  'homing-mother': { kind: 'volley', damage: 20, radius: 0, projectiles: 8, durationSeconds: 0 },
  shield: { kind: 'shield', damage: 0, radius: 40, projectiles: 0, durationSeconds: 5 },
  'context-replay': { kind: 'replay', damage: 0, radius: 0, projectiles: 0, durationSeconds: 3 },
  'prism-refract': { kind: 'refract', damage: 30, radius: 0, projectiles: 4, durationSeconds: 0 },
}

export function bombEffect(bomb: BombId): BombEffect {
  return EFFECTS[bomb]
}

export interface BombState {
  charges: number
  /** Seconds left on an active effect, for the timed bombs. */
  activeSeconds: number
  activeKind: BombEffect['kind'] | null
}

export function createBombState(charges = INITIAL_BOMBS): BombState {
  return { charges, activeSeconds: 0, activeKind: null }
}

/** True when a bomb can be spent right now. */
export function canDetonate(state: BombState): boolean {
  return state.charges > 0
}

/**
 * Spends one charge and starts the effect.
 *
 * Returns the effect to apply, or null when there was nothing to spend. A bomb
 * with no charge must not silently do nothing while still reporting success -
 * the null is how the caller knows to ignore the input.
 */
export function detonate(state: BombState, bomb: BombId): BombEffect | null {
  if (!canDetonate(state)) return null
  state.charges -= 1
  const effect = bombEffect(bomb)
  if (effect.durationSeconds > 0) {
    state.activeKind = effect.kind
    state.activeSeconds = effect.durationSeconds
  }
  return effect
}

/** Advances any timed effect. */
export function updateBomb(state: BombState, dt: number): void {
  if (state.activeSeconds <= 0) return
  state.activeSeconds -= dt
  if (state.activeSeconds <= 0) {
    state.activeSeconds = 0
    state.activeKind = null
  }
}

/** True while a timed bomb (shield or replay) is running. */
export function bombActive(state: BombState): boolean {
  return state.activeSeconds > 0
}

/**
 * Where a radial bomb's damage is centred.
 *
 * Kept as a function so the World supplies the player position and the bomb
 * itself stays free of entity state.
 */
export function blastOrigin(playerPosition: Vec2): Vec2 {
  return { x: playerPosition.x, y: playerPosition.y }
}
