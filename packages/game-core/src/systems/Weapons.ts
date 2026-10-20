import { TIME_EPSILON } from '../data/constants.js'
import type { EntityId, InputState, Vec2, WeaponId } from '../data/types.js'
import { THROW_GRAVITY, THROW_LAUNCH_SPEED_Y, WEAPONS } from '../data/weapons.js'
import { type Bullet, createBullet } from '../entities/Bullet.js'
import type { PlayerState, WeaponSlot } from '../entities/Player.js'
import { consumeShot, resolveActiveSlot } from './Arsenal.js'
import { accumulateSpread, recoverSpread, spreadOffsetRadians } from './Combat.js'

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
export function aimVector(input: InputState, facing: 1 | -1): Vec2 {
  const ax = input.moveX !== 0 ? input.moveX : input.moveY === 0 ? facing : 0
  const ay = input.moveY
  if (ax === 0 && ay === 0) return { x: facing, y: 0 }
  const length = Math.hypot(ax, ay)
  return { x: ax / length, y: ay / length }
}

/** A live target the weapon systems may lock onto. */
export interface LockCandidate {
  readonly id: EntityId
  readonly x: number
  readonly y: number
}

/** What the trigger did this step. */
export interface FireOutcome {
  /** The rounds that left the muzzle; empty for beam weapons. */
  readonly bullets: readonly Bullet[]
  /** The weapon that fired, or null when the trigger stayed down. */
  readonly weaponId: WeaponId | null
  /** Ids of the targets a homing volley locked, in lock order. */
  readonly lockedTargets: readonly EntityId[]
  /** True when a homing weapon wanted a lock and the cap refused it. */
  readonly lockRefused: boolean
  /** Where a beam weapon's instant damage travels from, when a beam fired. */
  readonly beam: { readonly origin: Vec2; readonly direction: Vec2; readonly damage: number } | null
}

/** Remaining cooldown between shots, in seconds. */
export interface WeaponState {
  cooldown: number
  /** Monotonic counter used to build deterministic bullet ids. */
  shotsFired: number
  /** Targets currently held by a homing lock, for the screen-wide cap. */
  lockedTargets: EntityId[]
}

export function createWeaponState(): WeaponState {
  return { cooldown: 0, shotsFired: 0, lockedTargets: [] }
}

/** Seconds between two shots of a weapon, from GDD §3.2 射速(/s). */
export function fireInterval(weaponId: WeaponId): number {
  return 1 / WEAPONS[weaponId].shotsPerSecond
}

/** Nearest live target to `origin`, or null when nothing is alive. */
export function nearestTarget(
  origin: Vec2,
  candidates: readonly LockCandidate[],
): LockCandidate | null {
  let best: LockCandidate | null = null
  let bestSquared = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const dx = candidate.x - origin.x
    const dy = candidate.y - origin.y
    const squared = dx * dx + dy * dy
    if (squared >= bestSquared) continue
    bestSquared = squared
    best = candidate
  }
  return best
}

/**
 * Requests a homing lock for one volley.
 *
 * Targets already held keep their lock, so a volley in flight stays steered; a
 * new target is taken only while the pool is under {@link HOMING_LOCK_LIMIT}.
 * When the cap is met the caller fires straight instead (gameplay.md §状态效果).
 */
export function requestLock(
  state: WeaponState,
  target: LockCandidate | null,
  limit: number,
): { lockedTargetId: EntityId | null; refused: boolean } {
  if (target === null) return { lockedTargetId: null, refused: false }
  if (state.lockedTargets.includes(target.id)) {
    return { lockedTargetId: target.id, refused: false }
  }
  if (state.lockedTargets.length >= limit) return { lockedTargetId: null, refused: true }
  state.lockedTargets.push(target.id)
  return { lockedTargetId: target.id, refused: false }
}

/** Drops locks whose target is gone, freeing the cap for a new acquisition. */
export function releaseExpiredLocks(state: WeaponState, alive: readonly EntityId[]): void {
  state.lockedTargets = state.lockedTargets.filter((id) => alive.includes(id))
}

/** Rotates a unit vector by `radians`. */
function rotate(direction: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos,
  }
}

/** Where a projectile leaves the player box, centred on the body. */
function muzzlePosition(player: PlayerState, direction: Vec2): Vec2 {
  return {
    x: player.position.x + direction.x,
    y: player.position.y + direction.y,
  }
}

/** Builds the volley for one trigger pull. */
function buildVolley(
  player: PlayerState,
  slot: WeaponSlot,
  direction: Vec2,
  state: WeaponState,
  lock: { lockedTargetId: EntityId | null; refused: boolean },
): Bullet[] {
  const definition = WEAPONS[slot.weaponId]
  const count = Math.max(1, definition.projectileCount)
  const cone = (definition.spreadDeg * slot.spreadAccum * Math.PI) / 180
  const thrown = definition.kind === 'throwable'
  const bullets: Bullet[] = []

  for (let index = 0; index < count; index += 1) {
    const heading = rotate(direction, spreadOffsetRadians(index, count, cone))
    state.shotsFired += 1
    bullets.push(
      createBullet(
        `bullet-${state.shotsFired}`,
        'player',
        muzzlePosition(player, heading),
        thrown
          ? { x: heading.x * definition.projectileSpeed, y: -THROW_LAUNCH_SPEED_Y }
          : {
              x: heading.x * definition.projectileSpeed,
              y: heading.y * definition.projectileSpeed,
            },
        definition.damage,
        {
          weaponId: slot.weaponId,
          remainingPierces: definition.pierceCount,
          lockedTargetId: definition.homing ? lock.lockedTargetId : null,
          gravity: thrown ? THROW_GRAVITY : 0,
        },
      ),
    )
  }

  return bullets
}

/**
 * Advances the trigger by one fixed step.
 *
 * Responsibilities, in order: while the trigger rests, recover the cone of every
 * slot; while it is held, respect the weapon's cadence, build the volley, and
 * widen the cone of a scatter weapon for the next pull.
 *
 * @param dt the fixed step in seconds
 * @param candidates live targets a homing weapon may lock onto
 * @param homingLockLimit screen-wide cap on simultaneous locks
 */
export function updateWeapons(
  player: PlayerState,
  input: InputState,
  dt: number,
  state: WeaponState,
  candidates: readonly LockCandidate[],
  homingLockLimit: number,
): FireOutcome {
  const idle: FireOutcome = {
    bullets: [],
    weaponId: null,
    lockedTargets: [],
    lockRefused: false,
    beam: null,
  }
  // Sub-epsilon residuals come from integrating 1/n seconds at 1/60s; treat a
  // residual that small as a ready trigger instead of losing a whole step.
  state.cooldown = Math.max(0, state.cooldown - dt)
  if (state.cooldown <= TIME_EPSILON) state.cooldown = 0

  // A held trigger never recovers; a released one always does (gameplay.md §状态效果).
  if (!input.fire) {
    for (const slot of player.weaponSlots) {
      if (slot !== null) recoverSpread(slot, dt)
    }
    return idle
  }

  if (state.cooldown > 0) return idle

  const slot = resolveActiveSlot(player)
  const direction = aimVector(input, player.facing)
  const lock = WEAPONS[slot.weaponId].homing
    ? requestLock(
        state,
        nearestTarget(muzzlePosition(player, direction), candidates),
        homingLockLimit,
      )
    : { lockedTargetId: null, refused: false }

  const weaponId = slot.weaponId
  const definition = WEAPONS[weaponId]
  // A beam delivers its damage instantly along the aim, so it spawns no round
  // (GDD §3.2 · 持续光束 / 3 per tick).
  const bullets = definition.kind === 'beam' ? [] : buildVolley(player, slot, direction, state, lock)
  // Only a weapon with a cone accumulates one (gameplay.md §状态效果 · 散射衰减).
  if (definition.spreadDeg > 0) accumulateSpread(slot)
  consumeShot(player)
  state.cooldown = fireInterval(weaponId)

  return {
    bullets,
    weaponId,
    lockedTargets: lock.lockedTargetId === null ? [] : [lock.lockedTargetId],
    lockRefused: lock.refused,
    beam:
      definition.kind === 'beam'
        ? { origin: muzzlePosition(player, direction), direction, damage: definition.damage }
        : null,
  }
}