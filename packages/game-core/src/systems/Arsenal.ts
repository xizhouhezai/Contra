/**
 * The shared four-slot weapon pool (gameplay.md §武器系统 · 4 槽共享, ADR-0006).
 *
 * Every rule about which slot the trigger drives and what happens when ammo runs
 * out lives here, so the World only asks this module and never edits slots.
 */
import { FALLBACK_WEAPON_ID, WEAPONS } from '../data/weapons.js'
import { type PlayerState, WEAPON_SLOT_COUNT, type WeaponSlot } from '../entities/Player.js'

/** Builds one occupied slot for a weapon, full on ammo and tight on cone. */
export function createWeaponSlot(weaponId: WeaponSlot['weaponId']): WeaponSlot {
  return { weaponId, ammoLeft: WEAPONS[weaponId].ammo, spreadAccum: 0 }
}

/** Whether a slot still has a shot in it. */
export function hasAmmo(slot: WeaponSlot | null): boolean {
  return slot !== null && slot.ammoLeft > 0
}

/**
 * Equips a weapon into the active slot, leaving every other slot untouched.
 *
 * Re-picking the weapon already held refills it instead of swapping it: the
 * pickup is still worth taking, and the player keeps their cone state.
 * @returns the slot index that now holds the weapon
 */
export function equipWeapon(player: PlayerState, weaponId: WeaponSlot['weaponId']): number {
  const index = player.activeSlot
  const current = player.weaponSlots[index] ?? null
  if (current !== null && current.weaponId === weaponId) {
    current.ammoLeft = WEAPONS[weaponId].ammo
    return index
  }
  const slots = [...player.weaponSlots]
  slots[index] = createWeaponSlot(weaponId)
  player.weaponSlots = slots
  return index
}

/**
 * Puts the fallback weapon in slot 0 and selects it.
 *
 * The pulse is never consumed (ammo Infinity) and is only ever installed here,
 * so it can always be fallen back to.
 */
export function ensureFallbackWeapon(player: PlayerState): number {
  const slots = [...player.weaponSlots]
  slots[0] = createWeaponSlot(FALLBACK_WEAPON_ID)
  player.weaponSlots = slots
  player.activeSlot = 0
  return 0
}

/**
 * The weapon the trigger drives.
 *
 * When no slot has a round left the pool installs the pulse into slot 0 and
 * selects it: the fallback weapon is never consumed and never disappears, so the
 * trigger can always fire (gameplay.md §武器衰减).
 */
export function resolveActiveSlot(player: PlayerState): WeaponSlot {
  for (;;) {
    const slot = player.weaponSlots[player.activeSlot] ?? null
    if (hasAmmo(slot)) return slot as WeaponSlot
    if (advanceSlot(player)) continue
    ensureFallbackWeapon(player)
    return player.weaponSlots[0] as WeaponSlot
  }
}

/**
 * Moves the cursor to the next slot that can fire.
 *
 * The search runs downward (previous slot first) and wraps, so the pool is a
 * ring: emptying slot 1 falls back to slot 0, and emptying slot 0 wraps to 3.
 * @returns false when no slot has ammo left at all
 */
function advanceSlot(player: PlayerState): boolean {
  const slots = player.weaponSlots
  for (let offset = 1; offset <= WEAPON_SLOT_COUNT; offset += 1) {
    const index =
      (((player.activeSlot - offset) % WEAPON_SLOT_COUNT) + WEAPON_SLOT_COUNT) % WEAPON_SLOT_COUNT
    if (hasAmmo(slots[index] ?? null)) {
      player.activeSlot = index
      return true
    }
  }
  return false
}

/**
 * Spends one shot of the active slot and, on the shot that empties it, hands the
 * trigger to the next slot that can still fire.
 * @returns the slot that was spent
 */
export function consumeShot(player: PlayerState): WeaponSlot {
  const slot = resolveActiveSlot(player)
  slot.ammoLeft -= 1
  if (slot.ammoLeft <= 0) resolveActiveSlot(player)
  return slot
}

/** Whether the trigger has anything to fire from. */
export function hasUsableWeapon(player: PlayerState): boolean {
  return player.weaponSlots.some((slot) => hasAmmo(slot))
}
