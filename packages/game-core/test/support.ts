import type { InputState } from '../src/data/types.js'

export const IDLE: InputState = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false }

export function input(overrides: Partial<InputState> = {}): InputState {
  return { ...IDLE, ...overrides }
}

/**
 * A scripted replay keyed by fixed-step index.
 *
 * Rendering at 30fps or 120fps only changes how many steps a frame advances;
 * the script sees the same index either way, so the two runs must agree.
 */
export interface ScriptedStep {
  readonly moveX: -1 | 0 | 1
  readonly moveY: -1 | 0 | 1
  readonly jump: boolean
  readonly fire: boolean
}

export const SCRIPT: readonly ScriptedStep[] = [
  { moveX: 1, moveY: 0, jump: false, fire: true },
  { moveX: 1, moveY: 0, jump: false, fire: true },
  { moveX: 1, moveY: 0, jump: true, fire: true },
  { moveX: 1, moveY: 0, jump: false, fire: true },
  { moveX: 1, moveY: -1, jump: false, fire: true },
  { moveX: 0, moveY: -1, jump: false, fire: true },
  { moveX: -1, moveY: 0, jump: false, fire: true },
  { moveX: -1, moveY: 1, jump: false, fire: true },
  { moveX: 0, moveY: 1, jump: false, fire: false },
  { moveX: 0, moveY: 0, jump: false, fire: false },
]

export function scriptedInput(stepIndex: number): InputState {
  const step = SCRIPT[Math.min(stepIndex, SCRIPT.length - 1)]
  if (step === undefined) return IDLE
  return {
    moveX: step.moveX,
    moveY: step.moveY,
    jump: step.jump,
    fire: step.fire,
    bomb: false,
  }
}

/** Frame durations for one second of wall clock at the given refresh rate. */
export function frameDurations(fps: number, seconds: number): number[] {
  const frames = Math.round(fps * seconds)
  return Array.from({ length: frames }, () => 1 / fps)
}
