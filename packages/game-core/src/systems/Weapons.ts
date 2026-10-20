import { PULSE_DAMAGE, PULSE_PROJECTILE_SPEED } from '../data/constants.js'
import type { EntityId, InputState, Vec2 } from '../data/types.js'
import type { Bullet } from '../entities/Bullet.js'
import type { PlayerState } from '../entities/Player.js'

/** The eight aim directions, in the order the aim vector is derived. */
export const AIM_DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
] as const satisfies readonly Vec2[]

/**
 * The unit-length aim vector implied by the input, or null when neutral.
 *
 * The rule: the aim comes from the input alone. `facing` is consulted only when
 * moveX is 0 and there is no vertical component, so a neutral-stick standing
 * player fires forward. Player velocity is never read — that is what makes the
 * aim decoupled from movement (docs/game/requirements/gameplay.md §瞄准与射击).
 */
export function aimVector(input: InputState, facing: 1 | -1): Vec2 | null {
  const ax = input.moveX !== 0 ? input.moveX : input.moveY === 0 ? facing : 0
  const ay = input.moveY
  if (ax === 0 && ay === 0) return null
  const length = Math.hypot(ax, ay)
  return { x: ax / length, y: ay / length }
}

/** Remaining cooldown between shots, in seconds. */
export interface WeaponState {
  cooldown: number
  /** Monotonic counter used to build deterministic bullet ids. */
  shotsFired: number
}

export function createWeaponState(): WeaponState {
  return { cooldown: 0, shotsFired: 0 }
}

/**
 * Base pulse weapon: single straight bullet on a fixed cadence.
 *
 * @param fireInterval seconds between shots; the World passes the value derived
 *   from GDD §3.2 so ammo and spread can swap it per weapon in M1.
 */
export function updateWeapons(
  player: PlayerState,
  input: InputState,
  dt: number,
  state: WeaponState,
  fireInterval: number,
  bullets: Bullet[],
): Bullet | null {
  state.cooldown = Math.max(0, state.cooldown - dt)
  if (!input.fire) return null

  const direction = aimVector(input, player.facing)
  if (direction === null) return null
  if (state.cooldown > 0) return null

  state.cooldown = fireInterval
  state.shotsFired += 1
  const bullet: Bullet = {
    id: `bullet-${state.shotsFired}` as EntityId,
    owner: 'player',
    position: {
      x: player.position.x,
      y: player.position.y,
    },
    velocity: {
      x: direction.x * PULSE_PROJECTILE_SPEED,
      y: direction.y * PULSE_PROJECTILE_SPEED,
    },
    damage: PULSE_DAMAGE,
  }
  bullets.push(bullet)
  return bullet
}
