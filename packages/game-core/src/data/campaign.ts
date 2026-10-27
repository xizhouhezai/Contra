/**
 * Campaign stages, acts I and II.
 *
 * Source of truth: docs/game/requirements/stages.md - 逐关详表.
 *
 * Each stage is data. StageRunner reads these fields and has no per-stage
 * branching, so tuning a stage means editing numbers here (T-M2-01).
 */
import type { StageDefinition } from './stageTypes.js'

const GROUND_H = 60
const FLOOR_TOP = 400

/**
 * Shorthand for a target that stands on the floor.
 *
 * The archetype defaults to the patrolling drone, which is what act 1 uses
 * everywhere; a stage that wants something else passes it explicitly.
 */
function groundTarget(id: string, x: number, hp = 30, score = 50, archetype = 'patrol') {
  return { id, x, y: FLOOR_TOP - 40, width: 32, height: 40, hp, score, archetype }
}

import type { Wave } from '../systems/Wave.js'

/**
 * Stage 1's waves, one per beat.
 *
 * Paced so the stage teaches in the order a player can absorb it: one enemy to
 * learn the gun, then a pair from both sides, then airborne pressure over the gap,
 * then the first fight that has to be finished, then a surge before the door.
 *
 * Only the beats that should hold the player are gating. The rest are pressure:
 * they add enemies without stopping the run. A stage where every fight is
 * mandatory has no rhythm, and one where none are is a corridor.
 */
/**
 * A wave spawn standing on the floor.
 *
 * The offset is relative to the wave's trigger, and the trigger spans the full
 * screen height, so a zero y offset puts the enemy at y=0 - floating at the top
 * of the stage where the player's level shots pass underneath and it can never
 * be killed. Every ground spawn carries the feet offset explicitly for that
 * reason.
 *
 * The x offset matters for the same kind of reason. Every spawn used to default
 * to x: 0, so a wave of two or three enemies placed them all on the exact same
 * pixel - one visible enemy that took three times the damage to kill and read as
 * a single target that would not die. A wave is a group, so each member names its
 * own lane within the trigger.
 */
const GROUND_SPAWN_Y = FLOOR_TOP - 40

const ground = (id: string, delaySeconds: number, x: number, archetype = 'patrol') => ({
  x,
  y: GROUND_SPAWN_Y,
  delaySeconds,
  target: { id, x: 0, y: 0, width: 32, height: 40, hp: 30, score: 50, archetype },
})

export const STAGE_01_WAVES: readonly Wave[] = [
  {
    // Beat 1 - one enemy at range, nothing else on screen. Teaches the gun.
    id: 's1-w1',
    gates: false,
    trigger: { x: 400, y: 0, width: 300, height: 540 },
    spawns: [ground('s1-a', 0.2, 260)],
  },
  {
    // Beat 2 - a pair, spread across the dock. Teaches facing and aiming: they
    // stand at different ranges, so the player has to pick an order.
    //
    // Both are placed ahead of the trigger rather than one behind it. A spawn
    // behind the player is a gating enemy the run has already passed, and since a
    // gating wave only opens the door once its whole group is dead, that enemy
    // becomes a wall the player cannot see.
    id: 's1-w2',
    gates: true,
    trigger: { x: 1200, y: 0, width: 300, height: 540 },
    spawns: [ground('s1-b', 0, 140), ground('s1-c', 1.2, 300)],
  },
  {
    // Beat 3 - airborne pressure over the gap, so not everything is on the floor.
    id: 's1-w3',
    gates: false,
    trigger: { x: 4600, y: 0, width: 400, height: 540 },
    spawns: [ground('s1-d', 0.4, 150, 'flyer'), ground('s1-e', 1.6, 300)],
  },
  {
    // Beat 4 - the first fight that has to be finished. Guards the warehouse.
    id: 's1-w4',
    gates: true,
    trigger: { x: 7400, y: 0, width: 400, height: 540 },
    spawns: [ground('s1-f', 0, 180), ground('s1-g', 0.8, 300), ground('s1-h', 2.0, 400, 'turret')],
  },
  {
    // Beat 5 - the surge before the door. Not gating: running past it is allowed.
    id: 's1-w5',
    gates: false,
    trigger: { x: 10600, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s1-i', 0, 140),
      ground('s1-j', 0.6, 220),
      ground('s1-k', 1.2, 300),
      ground('s1-l', 1.8, 380, 'charger'),
    ],
  },
]

/**
 * Stage 1 - 码头晨雾. Teaches move, jump, aim, shoot.
 *
 * Rewritten for the expansion as five beats instead of one corridor. The old
 * version was a single 2400px walk with three enemies standing in the open, which
 * a player cleared in fifteen seconds by holding right - measured, not estimated,
 * and the reason every stage felt the same.
 *
 * The beats are paced by purpose rather than by distance: each one introduces one
 * thing and then tests it. Gating waves hold the door, so the length comes from
 * fights that have to be finished rather than from a longer walk to the exit.
 */
export const STAGE_01: StageDefinition = {
  id: 'stage-01',
  name: '码头晨雾',
  act: 1,
  index: 1,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 4200, height: GROUND_H },
    // Cargo steps: the first jump the player has to make on purpose.
    { x: 900, y: FLOOR_TOP - 40, width: 120, height: 40 },
    { x: 1800, y: FLOOR_TOP - 90, width: 160, height: 20 },
    { x: 2200, y: FLOOR_TOP - 140, width: 160, height: 20 },
    // The dock breaks up here - a gap the player crosses rather than falls into.
    { x: 4400, y: FLOOR_TOP, width: 2400, height: GROUND_H },
    { x: 4800, y: FLOOR_TOP - 100, width: 140, height: 16 },
    { x: 5300, y: FLOOR_TOP - 170, width: 140, height: 16 },
    { x: 5900, y: FLOOR_TOP - 100, width: 160, height: 16 },
    // Warehouse run into the crane yard.
    { x: 7000, y: FLOOR_TOP, width: 5000, height: GROUND_H },
    { x: 7800, y: FLOOR_TOP - 120, width: 200, height: 20 },
    { x: 8600, y: FLOOR_TOP - 60, width: 180, height: 20 },
    { x: 9600, y: FLOOR_TOP - 120, width: 200, height: 20 },
    { x: 10400, y: FLOOR_TOP - 80, width: 220, height: 20 },
    { x: 11200, y: FLOOR_TOP - 140, width: 200, height: 20 },
  ],
  bounceWalls: [],
  // No targets placed up front. Everything arrives through a wave, which is what
  // makes the stage take its time instead of emptying in one screen.
  targets: [],
  waves: STAGE_01_WAVES,
  mechanics: [],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 2 - 锈铁回廊. Introduces bounce walls. */
export const STAGE_02: StageDefinition = {
  id: 'stage-02',
  name: '锈铁回廊',
  act: 1,
  index: 2,
  widthPx: 2600,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [{ x: 0, y: FLOOR_TOP, width: 2600, height: GROUND_H }],
  // Corridor walls at head height: shots fired into them come back.
  bounceWalls: [
    { x: 800, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 1600, y: FLOOR_TOP - 200, width: 24, height: 200 },
  ],
  targets: [groundTarget('t1', 1000), groundTarget('t2', 1300), groundTarget('t3', 2100)],
  mechanics: ['bounce-wall'],
  timeTargetSeconds: 100,
  exit: { x: 2520, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 3 - 悬空栈道. Introduces platforming with three heights. */
export const STAGE_03: StageDefinition = {
  id: 'stage-03',
  name: '悬空栈道',
  act: 1,
  index: 3,
  widthPx: 2800,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 2800, height: GROUND_H },
    // Thin one-way planks at three heights, so the jump apex is exercised.
    { x: 600, y: 340, width: 140, height: 16 },
    { x: 900, y: 280, width: 140, height: 16 },
    { x: 1200, y: 220, width: 140, height: 16 },
    { x: 1700, y: 300, width: 160, height: 16 },
  ],
  bounceWalls: [],
  targets: [groundTarget('t1', 1000), groundTarget('t2', 1500), groundTarget('t3', 2300)],
  mechanics: ['platforming'],
  timeTargetSeconds: 110,
  // FLOOR_TOP - 120, not 220. The doors on every other stage reach the floor, so
  // walking into the x coordinate is enough; this one floated 60px above head
  // height and could only be entered from the highest plank. found while
  // recording: a bot walked the full width of stage 3, stood under the door at
  // the right x with three hearts, and never triggered the clear.
  exit: { x: 2720, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 4 - 审计者. Boss stage. */
export const STAGE_04: StageDefinition = {
  id: 'stage-04',
  name: '审计者',
  act: 1,
  index: 4,
  widthPx: 1600,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 1600, height: GROUND_H },
    { x: 400, y: 320, width: 120, height: 16 },
    { x: 1100, y: 320, width: 120, height: 16 },
  ],
  bounceWalls: [],
  targets: [],
  mechanics: ['platforming'],
  bossId: 'claude-auditor',
  timeTargetSeconds: 120,
  exit: { x: 1520, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 5 - 冷却管廊. Introduces chasing enemies. */
export const STAGE_05: StageDefinition = {
  id: 'stage-05',
  name: '冷却管廊',
  act: 2,
  index: 5,
  widthPx: 2800,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 2800, height: GROUND_H },
    { x: 1000, y: 320, width: 160, height: 16 },
  ],
  bounceWalls: [],
  targets: [groundTarget('charger-1', 900, 35, 130), groundTarget('charger-2', 1800, 35, 130)],
  mechanics: ['tracking-enemy'],
  timeTargetSeconds: 115,
  exit: { x: 2720, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 6 - 阵列机房. Introduces flying enemies. */
export const STAGE_06: StageDefinition = {
  id: 'stage-06',
  name: '阵列机房',
  act: 2,
  index: 6,
  widthPx: 2900,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [{ x: 0, y: FLOOR_TOP, width: 2900, height: GROUND_H }],
  bounceWalls: [],
  targets: [
    // Flyers hover above the muzzle line, so a raised aim is required.
    { id: 'flyer-1', x: 900, y: FLOOR_TOP - 140, width: 30, height: 26, hp: 25, score: 140 },
    { id: 'flyer-2', x: 1700, y: FLOOR_TOP - 160, width: 30, height: 26, hp: 25, score: 140 },
    { id: 'flyer-3', x: 2400, y: FLOOR_TOP - 130, width: 30, height: 26, hp: 25, score: 140 },
  ],
  mechanics: ['flying-enemy'],
  timeTargetSeconds: 120,
  exit: { x: 2820, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 7 - 熔炉区. Introduces armoured enemies. */
export const STAGE_07: StageDefinition = {
  id: 'stage-07',
  name: '熔炉区',
  act: 2,
  index: 7,
  widthPx: 3000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 3000, height: GROUND_H },
    { x: 1400, y: 300, width: 200, height: 16 },
  ],
  bounceWalls: [],
  targets: [
    { id: 'armored-1', x: 1000, y: FLOOR_TOP - 44, width: 40, height: 44, hp: 90, score: 220 },
    { id: 'armored-2', x: 2200, y: FLOOR_TOP - 44, width: 40, height: 44, hp: 90, score: 220 },
  ],
  mechanics: ['armored-enemy'],
  timeTargetSeconds: 125,
  exit: { x: 2920, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 8 - 改写者. Boss stage closing act II. */
export const STAGE_08: StageDefinition = {
  id: 'stage-08',
  name: '改写者',
  act: 2,
  index: 8,
  widthPx: 1800,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 1800, height: GROUND_H },
    { x: 500, y: 300, width: 140, height: 16 },
    { x: 1200, y: 300, width: 140, height: 16 },
  ],
  bounceWalls: [],
  targets: [],
  mechanics: ['platforming', 'armored-enemy'],
  bossId: 'claude-rewriter',
  timeTargetSeconds: 150,
  exit: { x: 1720, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

import { ACT_III_STAGES } from './act3.js'

/** All twelve stages, in campaign order (acts I, II and III). */
export const CAMPAIGN_STAGES: readonly StageDefinition[] = [
  STAGE_01,
  STAGE_02,
  STAGE_03,
  STAGE_04,
  STAGE_05,
  STAGE_06,
  STAGE_07,
  STAGE_08,
  ...ACT_III_STAGES,
]
