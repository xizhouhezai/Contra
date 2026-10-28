import type { EnemyId } from './types.js'

/**
 * How an enemy attacks.
 *
 * The enemies in this game were static boxes that could only hurt a player who
 * walked into them. Their weapon data did not exist: data/enemies.ts carried an
 * hp, a damage number and a movement behaviour, and the movement behaviour was
 * itself never called. This file is the missing half - what each archetype fires,
 * how long it warns first, and how often it may fire again.
 *
 * Timing lives here rather than in the behaviour code because it is balance, and
 * balance is data.
 */
export type EnemyAttackKind =
  /** One round along the aim, aimed at the player at the moment of firing. */
  | 'straight'
  /** Several rounds fanned across spreadDeg. */
  | 'spread'
  /** A slow round that turns toward the player in flight. */
  | 'homing'
  /** A thrown round under gravity, so it arcs and must be jumped or walked under. */
  | 'lobbed'
  /** A warning band on the floor, then a spike; only grounded players are hit. */
  | 'ground-spike'
  /** Contact damage only, with no projectile at all. */
  | 'melee'

export interface EnemyWeapon {
  readonly id: string
  readonly kind: EnemyAttackKind
  /** Hearts removed. Contact damage is separate and stays at the definition's value. */
  readonly damage: number
  /**
   * Seconds the player gets to read the attack before it lands.
   *
   * This is the single most important number in the file. A Contra fight is
   * about dodging, so an attack with no warning is not difficulty, it is
   * unfairness - and the design doc forbids it outright.
   */
  readonly telegraphSeconds: number
  /** Seconds before this enemy may fire again. */
  readonly cooldownSeconds: number
  /** How far in px the enemy notices the player. */
  readonly rangePx: number
  readonly bulletSpeed: number
  /** Rounds per volley. */
  readonly bulletCount: number
  /** Total fan across all rounds, in degrees. */
  readonly spreadDeg: number
  /** Turns toward the player in flight. */
  readonly homing: boolean
  /** Downward acceleration for a thrown round, px/s². */
  readonly gravity: number
  /**
   * Fires the player's current weapon instead of its own.
   *
   * Only the mirror does this, and it is the whole point of the archetype: use a
   * scatter gun and the mirror scatters back at you.
   */
  readonly mirrorsPlayer: boolean
}

/**
 * The weapon of every archetype.
 *
 * Keys are EnemyId, so adding an eleventh enemy without giving it a weapon is a
 * type error rather than an enemy that silently never fires.
 */
export const ENEMY_WEAPONS: Readonly<Record<EnemyId, EnemyWeapon>> = {
  // A drone with a pulse gun: the plainest possible shot, so act 1 teaches
  // "enemies shoot" without also teaching a spread pattern.
  patrol: {
    id: 'pulse-gun',
    kind: 'straight',
    damage: 1,
    telegraphSeconds: 0.5,
    cooldownSeconds: 3,
    rangePx: 620,
    bulletSpeed: 300,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // Fixed in place, so it gets an area denial instead of an aimed shot.
  turret: {
    id: 'pellet',
    kind: 'spread',
    damage: 1,
    telegraphSeconds: 0.8,
    cooldownSeconds: 2.5,
    rangePx: 560,
    bulletSpeed: 340,
    bulletCount: 3,
    spreadDeg: 26,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // A slow round that follows: the player must keep moving, not just sidestep.
  carrier: {
    id: 'launcher-pod',
    kind: 'homing',
    damage: 1,
    telegraphSeconds: 0.8,
    cooldownSeconds: 4,
    rangePx: 700,
    bulletSpeed: 190,
    bulletCount: 1,
    spreadDeg: 0,
    homing: true,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // The charge is a contact attack: it hurts by closing distance. Its damage is
  // 2, which is why the telegraph is the longest in the set.
  charger: {
    id: 'charge',
    kind: 'melee',
    damage: 2,
    telegraphSeconds: 1,
    cooldownSeconds: 3.5,
    rangePx: 340,
    bulletSpeed: 0,
    bulletCount: 0,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // Airborne, so it throws: a lobbed round is dodged by moving under it, which
  // is a different reflex from sidestepping a straight shot.
  flyer: {
    id: 'lobbed',
    kind: 'lobbed',
    damage: 1,
    telegraphSeconds: 0.6,
    cooldownSeconds: 3,
    rangePx: 520,
    bulletSpeed: 260,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 620,
    mirrorsPlayer: false,
  },

  // The shield carrier denies the widest area; it is the act 3 set piece.
  warden: {
    id: 'scatter-cannon',
    kind: 'spread',
    damage: 1,
    telegraphSeconds: 1,
    cooldownSeconds: 3.5,
    rangePx: 620,
    bulletSpeed: 300,
    bulletCount: 5,
    spreadDeg: 60,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // Immunity to frontal fire is its defence, not a shield bash, so it has no
  // ranged attack at all. See armoredFront in data/enemies.ts.
  armored: {
    id: 'shield',
    kind: 'melee',
    damage: 1,
    telegraphSeconds: 0,
    cooldownSeconds: 0,
    rangePx: 0,
    bulletSpeed: 0,
    bulletCount: 0,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // A smith with a hammer arm: it strikes the floor, and the spike comes up.
  // The only attack that ignores a target who is airborne.
  forge: {
    id: 'ground-spike',
    kind: 'ground-spike',
    damage: 1,
    telegraphSeconds: 1.2,
    cooldownSeconds: 4,
    rangePx: 420,
    bulletSpeed: 0,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // Copies the player's gun. The damage is the player's own weapon damage, read
  // at fire time; the value here is only a fallback.
  mirror: {
    id: 'caster',
    kind: 'straight',
    damage: 1,
    telegraphSeconds: 0.8,
    cooldownSeconds: 3,
    rangePx: 660,
    bulletSpeed: 320,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: true,
  },

  // A charge followed by a burst. Two attacks in one archetype, so the cooldown
  // is shorter than the charger's despite doing more.
  'elite-charger': {
    id: 'elite-charge',
    kind: 'spread',
    damage: 2,
    telegraphSeconds: 1,
    cooldownSeconds: 4,
    rangePx: 380,
    bulletSpeed: 330,
    bulletCount: 3,
    spreadDeg: 18,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  /* ------------------------------------------------- act I expansion roster */

  // Contact damage only: the swarm's threat is its number and its speed, and
  // giving it a gun as well would make a group of four unfair rather than busy.
  scrapper: {
    id: 'scrapper-claw',
    kind: 'melee',
    damage: 1,
    telegraphSeconds: 0.4,
    cooldownSeconds: 2.4,
    rangePx: 60,
    bulletSpeed: 0,
    bulletCount: 0,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // A ground spike: it only hits a player standing on the floor, so the answer
  // is to jump rather than to back off, which is the opposite of every other
  // ranged attack in the game.
  'crane-hook': {
    id: 'hook-slam',
    kind: 'ground-spike',
    damage: 2,
    telegraphSeconds: 1.1,
    cooldownSeconds: 3.4,
    rangePx: 260,
    bulletSpeed: 0,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // Shorter reach than the forge's spike and a longer warning, because the vent
  // asks the player to keep moving through a wave rather than to stop and duel.
  'steam-vent': {
    id: 'steam-burst',
    kind: 'ground-spike',
    damage: 1,
    telegraphSeconds: 1,
    cooldownSeconds: 3,
    rangePx: 150,
    bulletSpeed: 0,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },

  // The lock-on is the mechanic: a long telegraph and a fast round, so standing
  // still after the warning is what gets the player hit. Its rate is slow enough
  // that a moving player never eats two in a row.
  'audit-drone': {
    id: 'audit-lock',
    kind: 'straight',
    damage: 1,
    telegraphSeconds: 1.3,
    cooldownSeconds: 3.6,
    rangePx: 700,
    bulletSpeed: 420,
    bulletCount: 1,
    spreadDeg: 0,
    homing: false,
    gravity: 0,
    mirrorsPlayer: false,
  },
}

/** The weapon of one archetype, or undefined when the id is not an enemy. */
export function enemyWeapon(archetype: string | undefined): EnemyWeapon | undefined {
  if (archetype === undefined) return undefined
  return ENEMY_WEAPONS[archetype as EnemyId]
}

/**
 * How many enemies of an act may be mid-attack at once.
 *
 * The design doc sets this per act and calls it the difference between a fight
 * and a bullet wall: act 1 holds to one shooter, act 3 to three. Without a cap,
 * a stage with eight drones fires eight volleys and every one of them is aimed,
 * which cannot be dodged at all.
 */
export function maxConcurrentShooters(act: 1 | 2 | 3): number {
  if (act === 1) return 1
  if (act === 2) return 2
  return 3
}
