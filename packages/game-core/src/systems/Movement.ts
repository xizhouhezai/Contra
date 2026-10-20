import { GRAVITY, JUMP_SPEED, MOVE_SPEED } from '../data/constants.js'
import type { InputState, PlatformDefinition } from '../data/types.js'
import { type PlayerState, playerRect } from '../entities/Player.js'

/** Full-box overlap test on both axes. */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: PlatformDefinition,
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * Replays the horizontal move that ended inside `platform` by sweeping along X.
 * Returns the resolved x coordinate; the caller never gets to tunnel because the
 * sweep always ends flush against the platform face.
 */
function resolveX(
  player: PlayerState,
  deltaX: number,
  platforms: readonly PlatformDefinition[],
): number {
  const startX = player.position.x
  const targetX = startX + deltaX
  player.position.x = targetX
  if (deltaX === 0) return targetX

  let resolved = targetX
  for (const platform of platforms) {
    if (!overlaps(playerRect(player), platform)) continue
    resolved = deltaX > 0 ? platform.x - playerRect(player).width : platform.x + platform.width
  }
  return resolved
}

/** Same sweep, along Y. Returns whether the player is now standing on a platform. */
function resolveY(
  player: PlayerState,
  deltaY: number,
  platforms: readonly PlatformDefinition[],
): boolean {
  const startY = player.position.y
  const targetY = startY + deltaY
  player.position.y = targetY
  if (deltaY === 0) return false

  let landed = false
  let resolved = targetY
  for (const platform of platforms) {
    if (!overlaps(playerRect(player), platform)) continue
    if (deltaY > 0) {
      resolved = platform.y - playerRect(player).height
      landed = true
    } else {
      resolved = platform.y + platform.height
    }
  }
  player.position.y = resolved
  return landed
}

/**
 * Advances the player by one fixed step: horizontal run, jump impulse, gravity,
 * then axis-separated platform resolution (X first, then Y).
 *
 * @param dt the fixed step in seconds — always 1/60 from the World.
 * @param platforms solid AABBs the player cannot pass through.
 */
export function updateMovement(
  player: PlayerState,
  input: InputState,
  dt: number,
  platforms: readonly PlatformDefinition[],
): void {
  if (input.moveX !== 0) player.facing = input.moveX

  player.velocity.x = input.moveX * MOVE_SPEED
  const deltaX = player.velocity.x * dt
  player.position.x = resolveX(player, deltaX, platforms)

  if (input.jump && player.onGround) {
    player.velocity.y = -JUMP_SPEED
    player.onGround = false
  }

  player.velocity.y += GRAVITY * dt
  const deltaY = player.velocity.y * dt
  const landed = resolveY(player, deltaY, platforms)

  if (landed) {
    player.velocity.y = 0
    player.onGround = true
  } else {
    player.onGround = false
  }
}
