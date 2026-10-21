/**
 * Scoring, combo and accuracy.
 *
 * Source of truth: docs/game/requirements/gameplay.md - scoring and combo.
 */

/** Combo expires when no enemy dies for this long, in seconds. */
export const COMBO_WINDOW_SECONDS = 3

/** Multiplier added per combo step. */
export const COMBO_BONUS_PER_STEP = 0.05

/** Ceiling on the combo multiplier bonus; +100% means the cap is 2x. */
export const COMBO_BONUS_CAP = 1

export interface ScoreState {
  score: number
  combo: number
  /** Seconds left before the combo resets. */
  comboTimer: number
  shotsFired: number
  shotsHit: number
}

export function createScoreState(): ScoreState {
  return { score: 0, combo: 0, comboTimer: 0, shotsFired: 0, shotsHit: 0 }
}

/** Current multiplier: 1 plus the capped combo bonus. */
export function comboMultiplier(state: ScoreState): number {
  return 1 + Math.min(COMBO_BONUS_CAP, state.combo * COMBO_BONUS_PER_STEP)
}

/**
 * Registers one kill.
 *
 * The combo advances before the multiplier is read, so the first kill of a
 * streak already scores above base. That is what makes chaining feel rewarding
 * from the first link instead of only after several.
 */
export function registerKill(state: ScoreState, baseScore: number): number {
  state.combo += 1
  state.comboTimer = COMBO_WINDOW_SECONDS
  const earned = Math.round(baseScore * comboMultiplier(state))
  state.score += earned
  return earned
}

/** Advances timers; expires the combo once the window passes. */
export function updateScore(state: ScoreState, dt: number): void {
  if (state.comboTimer <= 0) return
  state.comboTimer -= dt
  if (state.comboTimer <= 0) {
    state.comboTimer = 0
    state.combo = 0
  }
}

/** Records one shot fired. */
export function registerShot(state: ScoreState): void {
  state.shotsFired += 1
}

/** Records one shot that connected. */
export function registerHit(state: ScoreState): void {
  state.shotsHit += 1
}

/**
 * Hit rate as a 0..1 ratio.
 *
 * A run with no shots reports 1: there is no evidence of missing, and 0 would be
 * read as total inaccuracy.
 */
export function accuracy(state: ScoreState): number {
  if (state.shotsFired === 0) return 1
  return state.shotsHit / state.shotsFired
}
