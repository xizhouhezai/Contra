/**
 * Echo splitting - the GPT fight's mid-point.
 *
 * Source of truth: docs/game/requirements/characters.md - 形态 II「涌现」and
 * docs/game/tasks/backlog.md T-M3-06.
 *
 * At 40% HP the body splits into three echoes. The body is untargetable while any
 * echo lives, so the player must clear all three before the final phase opens.
 * Modelling that as its own small state machine keeps the boss table free of
 * special cases for one fight.
 */

/** How many echoes spawn at the split. */
export const ECHO_COUNT = 3

/** HP fraction at which the split happens. */
export const SPLIT_THRESHOLD = 0.4

export interface Echo {
  readonly id: string
  alive: boolean
  hp: number
}

export interface EchoState {
  readonly echoes: Echo[]
  /** True once the split has happened; it happens once per fight. */
  split: boolean
  /** True while at least one echo lives, which makes the body untargetable. */
  bodyHidden: boolean
}

export function createEchoState(): EchoState {
  return { echoes: [], split: false, bodyHidden: false }
}

/**
 * Splits the body into echoes when HP first drops to the threshold.
 *
 * Returns true on the step the split occurs, so the caller can emit the event and
 * change the music once rather than every frame below the threshold.
 */
export function maybeSplit(state: EchoState, hp: number, maxHp: number, echoHp: number): boolean {
  if (state.split) return false
  if (hp / maxHp > SPLIT_THRESHOLD) return false

  state.split = true
  state.bodyHidden = true
  for (let index = 0; index < ECHO_COUNT; index += 1) {
    state.echoes.push({ id: `echo-${index + 1}`, alive: true, hp: echoHp })
  }
  return true
}

/** Damages one echo, clearing it when its HP runs out. */
export function damageEcho(state: EchoState, echoId: string, amount: number): boolean {
  const echo = state.echoes.find((candidate) => candidate.id === echoId)
  if (echo === undefined || !echo.alive) return false

  echo.hp = Math.max(0, echo.hp - amount)
  if (echo.hp === 0) {
    echo.alive = false
    state.bodyHidden = state.echoes.some((candidate) => candidate.alive)
    return true
  }
  return false
}

/** True once every echo is down and the body is exposed again. */
export function allEchoesCleared(state: EchoState): boolean {
  return state.split && state.echoes.length > 0 && state.echoes.every((echo) => !echo.alive)
}

/** True while the body cannot be hit. */
export function bodyUntargetable(state: EchoState): boolean {
  return state.bodyHidden
}

/** How many echoes remain. */
export function echoesRemaining(state: EchoState): number {
  return state.echoes.filter((echo) => echo.alive).length
}
