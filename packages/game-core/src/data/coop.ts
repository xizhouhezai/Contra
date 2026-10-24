/**
 * Two-player co-op, reserved at the data layer.
 *
 * Source of truth: docs/game/requirements/index.md REQ-PLY-010 and
 * docs/game/design/cross-platform.md DES-CROSS-003.
 *
 * The requirement is explicit that co-op ships off: the acceptance criterion is
 * that the configuration exists and is not enabled, not that a second player can
 * join. This module is that configuration, and nothing reads `enabled` to branch
 * on it - the switch is the seam a later milestone would turn on, and building the
 * second player before the switch is understood would be guessing at what it needs.
 *
 * Keeping it beside difficulty.ts rather than inside World is deliberate: these
 * are authored numbers, the kind a balance pass edits, and the rule layer reads
 * them the same way it reads every other tuning table.
 */

/** How a two-player session would share resources. */
export type CoopLifeMode =
  /** Each player has their own hearts and dies on their own. */
  | 'separate'
  /** One pool of hearts, spent by whoever takes the hit. */
  | 'shared'
  /** One pool, but a partner respawns at the cost of a heart rather than dying. */
  | 'pooled-respawn'

export interface CoopSettings {
  /** False for the whole of the first release. */
  readonly enabled: boolean
  /** Player slots the rule layer can address. One while co-op is off. */
  readonly maxPlayers: 1 | 2
  readonly lifeMode: CoopLifeMode
  /** Whether a shot from one player can damage the other. */
  readonly friendlyFire: boolean
  /** Fraction of the partner's damage that friendly fire carries, when allowed. */
  readonly friendlyFireMultiplier: number
  /** Hearts in the shared pool, when lifeMode needs one. */
  readonly sharedLifePool: number
  /** Seconds a downed partner waits before respawning, when the mode resupplies. */
  readonly respawnDelaySeconds: number
}

/**
 * The first-release preset: off, one player, and every other field present so the
 * shape is decided rather than discovered later.
 *
 * friendlyFire is false rather than true with a zero multiplier: a zero would make
 * the later tuning of the multiplier silently do nothing, which is the kind of
 * switch that looks live and is not.
 */
export const COOP: CoopSettings = {
  enabled: false,
  maxPlayers: 1,
  lifeMode: 'shared',
  friendlyFire: false,
  friendlyFireMultiplier: 0,
  sharedLifePool: 0,
  respawnDelaySeconds: 0,
}

/** True when a second player may join. Always false in the first release. */
export function coopEnabled(settings: CoopSettings = COOP): boolean {
  return settings.enabled
}

/** How many players a session may have once the switch is on. */
export function playerSlotCount(settings: CoopSettings = COOP): number {
  return settings.enabled ? settings.maxPlayers : 1
}
