/**
 * Boss phase machine, move scheduling and telegraphs.
 *
 * Source of truth: docs/game/requirements/characters.md (Claude two forms) and
 * docs/game/requirements/stages.md (boss stages).
 *
 * One director drives both bosses: a boss is a phase table, and a move is data.
 * That is what makes T-M2-07 a framework rather than one boss written twice.
 */
import type { BossId } from '../data/types.js'

/** One attack a boss can perform. */
export interface BossMove {
  readonly id: string
  /** Damage the move deals when it connects. */
  readonly damage: number
  /** Seconds of warning before the move resolves (the dodge window). */
  readonly telegraphSeconds: number
  /** Seconds before this move may be used again. */
  readonly cooldownSeconds: number
}

/** One phase of a fight. */
export interface BossPhase {
  /** Phase number, 1-based. */
  readonly phase: number
  /** Fraction of max HP at or below which this phase is active. */
  readonly hpThreshold: number
  readonly moves: readonly BossMove[]
  /** Multiplier on move cadence; above 1 means faster. */
  readonly speedMultiplier: number
  /**
   * Whether this phase inverts gravity, and for how long.
   *
   * The inversion is deliberately temporary: it lasts this many seconds, then
   * restores on its own. A phase-long inversion would make the flag irreversible
   * for the rest of the fight, which is exactly the "卡死" the spec forbids.
   */
  readonly gravityFlip: { readonly secondsPerCycle: number } | null
}

export interface BossDefinition {
  readonly id: BossId
  readonly name: string
  readonly maxHp: number
  readonly phases: readonly BossPhase[]
  /** Weapon dropped on defeat, if any. */
  readonly dropsWeapon?: string
}

export interface BossRuntimeState {
  readonly definition: BossDefinition
  /**
   * The area the boss can be hit in.
   *
   * A boss is a phase machine, not an entity, so it had no body at all: gunfire
   * and blasts were resolved only against `targets`, and the three boss stages
   * declare `targets: []`. The result was a boss that could wound the player and
   * could never be wounded back - a fight with only one direction.
   *
   * Mutable rather than replaced, so callers that hold the state see it move.
   */
  readonly box: { x: number; y: number; width: number; height: number }
  hp: number
  phase: number
  /** Per-move remaining cooldowns, keyed by move id. */
  readonly cooldowns: Map<string, number>
  /** Seconds left on an in-flight telegraph, or null when idle. */
  telegraph: { readonly moveId: string; readonly secondsLeft: number } | null
  /** True while gravity is currently inverted. */
  gravityFlipped: boolean
  /** Seconds left on the current inversion, or 0 when upright. */
  gravitySecondsLeft: number
  defeated: boolean
}

/**
 * Size of the boss's hit area.
 *
 * Sized to the arena rather than to the portrait: the portrait is painting, and a
 * player aiming at art rather than at a place would be aiming at whatever the
 * scene happened to draw. This is the box that the exit zone occupies vertically,
 * which is where the boss is said to stand.
 */
export const BOSS_HIT_WIDTH = 96
export const BOSS_HIT_HEIGHT = 120

export function createBossState(
  definition: BossDefinition,
  origin = { x: 0, y: 0 },
): BossRuntimeState {
  return {
    definition,
    box: {
      x: origin.x - BOSS_HIT_WIDTH / 2,
      y: origin.y - BOSS_HIT_HEIGHT,
      width: BOSS_HIT_WIDTH,
      height: BOSS_HIT_HEIGHT,
    },
    hp: definition.maxHp,
    phase: definition.phases[0]?.phase ?? 1,
    cooldowns: new Map(),
    telegraph: null,
    gravityFlipped: false,
    gravitySecondsLeft: 0,
    defeated: false,
  }
}

/** Fraction of max HP remaining, 0..1. */
export function hpFraction(state: BossRuntimeState): number {
  return Math.max(0, state.hp / state.definition.maxHp)
}

/** The phase whose threshold the current HP has reached. */
export function phaseForHp(definition: BossDefinition, hp: number): BossPhase {
  const fraction = hp / definition.maxHp
  let chosen = definition.phases[0]
  for (const phase of definition.phases) {
    if (fraction <= phase.hpThreshold) chosen = phase
  }
  // Every definition declares at least one phase and the loop above seeds
  // `chosen` from the first, so this fallback only satisfies the type without
  // asserting.
  return (
    chosen ?? {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [],
    }
  )
}

export interface BossStepResult {
  readonly phaseChanged: boolean
  readonly newPhase: number
  /** Move whose telegraph just started, if any. */
  readonly telegraphed: string | null
  /** Move that resolved this step and now deals damage, if any. */
  readonly resolved: BossMove | null
  readonly gravityFlipped: boolean
}

/**
 * Advances the boss by one step.
 *
 * Order matters: the phase is re-evaluated from HP first, so a move already in
 * flight still resolves under the new phase. A boss that reaches its threshold
 * mid-telegraph must not swallow the attack the player is already dodging.
 */
export function stepBoss(state: BossRuntimeState, dt: number): BossStepResult {
  if (state.defeated) {
    return {
      phaseChanged: false,
      newPhase: state.phase,
      telegraphed: null,
      resolved: null,
      gravityFlipped: state.gravityFlipped,
    }
  }

  const target = phaseForHp(state.definition, state.hp)
  const phaseChanged = target.phase !== state.phase
  if (phaseChanged) {
    state.phase = target.phase
    // Entering a phase that rewrites gravity starts one timed inversion.
    if (target.gravityFlip !== null) {
      state.gravityFlipped = true
      state.gravitySecondsLeft = target.gravityFlip.secondsPerCycle
    }
  }

  // The inversion runs down and restores on its own, so no state can leave the
  // player stuck upside down once the window closes.
  if (state.gravitySecondsLeft > 0) {
    state.gravitySecondsLeft = Math.max(0, state.gravitySecondsLeft - dt)
    if (state.gravitySecondsLeft === 0) state.gravityFlipped = false
  }

  for (const [id, remaining] of state.cooldowns) {
    const next = remaining - dt * (target.speedMultiplier || 1)
    if (next <= 0) state.cooldowns.delete(id)
    else state.cooldowns.set(id, next)
  }

  if (state.telegraph !== null) {
    const secondsLeft = state.telegraph.secondsLeft - dt
    if (secondsLeft <= 0) {
      const move = target.moves.find((candidate) => candidate.id === state.telegraph?.moveId)
      state.telegraph = null
      if (move !== undefined) state.cooldowns.set(move.id, move.cooldownSeconds)
      return {
        phaseChanged,
        newPhase: state.phase,
        telegraphed: null,
        resolved: move ?? null,
        gravityFlipped: state.gravityFlipped,
      }
    }
    state.telegraph = { moveId: state.telegraph.moveId, secondsLeft }
    return {
      phaseChanged,
      newPhase: state.phase,
      telegraphed: null,
      resolved: null,
      gravityFlipped: state.gravityFlipped,
    }
  }

  const ready = target.moves.find((move) => !state.cooldowns.has(move.id))
  if (ready !== undefined) {
    state.telegraph = { moveId: ready.id, secondsLeft: ready.telegraphSeconds }
    return {
      phaseChanged,
      newPhase: state.phase,
      telegraphed: ready.id,
      resolved: null,
      gravityFlipped: state.gravityFlipped,
    }
  }

  return {
    phaseChanged,
    newPhase: state.phase,
    telegraphed: null,
    resolved: null,
    gravityFlipped: state.gravityFlipped,
  }
}

/** Applies damage and reports whether this hit finished the boss. */
export function damageBoss(state: BossRuntimeState, amount: number): boolean {
  state.hp = Math.max(0, state.hp - amount)
  if (state.hp === 0) {
    state.defeated = true
    return true
  }
  return false
}

/** True while a dodge window is open. */
export function isTelegraphing(state: BossRuntimeState): boolean {
  return state.telegraph !== null
}
