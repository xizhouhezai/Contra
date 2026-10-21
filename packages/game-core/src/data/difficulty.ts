/**
 * Difficulty tuning.
 *
 * Source of truth: docs/game/requirements/gdd.md §难度 and
 * docs/game/design/adr.md ADR-0005.
 *
 * Difficulty changes four things and never the stage layout: a casual player
 * and a hardcore player walk the same twelve stages. That is the ADR's decision -
 * the levels are authored once, and the numbers around them flex.
 */
import type { Difficulty } from './types.js'

export interface DifficultySettings {
  readonly id: Difficulty
  readonly label: string
  /** Multiplier on damage the player takes. */
  readonly enemyDamageMultiplier: number
  /** Multiplier on how many enemies a stage spawns. */
  readonly enemyDensityMultiplier: number
  /** Starting hearts. */
  readonly playerHearts: number
  /** Multiplier on score earned. */
  readonly scoreMultiplier: number
  /** Bomb charges per stage. */
  readonly bombCharges: number
}

/**
 * The three presets.
 *
 * Casual is forgiving, not free: damage still lands and the player still has
 * three hearts, because a difficulty where nothing can hurt you teaches nothing
 * about the mechanics the later stages assume.
 */
export const DIFFICULTIES: Readonly<Record<Difficulty, DifficultySettings>> = {
  casual: {
    id: 'casual',
    label: '休闲',
    enemyDamageMultiplier: 0.5,
    enemyDensityMultiplier: 0.7,
    playerHearts: 5,
    scoreMultiplier: 0.8,
    bombCharges: 5,
  },
  standard: {
    id: 'standard',
    label: '标准',
    enemyDamageMultiplier: 1,
    enemyDensityMultiplier: 1,
    playerHearts: 3,
    scoreMultiplier: 1,
    bombCharges: 3,
  },
  hardcore: {
    id: 'hardcore',
    label: '硬核',
    enemyDamageMultiplier: 2,
    enemyDensityMultiplier: 1.4,
    playerHearts: 2,
    scoreMultiplier: 1.5,
    bombCharges: 2,
  },
}

export const DEFAULT_DIFFICULTY: Difficulty = 'standard'

export function difficultySettings(id: Difficulty): DifficultySettings {
  return DIFFICULTIES[id]
}

/**
 * Damage a hit deals after the difficulty multiplier.
 *
 * Rounded up and floored at 1: a hit that deals zero damage would read as a
 * bug rather than as mercy, and hearts are whole units.
 */
export function scaledDamage(baseDamage: number, id: Difficulty): number {
  return Math.max(1, Math.ceil(baseDamage * DIFFICULTIES[id].enemyDamageMultiplier))
}

/** Score earned after the difficulty multiplier. */
export function scaledScore(baseScore: number, id: Difficulty): number {
  return Math.round(baseScore * DIFFICULTIES[id].scoreMultiplier)
}
