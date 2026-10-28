/**
 * Act I waves and mid-stage fights, one file per stage.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §三 and §四.
 *
 * Stage 1 was rebuilt first as the vertical slice (see campaign.ts) and is kept
 * there because it is the stage the expansion was proven on. Stages 2, 3 and 4
 * follow here, built to the same recipe so that a reader comparing them is
 * comparing three applications of one design rather than three designs:
 *
 *   - 5 to 6 beats, ordered, each beat > 400px apart
 *   - only some beats gate; a stage where every fight is mandatory has no rhythm
 *   - every enemy arrives from a wave, so `targets` stays empty
 *   - one miniboss at the two-thirds mark, gating the run into the last beat
 *   - a floor that breaks at least once, so the stage is not one long slab
 *
 * The numbers are chosen for the ten-minute budget, not copied from stage 1: a
 * beat every 1800-2200px over a ~12000px stage is 5-7 fights, and a miniboss in
 * the middle is what turns that from a corridor with enemies in it into a stage
 * with a middle.
 */
import type { MinibossPlacement } from '../systems/Miniboss.js'
import type { Wave, WaveSpawn } from '../systems/Wave.js'

const GROUND_H = 60
const FLOOR_TOP = 400

/** Enemy feet on the floor: a 40px body standing on the slab. */
const FEET_Y = FLOOR_TOP - 40

/**
 * A wave spawn standing on the floor.
 *
 * `x` is an offset from the wave's trigger, and each member of a group names its
 * own column. Every spawn used to default to x: 0, which put a whole wave on one
 * pixel - one visible enemy that took three times the damage and read as a single
 * target that would not die. The trigger also spans the full stage height, so a
 * zero y offset spawns at y=0 above the screen where level shots pass underneath
 * and a gating wave can never be cleared.
 */
function ground(
  id: string,
  delaySeconds: number,
  x: number,
  archetype = 'patrol',
  hp = 30,
  score = 50,
): WaveSpawn {
  return {
    x,
    y: FEET_Y,
    delaySeconds,
    // No x/y in here: the spawn offset above is the position, and World places
    // the enemy at trigger + offset. A target that carried its own x/y as well
    // would be a second source of truth for the same number.
    target: { id, width: 32, height: 40, hp, score, archetype },
  }
}

/**
 * A wave spawn hovering above the floor line.
 *
 * A flyer has to be reachable by a raised shot and out of reach of a level one,
 * which is the mechanic: it is placed high enough that the player has to aim.
 */
function air(
  id: string,
  delaySeconds: number,
  x: number,
  y = FLOOR_TOP - 150,
  hp = 25,
  score = 140,
): WaveSpawn {
  return {
    x,
    y,
    delaySeconds,
    target: { id, width: 30, height: 26, hp, score, archetype: 'flyer' },
  }
}

/* ------------------------------------------------------------------ stage 2 */

/**
 * Stage 2's waves - 锈铁回廊, the stage that teaches bounce walls.
 *
 * Every beat here is built around the reflector: enemies stand past a wall so a
 * straight shot is absorbed and a bounced one is not, and the corridor is long
 * enough that the player has room to learn that before the miniboss asks for it.
 */
export const STAGE_02_WAVES: readonly Wave[] = [
  {
    // Beat 1 - one drone in the open. The stage's first enemy is the plainest
    // possible one, so the new mechanic is not introduced at the same time.
    id: 's2-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 320, height: 540 },
    spawns: [ground('s2-a', 0.2, 240)],
  },
  {
    // Beat 2 - a pair behind the first reflector, which is the teaching moment
    // the stage exists for: the shot has to come off the wall to land.
    id: 's2-w2',
    gates: true,
    trigger: { x: 1600, y: 0, width: 360, height: 540 },
    spawns: [ground('s2-b', 0, 180), ground('s2-c', 1.2, 380)],
  },
  {
    // Beat 3 - pressure behind the second reflector. Not gating: the player who
    // has understood the wall can keep moving, and the one who has not gets to
    // practise without the door holding them.
    id: 's2-w3',
    gates: false,
    trigger: { x: 3600, y: 0, width: 360, height: 540 },
    spawns: [ground('s2-d', 0.3, 200), air('s2-e', 1.4, 400)],
  },
  {
    // Beat 4 - the first fight that has to be finished. A turret and two drones
    // in a stretch with no reflector, so the answer is movement rather than aim.
    id: 's2-w4',
    gates: true,
    trigger: { x: 5600, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s2-f', 0, 180, 'turret', 50, 150),
      ground('s2-g', 0.9, 300),
      ground('s2-h', 2.0, 430),
    ],
  },
  {
    // Beat 5 - a charger, so the corridor stops being purely defensive.
    id: 's2-w5',
    gates: false,
    trigger: { x: 7800, y: 0, width: 400, height: 540 },
    spawns: [ground('s2-i', 0, 220, 'charger', 35, 130), ground('s2-j', 1.0, 420)],
  },
  {
    // Beat 6 - the surge before the door. Running past it is allowed, which is
    // what makes the last stretch feel like an escape rather than a queue.
    id: 's2-w6',
    gates: false,
    trigger: { x: 10200, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s2-k', 0, 160),
      ground('s2-l', 0.6, 250),
      ground('s2-m', 1.2, 340),
      ground('s2-n', 1.8, 430, 'scrapper', 24, 40),
    ],
  },
]

/** 管廊看守 guards the corridor's last stretch. */
export const STAGE_02_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's2-mini',
    minibossId: 'miniboss-pipe-warden',
    trigger: { x: 8800, y: 0, width: 300, height: 540 },
    x: 9200,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ------------------------------------------------------------------ stage 3 */

/**
 * Stage 3's waves - 悬空栈道, the platforming stage.
 *
 * The beats are placed over the gaps rather than on the floor: an enemy standing
 * on a ledge the player has to jump to is a different fight from one standing in
 * a corridor, and the flyers are what force the raised aim mid-jump.
 */
export const STAGE_03_WAVES: readonly Wave[] = [
  {
    // Beat 1 - a single walker on the first ledge, so the jump and the gun are
    // taught as separate problems before they are combined.
    id: 's3-w1',
    gates: false,
    trigger: { x: 600, y: 0, width: 320, height: 540 },
    spawns: [ground('s3-a', 0.2, 260)],
  },
  {
    // Beat 2 - a pair split across two heights. One is on the floor and one on a
    // plank, so a level shot resolves only half of it.
    id: 's3-w2',
    gates: true,
    trigger: { x: 2000, y: 0, width: 360, height: 540 },
    spawns: [ground('s3-b', 0, 180), air('s3-c', 1.1, 360, FLOOR_TOP - 130)],
  },
  {
    // Beat 3 - airborne pressure over the long gap. Nothing on the floor: this
    // beat is a straight-up aim test while the player is moving.
    id: 's3-w3',
    gates: false,
    trigger: { x: 4200, y: 0, width: 400, height: 540 },
    spawns: [air('s3-d', 0.3, 180), air('s3-e', 1.5, 380, FLOOR_TOP - 190)],
  },
  {
    // Beat 4 - the mandatory fight, on the widest slab in the stage so the
    // player has somewhere to stand while it happens.
    id: 's3-w4',
    gates: true,
    trigger: { x: 6400, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s3-f', 0, 200, 'turret', 50, 150),
      ground('s3-g', 0.8, 340),
      air('s3-h', 2.0, 460, FLOOR_TOP - 160),
    ],
  },
  {
    // Beat 5 - a charger on a plank run, so the fight and the platforming are one
    // problem rather than two alternating ones.
    id: 's3-w5',
    gates: false,
    trigger: { x: 8600, y: 0, width: 420, height: 540 },
    spawns: [ground('s3-i', 0, 220, 'charger', 35, 130), ground('s3-j', 1.2, 400)],
  },
  {
    // Beat 6 - the last approach. Non-gating, like every stage's final surge.
    id: 's3-w6',
    gates: false,
    trigger: { x: 10600, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s3-k', 0, 150),
      air('s3-l', 0.7, 260, FLOOR_TOP - 170),
      ground('s3-m', 1.4, 370),
    ],
  },
]

/** 栈道吊车 guards the approach to the final scaffold run. */
export const STAGE_03_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's3-mini',
    minibossId: 'miniboss-scaffold-crane',
    trigger: { x: 9200, y: 0, width: 300, height: 540 },
    x: 9600,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ------------------------------------------------------------------ stage 4 */

/**
 * Stage 4's waves - 审计者, an act boss stage.
 *
 * A boss stage used to be an empty corridor with the boss at the end: its
 * `targets` were empty and nothing arrived, so the fight began the moment the
 * player pressed right. The stage now has an approach of its own - three beats
 * and the 审计书记 - so the auditor is the thing the act has been building to
 * rather than the second screen.
 *
 * None of these waves gate. The boss already holds the door, and a gating wave in
 * front of a boss stage would put two locks on one exit.
 */
export const STAGE_04_WAVES: readonly Wave[] = [
  {
    id: 's4-w1',
    gates: false,
    trigger: { x: 700, y: 0, width: 340, height: 540 },
    spawns: [ground('s4-a', 0.2, 240, 'audit-drone', 40, 120)],
  },
  {
    id: 's4-w2',
    gates: false,
    trigger: { x: 2400, y: 0, width: 380, height: 540 },
    spawns: [
      ground('s4-b', 0, 180, 'audit-drone', 40, 120),
      ground('s4-c', 1.0, 360, 'warden', 80, 200),
    ],
  },
  {
    id: 's4-w3',
    gates: false,
    trigger: { x: 4400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s4-d', 0, 170, 'charger', 35, 130),
      ground('s4-e', 0.9, 300, 'audit-drone', 40, 120),
      air('s4-f', 1.8, 440, FLOOR_TOP - 160),
    ],
  },
  {
    // The last thing before the auditor: pressure with no door of its own, so
    // the player arrives at the fight after a fight rather than after a walk.
    id: 's4-w4',
    gates: false,
    trigger: { x: 6600, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s4-g', 0, 160, 'warden', 80, 200),
      ground('s4-h', 0.8, 280),
      ground('s4-i', 1.6, 400, 'audit-drone', 40, 120),
      ground('s4-j', 2.4, 500, 'steam-vent', 35, 90),
    ],
  },
]

/** 审计书记 is the act boss's herald and the only gating fight in this stage. */
export const STAGE_04_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's4-mini',
    minibossId: 'miniboss-audit-clerk',
    trigger: { x: 8000, y: 0, width: 300, height: 540 },
    x: 8400,
    y: FLOOR_TOP,
    // Gating: the auditor is the stage's real lock, but the clerk is the point
    // where the act stops letting the player through without a fight.
    gates: true,
  },
]

/** Shared floor height, so the data files agree with each other. */
export const ACT1_GROUND_HEIGHT = GROUND_H
