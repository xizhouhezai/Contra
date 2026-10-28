/**
 * Enemy catalogue and behaviour states.
 *
 * Source of truth: docs/game/requirements/gdd.md 3.3 敌人 and
 * docs/game/design/data-model.md - EnemyDefinition.
 *
 * Behaviour is a small state machine per archetype: each one names the states it
 * can be in and the transition that leaves them. Keeping the table here rather
 * than in the World means adding an enemy does not touch the simulation loop.
 */
import type { EnemyId } from './types.js'

/** Behaviour archetypes from the stage spec. */
export type EnemyBehaviour =
  | 'patrol'
  | 'turret'
  | 'carrier'
  | 'charger'
  | 'flyer'
  | 'warden'
  | 'armored'
  | 'forge'
  | 'mirror'
  | 'elite-charger'
  /**
   * Act I's four expansion behaviours.
   *
   * Two are new movement patterns (a fast swarm walker and a hovering sniper),
   * one is a stationary area denial that is spawned rather than walked into, and
   * one is a stationary trap. They are separate behaviours rather than re-uses of
   * the existing ones because each is supposed to read as a specific silhouette:
   * the swarm is small and quick, the drone hovers out of a level shot, the vent
   * is a piece of floor, and the hook is overhead.
   */
  | 'swarm-walker'
  | 'hover-sniper'
  | 'floor-trap'
  | 'overhead-hook'

export interface EnemyDefinition {
  readonly id: EnemyId
  readonly name: string
  readonly behaviour: EnemyBehaviour
  readonly hp: number
  /** Damage dealt to the player on contact or by its shot. */
  readonly damage: number
  /** Movement speed, px/s; 0 for stationary archetypes. */
  readonly speed: number
  readonly score: number
  /** Width / height of the hit box, px. */
  readonly width: number
  readonly height: number
  /** Files under the surface cannot be shot from the front. */
  readonly armoredFront: boolean
  /** Can move through the air, ignoring platforms. */
  readonly flying: boolean
}

export const ENEMIES: Readonly<Record<EnemyId, EnemyDefinition>> = {
  patrol: {
    id: 'patrol',
    name: '巡逻兵',
    behaviour: 'patrol',
    hp: 30,
    damage: 1,
    speed: 60,
    score: 100,
    width: 28,
    height: 36,
    armoredFront: false,
    flying: false,
  },
  turret: {
    id: 'turret',
    name: '固定炮台',
    behaviour: 'turret',
    hp: 50,
    damage: 1,
    speed: 0,
    score: 150,
    width: 32,
    height: 32,
    armoredFront: false,
    flying: false,
  },
  carrier: {
    id: 'carrier',
    name: '运载虫',
    behaviour: 'carrier',
    hp: 40,
    damage: 1,
    speed: 90,
    score: 120,
    width: 36,
    height: 32,
    armoredFront: false,
    flying: false,
  },
  charger: {
    id: 'charger',
    name: '冲锋兵',
    behaviour: 'charger',
    hp: 35,
    damage: 1,
    speed: 180,
    score: 130,
    width: 26,
    height: 34,
    armoredFront: false,
    flying: false,
  },
  flyer: {
    id: 'flyer',
    name: '飞行体',
    behaviour: 'flyer',
    hp: 25,
    damage: 1,
    speed: 110,
    score: 140,
    width: 30,
    height: 26,
    armoredFront: false,
    flying: true,
  },
  warden: {
    id: 'warden',
    name: '守卫者',
    behaviour: 'warden',
    hp: 80,
    damage: 1,
    speed: 45,
    score: 200,
    width: 40,
    height: 44,
    armoredFront: false,
    flying: false,
  },
  armored: {
    id: 'armored',
    name: '重甲兵',
    behaviour: 'armored',
    hp: 90,
    damage: 1,
    speed: 40,
    score: 220,
    width: 40,
    height: 44,
    armoredFront: true,
    flying: false,
  },
  forge: {
    id: 'forge',
    name: '锻造者',
    behaviour: 'forge',
    hp: 70,
    damage: 1,
    speed: 0,
    score: 180,
    width: 44,
    height: 40,
    armoredFront: false,
    flying: false,
  },
  mirror: {
    id: 'mirror',
    name: '镜像体',
    behaviour: 'mirror',
    hp: 60,
    damage: 1,
    speed: 100,
    score: 240,
    width: 30,
    height: 36,
    armoredFront: false,
    flying: false,
  },
  'elite-charger': {
    id: 'elite-charger',
    name: '精英冲锋兵',
    behaviour: 'elite-charger',
    hp: 120,
    damage: 2,
    speed: 200,
    score: 400,
    width: 34,
    height: 44,
    armoredFront: false,
    flying: false,
  },

  /* ------------------------------------------------- act I expansion roster */

  /**
   * 拾荒者 - the swarm unit.
   *
   * Low HP and high speed, authored in groups. The point is not that one of them
   * is dangerous - it is that a wave of four arriving while the player is dealing
   * with a turret is.
   */
  scrapper: {
    id: 'scrapper',
    name: '拾荒者',
    behaviour: 'swarm-walker',
    hp: 24,
    damage: 1,
    speed: 130,
    score: 40,
    width: 26,
    height: 30,
    armoredFront: false,
    flying: false,
  },

  /**
   * 吊钩 - overhead area denial.
   *
   * Stationary with no projectile at all: its attack is a ground-spike, so the
   * answer is to be somewhere else when it lands rather than to trade shots. Code
   * 0 damage on contact reflects that it is not a body the player walks into.
   */
  'crane-hook': {
    id: 'crane-hook',
    name: '吊钩',
    behaviour: 'overhead-hook',
    hp: 45,
    damage: 1,
    speed: 0,
    score: 90,
    width: 34,
    height: 48,
    armoredFront: false,
    flying: false,
  },

  /**
   * 蒸汽口 - the floor trap.
   *
   * No movement, no aim: it is a piece of floor that periodically becomes lethal.
   * Its whole job is to make the player not stand still, which is what the stage
   * wants them doing while a wave is on.
   */
  'steam-vent': {
    id: 'steam-vent',
    name: '蒸汽口',
    behaviour: 'floor-trap',
    hp: 35,
    damage: 1,
    speed: 0,
    score: 60,
    width: 32,
    height: 24,
    armoredFront: false,
    flying: false,
  },

  /**
   * 审计无人机 - the hovering sniper.
   *
   * Hovers above the muzzle line the way a flyer does, but holds its ground and
   * aims: a flyer chases, this one picks a line and dares the player into it. The
   * long telegraph is the whole contract - it locks on, then fires, and the lock
   * is what the player is meant to read.
   */
  'audit-drone': {
    id: 'audit-drone',
    name: '审计无人机',
    behaviour: 'hover-sniper',
    hp: 40,
    damage: 1,
    speed: 55,
    score: 120,
    width: 30,
    height: 30,
    armoredFront: false,
    flying: true,
  },
}

/** Every archetype, in the order the campaign introduces them. */
export const ENEMY_IDS: readonly EnemyId[] = [
  'patrol',
  'turret',
  'carrier',
  'charger',
  'flyer',
  'warden',
  'armored',
  'forge',
  'mirror',
  'elite-charger',
  'scrapper',
  'crane-hook',
  'steam-vent',
  'audit-drone',
]

export function enemyDefinition(id: EnemyId): EnemyDefinition {
  return ENEMIES[id]
}

/** Enemy state machine states. */
/**
 * The enemy state machine, unused.
 *
 * Kept because it is exported API, but nothing in the game drives enemies through
 * it: behaviour is dispatched from EnemyDefinition.behaviour in
 * systems/EnemyBehaviour.ts, and armour is answered by damageAgainst(). This state
 * machine, TRANSITIONS, canTransition() and transition() are the design that
 * predates that dispatch.
 *
 * Flagged by scripts/report-unused-exports.mjs so it does not stay invisible. It is
 * the third instance of a finished module with no caller - systems/Echoes.ts and
 * the stage mechanics were the other two - which is why that report exists.
 */
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead'

/**
 * The transition table.
 *
 * `dead` is terminal: nothing transitions out of it, which is what stops a
 * corpse from being re-targeted or re-counted.
 */
export const TRANSITIONS: Readonly<Record<EnemyState, readonly EnemyState[]>> = {
  idle: ['patrol', 'chase', 'attack', 'dead'],
  patrol: ['chase', 'attack', 'hurt', 'dead'],
  chase: ['attack', 'hurt', 'dead'],
  attack: ['chase', 'hurt', 'dead'],
  hurt: ['chase', 'patrol', 'dead'],
  dead: [],
}

/** True when the state machine allows the move. */
export function canTransition(from: EnemyState, to: EnemyState): boolean {
  return TRANSITIONS[from].includes(to)
}

/**
 * Applies a transition, returning the state actually reached.
 *
 * An illegal transition leaves the machine where it was instead of throwing:
 * a corrupted sequence should not crash a run mid-stage.
 */
export function transition(from: EnemyState, to: EnemyState): EnemyState {
  return canTransition(from, to) ? to : from
}

/**
 * Whether a hit from the given side is absorbed.
 *
 * Armoured enemies only absorb frontal hits; the player has to get behind them.
 * `attackFromRight` is true when the shot travels leftward.
 */
export function absorbsHit(definition: EnemyDefinition, attackFromRight: boolean): boolean {
  if (!definition.armoredFront) return false
  return attackFromRight
}
