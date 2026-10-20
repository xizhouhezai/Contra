/**
 * Tuning values owned by the rule layer.
 *
 * Source of truth: docs/game/requirements/gdd.md §3.1 玩家基础数值.
 *
 * GDD §3.1 also lists 跳跃高度 ≈ 96px. That figure is unreachable from the pair
 * that is actually integrated (JUMP_SPEED = 420 px/s, GRAVITY = 1200 px/s²):
 * the continuous apex is v0² / 2g = 73.5px, and the fixed-step apex at 1/60s
 * with semi-implicit Euler is 70.0px. The documented pair is treated as the
 * truth and 96px as an approximation (M0 wave 2 decision record).
 */

/** One fixed simulation step. Rendering never changes this. */
export const FIXED_STEP_SECONDS = 1 / 60

/** Spiral-of-death guard: a single frame may advance at most five steps. */
export const MAX_STEPS_PER_FRAME = 5

/** Tolerance used when accumulating frame time into fixed steps. */
export const TIME_EPSILON = 1e-9

/** Downward acceleration, px/s². */
export const GRAVITY = 1200

/** Horizontal run speed, px/s. */
export const MOVE_SPEED = 180

/** Upward speed applied at the moment of a jump, px/s. */
export const JUMP_SPEED = 420

/** Player collision box width, px. */
export const PLAYER_WIDTH = 24

/** Player collision box height, px. */
export const PLAYER_HEIGHT = 40

/** Pulse bullet damage (GDD §3.2). */
export const PULSE_DAMAGE = 10

/** Pulse fire rate, shots per second (GDD §3.2). */
export const PULSE_SHOTS_PER_SECOND = 6

/** Pulse projectile speed, px/s (GDD §3.2). */
export const PULSE_PROJECTILE_SPEED = 420

/** Seconds between two pulse shots. */
export const PULSE_FIRE_INTERVAL_SECONDS = 1 / PULSE_SHOTS_PER_SECOND
