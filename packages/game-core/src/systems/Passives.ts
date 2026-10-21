/**
 * Passive skills - one per character.
 *
 * Source of truth: docs/game/requirements/characters.md and
 * docs/game/requirements/gameplay.md - passive skills.
 *
 * Every passive here is observable through a number or a flag the rest of the
 * rule layer reads. None of them draws anything: Qwen's foresight produces a
 * set of ids, and the presentation layer decides how to outline them.
 */
import { PASSIVE_TUNING, type PassiveId } from '../data/characters.js'
import type { EntityId } from '../data/types.js'
import { SPREAD_GAIN_PER_SHOT } from './Combat.js'

/** Mutable per-run state the passives read and write. */
export interface PassiveState {
  /** Kimi: marks banked on each target. */
  marks: Map<EntityId, number>
  /** GLM: kills counted toward the next heart. */
  kills: number
  /** GLM: true once the stage's single heal has been spent. */
  rhythmSpent: boolean
  /** Kimi: targets whose marks just paid out, cleared by the caller. */
  pendingPayout: EntityId[]
}

export function createPassiveState(): PassiveState {
  return { marks: new Map(), kills: 0, rhythmSpent: false, pendingPayout: [] }
}

/**
 * How much spread one shot adds for this character.
 *
 * DeepSeek's 扩散之芯 halves it, so the cone takes twice as many pulls to reach
 * full width - the same weapon, a looser rhythm.
 */
export function spreadGainFor(passive: PassiveId): number {
  return passive === 'spread-resist'
    ? SPREAD_GAIN_PER_SHOT * PASSIVE_TUNING.spreadResistMultiplier
    : SPREAD_GAIN_PER_SHOT
}

/** 豆包: homing damage multiplier (1 for everyone else). */
export function homingDamageMultiplier(passive: PassiveId): number {
  return passive === 'sticky-tracking' ? PASSIVE_TUNING.stickyDamageMultiplier : 1
}

/** 豆包: extra simultaneous homing locks on top of the base cap. */
export function extraHomingLocks(passive: PassiveId): number {
  return passive === 'sticky-tracking' ? PASSIVE_TUNING.stickyExtraLocks : 0
}

/** Gemini: extra targets a prism round passes through. */
export function extraPrismTargets(passive: PassiveId): number {
  return passive === 'multimodal' ? PASSIVE_TUNING.multimodalExtraTargets : 0
}

/**
 * Qwen: how many seconds early an off-screen enemy is revealed.
 *
 * Returns 0 for every other character, so a caller can add it unconditionally.
 */
export function foresightLeadSeconds(passive: PassiveId): number {
  return passive === 'foresight' ? PASSIVE_TUNING.foresightLeadSeconds : 0
}

/**
 * Kimi: records one mark on a target and reports whether that paid out.
 *
 * The payout happens on the pull that reaches the required count, then the
 * marks reset - otherwise a long fight would pay out on every subsequent hit.
 */
export function addMemoryMark(
  state: PassiveState,
  passive: PassiveId,
  targetId: EntityId,
): boolean {
  if (passive !== 'long-context') return false
  const current = state.marks.get(targetId) ?? 0
  const next = current + 1
  if (next >= PASSIVE_TUNING.contextMarksRequired) {
    state.marks.set(targetId, 0)
    state.pendingPayout.push(targetId)
    return true
  }
  state.marks.set(targetId, next)
  return false
}

/**
 * GLM: counts a kill and reports whether it earned a heart back.
 *
 * Once per stage (gameplay.md), so the counter keeps rising but the heal can
 * only fire the first time the threshold is crossed.
 */
export function registerRhythmKill(state: PassiveState, passive: PassiveId): boolean {
  if (passive !== 'balanced-rhythm') return false
  if (state.rhythmSpent) return false
  state.kills += 1
  if (state.kills < PASSIVE_TUNING.rhythmKillsPerHeart) return false
  state.rhythmSpent = true
  return true
}
