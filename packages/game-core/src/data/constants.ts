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

/**
 * How far below the lowest surface of a stage still counts as being in it, px.
 *
 * Past this the player has left the level and is killed rather than falling
 * forever. The margin only has to be wider than the deepest legitimate drop in
 * the game - a jump reaches roughly 90px - so 260 leaves plenty of room without
 * being so deep that the fall is still visible for seconds after the mistake.
 */
export const FALL_MARGIN = 260

/**
 * How many consecutive grounded steps make a surface a safe respawn point.
 *
 * Eight steps is about 0.13s at the fixed 60Hz tick: long enough that brushing
 * the lip of a pit does not count as standing on it, short enough that a real
 * landing registers before the player can walk off again.
 */
export const SAFE_STAND_STEPS = 8

/** Bullet collision box width, px. Gray-box value until the real sprites land (M4). */
export const BULLET_WIDTH = 8

/** Bullet collision box height, px. */
export const BULLET_HEIGHT = 8

/** Pulse bullet damage (GDD §3.2). */
export const PULSE_DAMAGE = 10

/** Pulse fire rate, shots per second (GDD §3.2). */
export const PULSE_SHOTS_PER_SECOND = 6

/** Pulse projectile speed, px/s (GDD §3.2). */
export const PULSE_PROJECTILE_SPEED = 420

/** Seconds between two pulse shots. */
export const PULSE_FIRE_INTERVAL_SECONDS = 1 / PULSE_SHOTS_PER_SECOND

/** Starting hearts on standard difficulty (GDD §3.1). */
export const PLAYER_HEARTS = 3

/** Seconds of immunity granted after a hit, GDD §3.1 / gameplay.md §生命与伤害. */
export const INVULNERABLE_SECONDS = 1.5
/** Hard cap on undrained rule-layer events; the presentation layer drains per frame. */
export const MAX_QUEUED_EVENTS = 4096
