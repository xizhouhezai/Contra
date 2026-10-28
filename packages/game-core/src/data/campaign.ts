/**
 * Campaign stages, acts I and II.
 *
 * Source of truth: docs/game/requirements/stages.md - 逐关详表.
 *
 * Each stage is data. StageRunner reads these fields and has no per-stage
 * branching, so tuning a stage means editing numbers here (T-M2-01).
 *
 * Every stage in the campaign now arrives by wave. The `groundTarget` helper that
 * placed act II's enemies up front is gone with the last stage that used it: an
 * enemy standing in the open on frame one is one the player can outrun before its
 * beat is due, which is what made the pre-expansion stages fifteen seconds long.
 */
import type { StageDefinition } from './stageTypes.js'

const GROUND_H = 60
const FLOOR_TOP = 400

import type { MinibossPlacement } from '../systems/Miniboss.js'
import type { Wave } from '../systems/Wave.js'
import {
  STAGE_02_MINIBOSSES,
  STAGE_02_WAVES,
  STAGE_03_MINIBOSSES,
  STAGE_03_WAVES,
  STAGE_04_MINIBOSSES,
  STAGE_04_WAVES,
} from './act1Waves.js'
import {
  STAGE_05_MINIBOSSES,
  STAGE_05_WAVES,
  STAGE_06_MINIBOSSES,
  STAGE_06_WAVES,
  STAGE_07_MINIBOSSES,
  STAGE_07_WAVES,
  STAGE_08_MINIBOSSES,
  STAGE_08_WAVES,
} from './act2Waves.js'

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
 * 码头工头 holds the crane yard, two thirds of the way along.
 *
 * Stage 1 is the campaign's first stage and the vertical slice, so its miniboss is
 * the gentlest of the four: this is the first time the player meets a fight that
 * does not end when they stop shooting. It gates, because a mid-stage fight the
 * player can walk around is a set piece the stage did not need to author.
 */
export const STAGE_01_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's1-mini',
    minibossId: 'miniboss-dock-foreman',
    trigger: { x: 8600, y: 0, width: 300, height: 540 },
    x: 9000,
    y: FLOOR_TOP,
    gates: true,
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
  minibosses: STAGE_01_MINIBOSSES,
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
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 12000, height: GROUND_H },
    // Reflector walls at head height: shots fired into them come back. Placed
    // where the beats are rather than evenly, so each one is a piece of the fight
    // in front of it instead of decoration along a corridor.
    { x: 1200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 2400, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 4200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 6200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 8200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    // Ledges over the long middle stretch, so the corridor is not a flat run for
    // two thousand pixels at a time.
    { x: 3000, y: FLOOR_TOP - 110, width: 180, height: 18 },
    { x: 5100, y: FLOOR_TOP - 130, width: 200, height: 18 },
    { x: 7200, y: FLOOR_TOP - 100, width: 180, height: 18 },
    { x: 9800, y: FLOOR_TOP - 120, width: 200, height: 18 },
  ],
  bounceWalls: [
    { x: 1200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 2400, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 4200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 6200, y: FLOOR_TOP - 200, width: 24, height: 200 },
    { x: 8200, y: FLOOR_TOP - 200, width: 24, height: 200 },
  ],
  // Everything arrives by wave, like stage 1: an enemy placed on frame one is one
  // the player can outrun before its beat is due.
  targets: [],
  waves: STAGE_02_WAVES,
  minibosses: STAGE_02_MINIBOSSES,
  mechanics: ['bounce-wall'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 3 - 悬空栈道. Introduces platforming with three heights. */
export const STAGE_03: StageDefinition = {
  id: 'stage-03',
  name: '悬空栈道',
  act: 1,
  index: 3,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    // Not one slab. The stage is about crossing gaps, so the floor breaks four
    // times and the planks are the only way over. Every gap is inside the jump
    // arc: 180px of gap against a 70px apex and a 180px/s run is a jump the
    // player makes on purpose, which is what "platforming" has to mean.
    { x: 0, y: FLOOR_TOP, width: 3000, height: GROUND_H },
    { x: 600, y: 340, width: 140, height: 16 },
    { x: 900, y: 280, width: 140, height: 16 },
    { x: 1200, y: 220, width: 140, height: 16 },
    { x: 1700, y: 300, width: 160, height: 16 },
    { x: 2000, y: 240, width: 160, height: 16 },
    // Gap 1: 180px.
    { x: 3180, y: FLOOR_TOP, width: 2400, height: GROUND_H },
    { x: 3400, y: 300, width: 150, height: 16 },
    { x: 3700, y: 230, width: 150, height: 16 },
    { x: 4000, y: 300, width: 150, height: 16 },
    // Gap 2, crossed on the higher line.
    { x: 5580, y: FLOOR_TOP - 90, width: 200, height: 18 },
    { x: 5940, y: FLOOR_TOP - 90, width: 200, height: 18 },
    { x: 6300, y: FLOOR_TOP, width: 2600, height: GROUND_H },
    { x: 6600, y: 290, width: 160, height: 16 },
    { x: 7000, y: 220, width: 160, height: 16 },
    { x: 7400, y: 300, width: 160, height: 16 },
    // Gap 3.
    { x: 8900, y: FLOOR_TOP - 80, width: 220, height: 18 },
    { x: 9300, y: FLOOR_TOP - 80, width: 220, height: 18 },
    { x: 9700, y: FLOOR_TOP, width: 2300, height: GROUND_H },
    { x: 10000, y: FLOOR_TOP - 120, width: 180, height: 18 },
    { x: 10600, y: FLOOR_TOP - 80, width: 180, height: 18 },
    { x: 11200, y: FLOOR_TOP - 140, width: 200, height: 18 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_03_WAVES,
  minibosses: STAGE_03_MINIBOSSES,
  mechanics: ['platforming'],
  timeTargetSeconds: 600,
  // FLOOR_TOP - 120, not 220. The doors on every other stage reach the floor, so
  // walking into the x coordinate is enough; this one floated 60px above head
  // height and could only be entered from the highest plank. found while
  // recording: a bot walked the full width of stage 3, stood under the door at
  // the right x with three hearts, and never triggered the clear.
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 4 - 审计者. Boss stage.
 *
 * A boss stage used to be an empty 1600px corridor with the auditor at the far
 * end: `targets` was empty, nothing arrived, and the fight began on the second
 * screen. The stage is now the act's approach - four beats and the 审计书记 -
 * so the auditor is what the act has been building to.
 *
 * The arena itself stays the same length it always was. Everything the player
 * fights through comes before it, which is the point of a boss stage: the corridor
 * is the exam and the arena is the result.
 */
export const STAGE_04: StageDefinition = {
  id: 'stage-04',
  name: '审计者',
  act: 1,
  index: 4,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 10800, height: GROUND_H },
    { x: 400, y: 320, width: 120, height: 16 },
    { x: 1600, y: 300, width: 140, height: 16 },
    { x: 3000, y: 320, width: 140, height: 16 },
    { x: 4600, y: 300, width: 160, height: 16 },
    { x: 6000, y: 320, width: 140, height: 16 },
    { x: 7400, y: 300, width: 160, height: 16 },
    // The arena: a clean floor with no ledges, so the fight is about reading the
    // beam and the chains rather than about platforming under them.
    { x: 10800, y: FLOOR_TOP, width: 1200, height: GROUND_H },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_04_WAVES,
  minibosses: STAGE_04_MINIBOSSES,
  mechanics: ['platforming'],
  bossId: 'claude-auditor',
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 5 - 冷却管廊. Introduces chasing enemies.
 *
 * Rebuilt for the expansion: 12000px, six beats, one gating mid-stage fight. The
 * stage still teaches exactly one thing - the charger that comes to you - but it
 * now has room to teach it three times: a single charger, a pair, then a charge
 * with a turret behind it that stops the player simply backing away.
 */
export const STAGE_05: StageDefinition = {
  id: 'stage-05',
  name: '冷却管廊',
  act: 2,
  index: 5,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 12000, height: GROUND_H },
    // Pipe runs at head height, so the corridor has a ceiling in places and the
    // airborne beats have something to be fought around.
    { x: 900, y: 200, width: 900, height: 24 },
    { x: 2600, y: 210, width: 700, height: 24 },
    { x: 4500, y: 190, width: 900, height: 24 },
    { x: 6800, y: 205, width: 700, height: 24 },
    { x: 8800, y: 195, width: 900, height: 24 },
    // Ledges over the coolant floor, so the charger has somewhere to be dodged
    // onto rather than only away from.
    { x: 1800, y: FLOOR_TOP - 110, width: 180, height: 18 },
    { x: 3600, y: FLOOR_TOP - 120, width: 200, height: 18 },
    { x: 5400, y: FLOOR_TOP - 100, width: 180, height: 18 },
    { x: 7400, y: FLOOR_TOP - 120, width: 200, height: 18 },
    { x: 9400, y: FLOOR_TOP - 110, width: 180, height: 18 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_05_WAVES,
  minibosses: STAGE_05_MINIBOSSES,
  mechanics: ['tracking-enemy'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 6 - 阵列机房. Introduces flying enemies.
 *
 * Rebuilt for the expansion. The stage's whole lesson is "aim up", so its floor
 * is deliberately boring - one long slab - and everything that makes it hard is
 * in the air. Four of the six beats put nothing on the floor at all.
 */
export const STAGE_06: StageDefinition = {
  id: 'stage-06',
  name: '阵列机房',
  act: 2,
  index: 6,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 12000, height: GROUND_H },
    // Rack rows: vertical blocks the player has to weave through, and the only
    // cover in a hall that is otherwise a shooting range.
    { x: 1400, y: 130, width: 40, height: 270 },
    { x: 3000, y: 130, width: 40, height: 270 },
    { x: 4800, y: 130, width: 40, height: 270 },
    { x: 6600, y: 130, width: 40, height: 270 },
    { x: 8500, y: 130, width: 40, height: 270 },
    { x: 10300, y: 130, width: 40, height: 270 },
    // Walkable tops on half of them, so the player can get up to the flyers'
    // level instead of only shooting from below.
    { x: 2900, y: FLOOR_TOP - 150, width: 240, height: 18 },
    { x: 6500, y: FLOOR_TOP - 150, width: 240, height: 18 },
    { x: 10200, y: FLOOR_TOP - 150, width: 240, height: 18 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_06_WAVES,
  minibosses: STAGE_06_MINIBOSSES,
  mechanics: ['flying-enemy'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 7 - 熔炉区. Introduces armoured enemies.
 *
 * Rebuilt for the expansion. Armour is the lesson, so the stage hands the player
 * room to get behind things: wide floor, gaps to step through, and furnace stacks
 * that are solid. Every gating beat is armoured.
 */
export const STAGE_07: StageDefinition = {
  id: 'stage-07',
  name: '熔炉区',
  act: 2,
  index: 7,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 4000, height: GROUND_H },
    // The furnace breaks the floor, so the player is funnelled past an armoured
    // body rather than around it.
    { x: 4150, y: FLOOR_TOP - 90, width: 200, height: 18 },
    { x: 4500, y: FLOOR_TOP, width: 3200, height: GROUND_H },
    { x: 7850, y: FLOOR_TOP - 90, width: 200, height: 18 },
    { x: 8200, y: FLOOR_TOP, width: 3800, height: GROUND_H },
    // Catwalks above the pour line.
    { x: 1500, y: 280, width: 300, height: 18 },
    { x: 2900, y: 250, width: 320, height: 18 },
    { x: 5200, y: 270, width: 300, height: 18 },
    { x: 6600, y: 240, width: 320, height: 18 },
    { x: 9000, y: 265, width: 300, height: 18 },
    { x: 10400, y: 250, width: 320, height: 18 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_07_WAVES,
  minibosses: STAGE_07_MINIBOSSES,
  mechanics: ['armored-enemy'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 8 - 改写者. Boss stage closing act II.
 *
 * Rebuilt for the expansion, the same way stage 4 was: the arena stays a clean
 * room, and everything the player fights through comes before it. The last thing
 * before the boss is the 红线书记, which drops the laser - the weapon the
 * rewriter's gravity-flipping second phase rewards.
 */
export const STAGE_08: StageDefinition = {
  id: 'stage-08',
  name: '改写者',
  act: 2,
  index: 8,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 10800, height: GROUND_H },
    { x: 500, y: 300, width: 140, height: 16 },
    { x: 1800, y: 280, width: 160, height: 16 },
    { x: 3200, y: 300, width: 140, height: 16 },
    { x: 4700, y: 280, width: 160, height: 16 },
    { x: 6100, y: 300, width: 140, height: 16 },
    { x: 7500, y: 280, width: 160, height: 16 },
    // The arena: clean floor, no ledges, because the fight is about reading which
    // way is down.
    { x: 10800, y: FLOOR_TOP, width: 1200, height: GROUND_H },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_08_WAVES,
  minibosses: STAGE_08_MINIBOSSES,
  mechanics: ['platforming', 'armored-enemy'],
  bossId: 'claude-rewriter',
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
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
