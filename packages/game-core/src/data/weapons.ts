/**
 * Weapon catalogue.
 *
 * Source of truth: docs/game/requirements/gdd.md §3.2 武器数值.
 * Ten weapons share a four-slot pool (ADR-0006). Characters differ by which
 * one they start with; the pool itself is identical for everyone.
 */

import type { WeaponDefinition, WeaponId } from './types.js'

export type { WeaponDefinition, WeaponKind } from './types.js'

/** Homing rounds lock at most this many targets at once (gameplay.md §状态效果). */
export const HOMING_LOCK_LIMIT = 3

/** Reach of a beam weapon, px. GDD §3.2 gives a beam no projectile speed. */
export const BEAM_RANGE = 640

/** Gravity on thrown weapons, px/s². The arc GDD §3.2 describes as 抛物线. */
export const THROW_GRAVITY = 1200

/** Upward launch speed of a thrown weapon, px/s. */
export const THROW_LAUNCH_SPEED_Y = 260

/** Radius of the blast a thrown weapon leaves, px; 0 for every other weapon. */
export function explosionRadius(id: WeaponId): number {
  if (id === 'grenade') return 140
  if (id === 'cluster') return 96
  return 0
}

/** The fallback weapon: never consumed, available when every slot is empty. */
export const FALLBACK_WEAPON_ID: WeaponId = 'pulse'

export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  pulse: {
    id: 'pulse',
    name: '脉冲弹',
    kind: 'projectile',
    damage: 10,
    shotsPerSecond: 6,
    projectileSpeed: 420,
    projectileCount: 1,
    ammo: Number.POSITIVE_INFINITY,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'basic',
  },
  scatter: {
    id: 'scatter',
    name: '扩散散弹',
    kind: 'projectile',
    damage: 8,
    shotsPerSecond: 3,
    projectileSpeed: 380,
    projectileCount: 5,
    ammo: 120,
    spreadDeg: 30,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'common',
  },
  rifle: {
    id: 'rifle',
    name: '长程连射',
    kind: 'projectile',
    damage: 6,
    shotsPerSecond: 12,
    projectileSpeed: 700,
    projectileCount: 1,
    ammo: 200,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'common',
  },
  homing: {
    id: 'homing',
    name: '追踪弹幕',
    kind: 'projectile',
    damage: 12,
    shotsPerSecond: 4,
    projectileSpeed: 300,
    projectileCount: 1,
    ammo: 150,
    spreadDeg: 0,
    pierceCount: 0,
    homing: true,
    homingTurnRate: 6,
    rarity: 'rare',
  },
  pierce: {
    id: 'pierce',
    name: '穿甲弹',
    kind: 'projectile',
    damage: 25,
    shotsPerSecond: 4,
    projectileSpeed: 520,
    projectileCount: 1,
    ammo: 40,
    spreadDeg: 0,
    pierceCount: 1,
    homing: false,
    homingTurnRate: 0,
    rarity: 'rare',
  },
  cluster: {
    id: 'cluster',
    name: '集束炸弹',
    kind: 'throwable',
    damage: 30,
    shotsPerSecond: 1.2,
    projectileSpeed: 220,
    projectileCount: 1,
    ammo: 30,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'common',
  },
  laser: {
    id: 'laser',
    name: '激光枪',
    kind: 'beam',
    damage: 3,
    shotsPerSecond: 20,
    projectileSpeed: 0,
    projectileCount: 0,
    ammo: 100,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'epic',
  },
  grenade: {
    id: 'grenade',
    name: '散射榴弹',
    kind: 'throwable',
    damage: 35,
    shotsPerSecond: 1,
    projectileSpeed: 200,
    projectileCount: 1,
    ammo: 25,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'epic',
  },
  replay: {
    id: 'replay',
    name: '回溯弹',
    kind: 'projectile',
    damage: 8,
    shotsPerSecond: 5,
    projectileSpeed: 480,
    projectileCount: 1,
    ammo: 150,
    spreadDeg: 0,
    pierceCount: 0,
    homing: false,
    homingTurnRate: 0,
    rarity: 'common',
  },
  prism: {
    id: 'prism',
    name: '棱镜弹',
    kind: 'projectile',
    damage: 7,
    shotsPerSecond: 4,
    projectileSpeed: 500,
    projectileCount: 1,
    ammo: 150,
    spreadDeg: 0,
    pierceCount: 2,
    homing: false,
    homingTurnRate: 0,
    rarity: 'common',
  },
}

/** Number of targets a prism round hits at once, before the Gemini passive bonus. */
export const PRISM_BASE_TARGETS = 3

/** Every weapon id, in GDD §3.2 table order. */
export const WEAPON_IDS: readonly WeaponId[] = [
  'pulse',
  'scatter',
  'rifle',
  'homing',
  'pierce',
  'replay',
  'prism',
  'cluster',
  'laser',
  'grenade',
]

/** The weapons whose damage arrives as a blast rather than a direct hit. */
export const THROWABLE_WEAPONS: readonly WeaponId[] = ['cluster', 'grenade']

export function weaponDefinition(id: WeaponId): WeaponDefinition {
  return WEAPONS[id]
}

/** Alias kept for the M0 call sites. */
export const getWeapon = weaponDefinition

/** Seconds between two shots of the given weapon. */
export function fireInterval(id: WeaponId): number {
  return 1 / WEAPONS[id].shotsPerSecond
}