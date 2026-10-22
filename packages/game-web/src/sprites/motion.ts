/**
 * Procedural character motion (REQ-MOT-001).
 *
 * The characters are flat illustrations. Rather than rigging a skeleton - which
 * would need the art cut into parts, see docs/game/design/animation-research -
 * the illustration is transformed a little each frame so it reads as alive:
 * breathing while idle, kicking back when firing, shaking when hurt.
 *
 * This module is pure: it turns (time, state) into an offset, a rotation and a
 * scale, and knows nothing about Phaser. That keeps the arithmetic testable and
 * keeps the presentation layer's one-way contract intact - the rule layer never
 * learns that animation exists.
 */

/** What the character is doing, as far as the animation cares. */
export interface MotionState {
  /** Movement along x this frame, -1, 0 or 1. */
  readonly moveX: number
  /** True on the step a shot was fired. */
  readonly firing: boolean
  /** Seconds remaining on the hurt reaction, 0 when not hurt. */
  readonly hurtSeconds: number
}

export interface MotionFrame {
  /** Pixel offset to add to the drawn position. */
  readonly offsetX: number
  readonly offsetY: number
  /** Rotation in radians. */
  readonly rotation: number
  /** Multipliers on the drawn size. */
  readonly scaleX: number
  readonly scaleY: number
}

/** Rest state: no motion at all. */
export const STILL: MotionFrame = {
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
}

/** How much the character breathes, as a fraction of its height. */
export const BREATH_AMPLITUDE = 0.012

/** Breaths per second. A resting person is about 0.25Hz. */
export const BREATH_HZ = 0.25

/** How far the character kicks back when firing, in pixels. */
export const RECOIL_DISTANCE = 3

/** How long a recoil takes to settle, in seconds. */
export const RECOIL_SECONDS = 0.12

/** How far the character shakes while hurt, in pixels. */
export const HURT_SHAKE = 2.5

/** How long the hurt reaction lasts, in seconds. */
export const HURT_SECONDS = 0.35

/** How far the character leans while moving, in radians. */
export const LEAN_RADIANS = 0.06

/**
 * Breathing: a slow vertical scale that never goes below 1.
 *
 * Scaling up rather than up-and-down keeps the feet planted. A character whose
 * body shrank below its collision box would appear to sink into the floor.
 */
export function breathScale(seconds: number): number {
  return 1 + BREATH_AMPLITUDE * (0.5 + 0.5 * Math.sin(seconds * Math.PI * 2 * BREATH_HZ))
}

/**
 * Recoil: a short push away from the shot that decays to nothing.
 *
 * Driven by the time since the shot rather than a timer, so the value is a pure
 * function of the clock and a dropped frame cannot leave the character stuck.
 */
export function recoilOffset(secondsSinceShot: number): number {
  if (secondsSinceShot < 0 || secondsSinceShot >= RECOIL_SECONDS) return 0
  const progress = secondsSinceShot / RECOIL_SECONDS
  // Ease out: the kick is strongest immediately and settles quickly.
  return -RECOIL_DISTANCE * (1 - progress) * (1 - progress)
}

/**
 * Hurt: a quick horizontal shake that decays over HURT_SECONDS.
 *
 * The oscillation is deliberately fast (about 20Hz) because a slow shake reads
 * as the character swaying rather than being hit.
 */
export function hurtOffset(hurtSeconds: number, seconds: number): number {
  if (hurtSeconds <= 0) return 0
  const progress = 1 - hurtSeconds / HURT_SECONDS
  return HURT_SHAKE * (1 - progress) * Math.sin(seconds * Math.PI * 2 * 20)
}

/**
 * The full motion for one frame.
 *
 * Breathing happens only while standing still: a running character is already
 * visibly in motion, and adding a breath on top made the run look like it was
 * stuttering.
 */
export function motionFor(
  seconds: number,
  state: MotionState,
  secondsSinceShot: number,
): MotionFrame {
  const idle = state.moveX === 0 && state.hurtSeconds <= 0
  const scaleY = idle ? breathScale(seconds) : 1
  const scaleX = idle ? 1 / Math.sqrt(scaleY) : 1

  return {
    offsetX: recoilOffset(secondsSinceShot) + hurtOffset(state.hurtSeconds, seconds),
    offsetY: 0,
    rotation: state.moveX === 0 ? 0 : LEAN_RADIANS * state.moveX,
    scaleX,
    scaleY,
  }
}
