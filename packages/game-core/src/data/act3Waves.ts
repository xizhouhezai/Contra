/**
 * Act III waves and mid-stage fights.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §三 and §四, and the
 * act I recipe in act1Waves.ts.
 *
 * Act III is where the campaign stops introducing and starts combining. Each
 * stage still leans on its own mechanic - breakable terrain, moving platforms,
 * the vertical shake, the four-form final fight - but the waves mix act I's and
 * act II's archetypes freely, because by stage 9 the player has met all of them.
 *
 * Stage 11 is the exception in shape rather than in difficulty: it is vertical, so
 * its waves are placed by y instead of by x and its trigger regions are wide bands
 * across the shaft rather than columns down the corridor.
 */
import type { MinibossPlacement } from '../systems/Miniboss.js'
import type { Wave, WaveSpawn } from '../systems/Wave.js'

const GROUND_H = 60
const FLOOR_TOP = 400
const FEET_Y = FLOOR_TOP - 40

/** A wave spawn standing on the floor. See act1Waves.ts for why x and y are explicit. */
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
    target: { id, width: 32, height: 40, hp, score, archetype },
  }
}

/** A wave spawn hovering above the muzzle line. */
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

/* ------------------------------------------------------------------ stage 9 */

/**
 * 坍塌档案库 - the stage that teaches breakable terrain.
 *
 * The floor breaks. Every beat here puts something on a plank rather than on the
 * ground, so a player who never fires a grenade at the level never gets a clean
 * shot at anything - and the gating beat is a turret behind a breakable wall,
 * which is the clearest place the mechanic becomes mandatory.
 */
export const STAGE_09_WAVES: readonly Wave[] = [
  {
    id: 's9-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 340, height: 540 },
    spawns: [ground('s9-a', 0.2, 240, 'scrapper', 24, 40)],
  },
  {
    // Behind the first breakable wall: a level shot stops at the plank, so the
    // wall has to come down before the turret can be reached.
    id: 's9-w2',
    gates: true,
    trigger: { x: 1900, y: 0, width: 380, height: 540 },
    spawns: [
      ground('s9-b', 0, 230, 'turret', 50, 150),
      ground('s9-c', 1.2, 400, 'charger', 45, 130),
    ],
  },
  {
    id: 's9-w3',
    gates: false,
    trigger: { x: 4000, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s9-d', 0.3, 180, 'audit-drone', 40, 120),
      ground('s9-e', 1.1, 330, 'armored', 90, 220),
    ],
  },
  {
    id: 's9-w4',
    gates: true,
    trigger: { x: 6200, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s9-f', 0, 170, 'forge', 70, 180),
      ground('s9-g', 0.8, 300, 'armored', 90, 220),
      air('s9-h', 1.8, 440, FLOOR_TOP - 170),
    ],
  },
  {
    id: 's9-w5',
    gates: false,
    trigger: { x: 8400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s9-i', 0, 200, 'warden', 80, 200),
      ground('s9-j', 1.0, 380, 'scrapper', 24, 40),
    ],
  },
  {
    id: 's9-w6',
    gates: false,
    trigger: { x: 10400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s9-k', 0, 150, 'charger', 45, 130),
      ground('s9-l', 0.7, 270, 'armored', 90, 220),
      ground('s9-m', 1.4, 380, 'turret', 50, 150),
    ],
  },
]

/** 档案看守 holds the last intact shelf row. */
export const STAGE_09_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's9-mini',
    minibossId: 'miniboss-archive-keeper',
    trigger: { x: 9400, y: 0, width: 300, height: 540 },
    x: 9800,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ----------------------------------------------------------------- stage 10 */

/**
 * 镜像回廊 - the stage that teaches moving platforms.
 *
 * Every beat is fought over a plank that will not hold still, and the mirror
 * apostle shares the stage with its own lieutenant: the miniboss copies the
 * player's weapon, then the apostle copies the player's whole loadout, so the
 * lesson is taught twice at two scales.
 */
export const STAGE_10_WAVES: readonly Wave[] = [
  {
    id: 's10-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 340, height: 540 },
    spawns: [ground('s10-a', 0.2, 240, 'mirror', 60, 240)],
  },
  {
    id: 's10-w2',
    gates: true,
    trigger: { x: 1900, y: 0, width: 380, height: 540 },
    spawns: [
      ground('s10-b', 0, 210, 'mirror', 60, 240),
      ground('s10-c', 1.2, 380, 'charger', 45, 130),
    ],
  },
  {
    id: 's10-w3',
    gates: false,
    trigger: { x: 4000, y: 0, width: 400, height: 540 },
    spawns: [air('s10-d', 0.3, 180, FLOOR_TOP - 160), ground('s10-e', 1.1, 330, 'mirror', 60, 240)],
  },
  {
    id: 's10-w4',
    gates: true,
    trigger: { x: 6200, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s10-f', 0, 170, 'mirror', 60, 240),
      ground('s10-g', 0.8, 300, 'armored', 90, 220),
      air('s10-h', 1.8, 440, FLOOR_TOP - 180),
    ],
  },
  {
    id: 's10-w5',
    gates: false,
    trigger: { x: 8400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s10-i', 0, 200, 'mirror', 60, 240),
      ground('s10-j', 1.0, 380, 'audit-drone', 40, 120),
    ],
  },
  {
    id: 's10-w6',
    gates: false,
    trigger: { x: 10400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s10-k', 0, 150, 'mirror', 60, 240),
      ground('s10-l', 0.7, 270, 'scrapper', 24, 40),
      air('s10-m', 1.4, 380, FLOOR_TOP - 150),
    ],
  },
]

/** 镜像副官 guards the mirrored gallery's last stretch. */
export const STAGE_10_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's10-mini',
    minibossId: 'miniboss-mirror-lieutenant',
    trigger: { x: 9400, y: 0, width: 300, height: 540 },
    x: 9800,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ----------------------------------------------------------------- stage 11 */

/**
 * 垂直井 - the vertical stage.
 *
 * The shaft runs downward: the stage is 900 wide and 9600 tall, the player falls
 * and descends, and the exit is at the bottom. Waves are placed by y, so their
 * triggers are wide bands across the shaft rather than columns down a corridor,
 * and their spawns are offsets from the band's left edge.
 *
 * The miniboss stands on a ledge partway down rather than at the bottom, which is
 * the vertical version of "two thirds of the way along".
 */
export const STAGE_11_WAVES: readonly Wave[] = [
  {
    id: 's11-w1',
    gates: false,
    trigger: { x: 0, y: 800, width: 900, height: 200 },
    spawns: [ground('s11-a', 0.2, 300, 'patrol')],
  },
  {
    id: 's11-w2',
    gates: true,
    trigger: { x: 0, y: 2000, width: 900, height: 220 },
    spawns: [
      ground('s11-b', 0, 260, 'charger', 45, 130),
      ground('s11-c', 1.2, 520, 'scrapper', 24, 40),
    ],
  },
  {
    id: 's11-w3',
    gates: false,
    trigger: { x: 0, y: 3300, width: 900, height: 220 },
    spawns: [
      ground('s11-d', 0.3, 280, 'armored', 90, 220),
      ground('s11-e', 1.1, 500, 'audit-drone', 40, 120),
    ],
  },
  {
    id: 's11-w4',
    gates: true,
    trigger: { x: 0, y: 4700, width: 900, height: 240 },
    spawns: [
      ground('s11-f', 0, 250, 'flyer', 25, 140),
      ground('s11-g', 0.8, 450, 'armored', 90, 220),
      ground('s11-h', 1.8, 640, 'charger', 45, 130),
    ],
  },
  {
    id: 's11-w5',
    gates: false,
    trigger: { x: 0, y: 6400, width: 900, height: 220 },
    spawns: [
      ground('s11-i', 0, 300, 'mirror', 60, 240),
      ground('s11-j', 1.0, 560, 'flyer', 25, 140),
    ],
  },
  {
    id: 's11-w6',
    gates: false,
    trigger: { x: 0, y: 8000, width: 900, height: 220 },
    spawns: [
      ground('s11-k', 0, 240, 'charger', 45, 130),
      ground('s11-l', 0.7, 420, 'armored', 90, 220),
      ground('s11-m', 1.4, 620, 'scrapper', 24, 40),
    ],
  },
]

/**
 * 井道看守 clings to the shaft wall two thirds down.
 *
 * The y is the ledge's top surface (act3.ts puts the wide mid-shaft ledge at
 * y=5600), not an arbitrary point in the shaft. A miniboss anchored below its
 * ledge floats in the middle of the shaft and cannot be reached at all - the
 * player shoots level, so a body hanging 240px under the only place to stand is a
 * fight nobody can start, and it took the browser acceptance run to find it.
 *
 * The trigger is the band above the ledge, so the fight starts on the way down and
 * the player lands next to it rather than on top of it.
 */
export const STAGE_11_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's11-mini',
    minibossId: 'miniboss-shaft-gaoler',
    trigger: { x: 0, y: 5200, width: 900, height: 460 },
    x: 560,
    y: 5600,
    gates: true,
  },
]

/* ----------------------------------------------------------------- stage 12 */

/**
 * 涌现 - the final stage.
 *
 * The GPT fight ends the campaign, so this stage's approach is the last ordinary
 * fighting the player does: four beats that mix every archetype in the game, then
 * the 涌现先驱, then the four-form boss. None of the waves gate - the boss holds
 * the door - and the miniboss does, because it is the last thing between the
 * player and the ending and it should have to be beaten.
 */
export const STAGE_12_WAVES: readonly Wave[] = [
  {
    id: 's12-w1',
    gates: false,
    trigger: { x: 700, y: 0, width: 340, height: 540 },
    spawns: [ground('s12-a', 0.2, 240, 'mirror', 60, 240)],
  },
  {
    id: 's12-w2',
    gates: false,
    trigger: { x: 2600, y: 0, width: 380, height: 540 },
    spawns: [ground('s12-b', 0, 190, 'armored', 90, 220), air('s12-c', 1.0, 360, FLOOR_TOP - 160)],
  },
  {
    id: 's12-w3',
    gates: false,
    trigger: { x: 4600, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s12-d', 0, 170, 'elite-charger', 120, 400),
      ground('s12-e', 0.9, 320, 'audit-drone', 40, 120),
      ground('s12-f', 1.8, 450, 'mirror', 60, 240),
    ],
  },
  {
    id: 's12-w4',
    gates: false,
    trigger: { x: 6800, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s12-g', 0, 160, 'warden', 80, 200),
      ground('s12-h', 0.7, 280, 'armored', 90, 220),
      ground('s12-h2', 1.4, 380, 'forge', 70, 180),
      air('s12-i', 2.2, 480, FLOOR_TOP - 180),
    ],
  },
]

/** 涌现先驱 stands between the player and the ending. */
export const STAGE_12_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's12-mini',
    minibossId: 'miniboss-emergence-herald',
    trigger: { x: 8200, y: 0, width: 300, height: 540 },
    x: 8600,
    y: FLOOR_TOP,
    gates: true,
  },
]

/** Shared floor height, so the act III files agree with each other. */
export const ACT3_GROUND_HEIGHT = GROUND_H
