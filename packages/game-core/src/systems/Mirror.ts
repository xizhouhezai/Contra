/**
 * 镜像使徒 - the enemy that copies the player's current weapon.
 *
 * Source of truth: docs/game/requirements/stages.md - 第 10 关 and
 * docs/game/tasks/backlog.md T-M3-04.
 *
 * The copy is of the *weapon*, read live, not of a fixed move list. That is the
 * whole gimmick: the answer to a mirror is to switch to something you can handle
 * being shot back at you, so the copy has to follow the switch.
 */
import type { WeaponId } from '../data/types.js'

/** Seconds a copied weapon stays active before the mirror reverts to its own. */
export const MIRROR_COPY_SECONDS = 8

/** The weapon a mirror falls back to when its copy expires. */
export const MIRROR_BASE_WEAPON: WeaponId = 'pulse'

export interface MirrorState {
  /** What the mirror is currently firing. */
  copiedWeapon: WeaponId
  /** Seconds left on the copy; 0 means it is using its base weapon. */
  copySecondsLeft: number
  /** True while a copy is running. */
  copying: boolean
}

export function createMirrorState(): MirrorState {
  return { copiedWeapon: MIRROR_BASE_WEAPON, copySecondsLeft: 0, copying: false }
}

/**
 * Starts copying the player's weapon.
 *
 * Called when the player fires: the mirror watches what it is being shot with and
 * answers in kind, so the copy lands a beat after the player's own shot rather
 * than tracking the HUD.
 */
export function observePlayerWeapon(state: MirrorState, weaponId: WeaponId): void {
  state.copiedWeapon = weaponId
  state.copySecondsLeft = MIRROR_COPY_SECONDS
  state.copying = true
}

/**
 * Advances the copy timer.
 *
 * Expiry reverts to the base weapon, which is what stops a mirror from carrying
 * the player's best gun for the rest of the stage.
 */
export function updateMirror(state: MirrorState, dt: number): void {
  if (!state.copying) return
  state.copySecondsLeft = Math.max(0, state.copySecondsLeft - dt)
  if (state.copySecondsLeft === 0) {
    state.copying = false
    state.copiedWeapon = MIRROR_BASE_WEAPON
  }
}

/** The weapon the mirror would fire right now. */
export function mirrorWeapon(state: MirrorState): WeaponId {
  return state.copying ? state.copiedWeapon : MIRROR_BASE_WEAPON
}
