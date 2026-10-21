import { PLAYER_HEARTS, PLAYER_HEIGHT, PLAYER_WIDTH } from '../data/constants.js'
import type { MutableVec2, Rect, Vec2, WeaponId } from '../data/types.js'

/**
 * One occupied weapon slot.
 *
 * A slot is a mutable rule-layer record, so the systems can spend ammo and widen
 * the cone in place without rebuilding the player on every shot.
 */
export interface WeaponSlot {
  readonly weaponId: WeaponId
  ammoLeft: number
  /** Scatter charge, 0..1: 0 is the tightest cone, 1 the widest (gameplay.md §状态效果). */
  spreadAccum: number
}

/** How many weapons a run can carry at once (gameplay.md §4 槽共享). */
export const WEAPON_SLOT_COUNT = 4

/** Mutable rule-layer state of the player. */
export interface PlayerState {
  /** Top-left corner of the collision box, in world pixels. */
  readonly position: MutableVec2
  readonly velocity: MutableVec2
  onGround: boolean
  facing: 1 | -1
  /** Integer hearts; a hit always costs exactly one. */
  hearts: number
  /** Run time, in seconds, before which incoming damage is ignored. */
  invulnerableUntil: number
  /** Exactly WEAPON_SLOT_COUNT entries; a slot is empty when \`weaponId\` is null. */
  weaponSlots: readonly (WeaponSlot | null)[]
  /** Index into weaponSlots of the weapon the trigger drives. */
  activeSlot: number
}

/** Options a caller may override when seeding the player. */
export interface PlayerOptions {
  readonly facing?: 1 | -1
  readonly hearts?: number
}

/** Creates a grounded-unknown player whose top-left corner sits at \`spawn\`. */
export function createPlayer(spawn: Vec2, options: PlayerOptions = {}): PlayerState {
  return {
    position: { x: spawn.x, y: spawn.y },
    velocity: { x: 0, y: 0 },
    onGround: false,
    facing: options.facing ?? 1,
    hearts: options.hearts ?? PLAYER_HEARTS,
    invulnerableUntil: 0,
    weaponSlots: Array.from({ length: WEAPON_SLOT_COUNT }, () => null),
    activeSlot: 0,
  }
}

/** The axis-aligned collision box the player occupies right now. */
export function playerRect(player: PlayerState): Rect {
  return {
    x: player.position.x,
    y: player.position.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  }
}

/** The slot the trigger currently drives, or null when every slot is empty. */
export function activeWeaponSlot(player: PlayerState): WeaponSlot | null {
  return player.weaponSlots[player.activeSlot] ?? null
}
