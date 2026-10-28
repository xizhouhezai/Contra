/**
 * Act II waves and mid-stage fights.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §三 and §四, and the
 * act I recipe in act1Waves.ts, which these three files follow.
 *
 * Act II keeps act I's shape - five or six beats, some gating, one gating
 * miniboss two thirds along - and changes what the beats are made of. Each stage
 * still teaches exactly one mechanic (REQ-STG-005), so the waves are built to
 * make that mechanic necessary rather than to add more enemies:
 *
 *   stage 5  tracking-enemy   the beat arrives and comes to you
 *   stage 6  flying-enemy     the beat arrives above the muzzle line
 *   stage 7  armored-enemy    the beat cannot be won by shooting the front
 *   stage 8  boss stage       an approach, then 改写者
 *
 * Act II's enemies also carry a second layer: every beat mixes in at least one
 * archetype the player met in act I, so a stage reads as a harder version of
 * something known rather than as a new vocabulary each time.
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

/* ------------------------------------------------------------------ stage 5 */

/**
 * 冷却管廊 - the stage that teaches enemies coming to you.
 *
 * Chargers from further away than act I's, so the lesson is not "step aside" but
 * "keep moving". Two of the six beats are gating, and both are gating because
 * they are charger groups: a fight you can outrun would teach the opposite of
 * what the stage is for.
 */
export const STAGE_05_WAVES: readonly Wave[] = [
  {
    id: 's5-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 320, height: 540 },
    spawns: [ground('s5-a', 0.2, 240, 'patrol')],
  },
  {
    // The teaching moment: a charger that starts closing the moment it appears.
    id: 's5-w2',
    gates: true,
    trigger: { x: 1700, y: 0, width: 360, height: 540 },
    spawns: [ground('s5-b', 0, 200, 'charger', 45, 130), ground('s5-c', 1.2, 400, 'carrier')],
  },
  {
    id: 's5-w3',
    gates: false,
    trigger: { x: 3800, y: 0, width: 380, height: 540 },
    spawns: [
      ground('s5-d', 0.3, 190, 'charger', 45, 130),
      ground('s5-e', 1.1, 330, 'charger', 45, 130),
    ],
  },
  {
    // Both gates are charger groups, so the stage cannot be walked past.
    id: 's5-w4',
    gates: true,
    trigger: { x: 6000, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s5-f', 0, 180, 'charger', 45, 130),
      ground('s5-g', 0.7, 300, 'turret', 50, 150),
      ground('s5-h', 1.6, 430, 'charger', 45, 130),
    ],
  },
  {
    id: 's5-w5',
    gates: false,
    trigger: { x: 8200, y: 0, width: 400, height: 540 },
    spawns: [ground('s5-i', 0, 200, 'elite-charger', 120, 400), air('s5-j', 1.2, 400)],
  },
  {
    id: 's5-w6',
    gates: false,
    trigger: { x: 10400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s5-k', 0, 160, 'charger', 45, 130),
      ground('s5-l', 0.6, 260, 'scrapper', 24, 40),
      ground('s5-m', 1.2, 360, 'scrapper', 24, 40),
    ],
  },
]

/** 冷却监工 holds the gallery's last stretch. */
export const STAGE_05_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's5-mini',
    minibossId: 'miniboss-coolant-overseer',
    trigger: { x: 9300, y: 0, width: 300, height: 540 },
    x: 9700,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ------------------------------------------------------------------ stage 6 */

/**
 * 阵列机房 - the stage that teaches looking up.
 *
 * Every beat puts at least one body above the muzzle line, and the early beats
 * put nothing on the floor at all, so a player holding a level aim has to learn
 * the raised shot before the stage gives them anything else to shoot at.
 */
export const STAGE_06_WAVES: readonly Wave[] = [
  {
    // Nothing on the floor: this beat can only be cleared by aiming up.
    id: 's6-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 340, height: 540 },
    spawns: [air('s6-a', 0.2, 240, FLOOR_TOP - 140)],
  },
  {
    id: 's6-w2',
    gates: true,
    trigger: { x: 1800, y: 0, width: 380, height: 540 },
    spawns: [air('s6-b', 0, 190, FLOOR_TOP - 160), air('s6-c', 1.1, 380, FLOOR_TOP - 190)],
  },
  {
    // The audit drone joins the flyers: a hovering sniper above the muzzle line is
    // the harder version of the same problem, not a new one.
    id: 's6-w3',
    gates: false,
    trigger: { x: 3900, y: 0, width: 400, height: 540 },
    spawns: [
      air('s6-d', 0.3, 180, FLOOR_TOP - 150),
      ground('s6-e', 0.9, 320, 'audit-drone', 40, 120),
    ],
  },
  {
    id: 's6-w4',
    gates: true,
    trigger: { x: 6100, y: 0, width: 420, height: 540 },
    spawns: [
      air('s6-f', 0, 170, FLOOR_TOP - 170),
      air('s6-g', 0.8, 300, FLOOR_TOP - 140),
      ground('s6-h', 1.7, 430, 'audit-drone', 40, 120),
    ],
  },
  {
    id: 's6-w5',
    gates: false,
    trigger: { x: 8300, y: 0, width: 400, height: 540 },
    spawns: [ground('s6-i', 0, 190, 'warden', 80, 200), air('s6-j', 1.0, 380, FLOOR_TOP - 180)],
  },
  {
    id: 's6-w6',
    gates: false,
    trigger: { x: 10400, y: 0, width: 400, height: 540 },
    spawns: [
      air('s6-k', 0, 160, FLOOR_TOP - 150),
      air('s6-l', 0.7, 270, FLOOR_TOP - 180),
      air('s6-m', 1.4, 380, FLOOR_TOP - 140),
    ],
  },
]

/** 阵列巡守 guards the server hall's far rack row. */
export const STAGE_06_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's6-mini',
    minibossId: 'miniboss-array-warden',
    trigger: { x: 9400, y: 0, width: 300, height: 540 },
    x: 9800,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ------------------------------------------------------------------ stage 7 */

/**
 * 熔炉区 - the stage that teaches armour.
 *
 * Armoured enemies absorb frontal fire, so every gating beat here is a wall of
 * them: the player has to get behind the body or bring a piercing round, and the
 * stage makes sure both answers exist by the time the miniboss asks for one.
 */
export const STAGE_07_WAVES: readonly Wave[] = [
  {
    id: 's7-w1',
    gates: false,
    trigger: { x: 500, y: 0, width: 340, height: 540 },
    spawns: [ground('s7-a', 0.2, 240, 'forge', 70, 180)],
  },
  {
    // The teaching beat: one armoured body, nothing else, so its immunity is
    // unambiguous rather than one confusing hit in a crowd.
    id: 's7-w2',
    gates: true,
    trigger: { x: 1900, y: 0, width: 380, height: 540 },
    spawns: [ground('s7-b', 0, 220, 'armored', 90, 220)],
  },
  {
    id: 's7-w3',
    gates: false,
    trigger: { x: 4000, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s7-c', 0.3, 190, 'armored', 90, 220),
      ground('s7-d', 1.1, 350, 'forge', 70, 180),
    ],
  },
  {
    id: 's7-w4',
    gates: true,
    trigger: { x: 6200, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s7-e', 0, 180, 'armored', 90, 220),
      ground('s7-f', 0.8, 310, 'armored', 90, 220),
      ground('s7-g', 1.8, 440, 'turret', 50, 150),
    ],
  },
  {
    id: 's7-w5',
    gates: false,
    trigger: { x: 8400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s7-h', 0, 200, 'forge', 70, 180),
      ground('s7-i', 1.0, 380, 'armored', 90, 220),
    ],
  },
  {
    id: 's7-w6',
    gates: false,
    trigger: { x: 10400, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s7-j', 0, 150, 'armored', 90, 220),
      ground('s7-k', 0.7, 260, 'steam-vent', 35, 90),
      ground('s7-l', 1.4, 370, 'charger', 45, 130),
    ],
  },
]

/** 熔炉匠长 guards the last furnace run. */
export const STAGE_07_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's7-mini',
    minibossId: 'miniboss-forge-master',
    trigger: { x: 9400, y: 0, width: 300, height: 540 },
    x: 9800,
    y: FLOOR_TOP,
    gates: true,
  },
]

/* ------------------------------------------------------------------ stage 8 */

/**
 * 改写者 - act II's boss stage.
 *
 * Like stage 4, none of these waves gate: the boss already holds the door, and a
 * gating wave in front of a boss stage would put two locks on one exit. The
 * miniboss is where the lock lives, and it is the last thing taught before the
 * rewriter's gravity flip.
 */
export const STAGE_08_WAVES: readonly Wave[] = [
  {
    id: 's8-w1',
    gates: false,
    trigger: { x: 700, y: 0, width: 340, height: 540 },
    spawns: [ground('s8-a', 0.2, 240, 'armored', 90, 220)],
  },
  {
    id: 's8-w2',
    gates: false,
    trigger: { x: 2500, y: 0, width: 380, height: 540 },
    spawns: [
      ground('s8-b', 0, 190, 'forge', 70, 180),
      ground('s8-c', 1.0, 360, 'armored', 90, 220),
    ],
  },
  {
    id: 's8-w3',
    gates: false,
    trigger: { x: 4500, y: 0, width: 400, height: 540 },
    spawns: [
      ground('s8-d', 0, 170, 'warden', 80, 200),
      air('s8-e', 0.9, 320, FLOOR_TOP - 160),
      ground('s8-f', 1.8, 450, 'armored', 90, 220),
    ],
  },
  {
    id: 's8-w4',
    gates: false,
    trigger: { x: 6700, y: 0, width: 420, height: 540 },
    spawns: [
      ground('s8-g', 0, 160, 'armored', 90, 220),
      ground('s8-h', 0.7, 280, 'forge', 70, 180),
      ground('s8-h2', 1.4, 380, 'armored', 90, 220),
      ground('s8-i', 2.2, 480, 'elite-charger', 120, 400),
    ],
  },
]

/**
 * 红线书记 is the rewriter's herald.
 *
 * It gates, and it is the only gating fight in the stage: the rewriter's door
 * belongs to the rewriter, but the act should not let the player meet it without
 * a fight first.
 */
export const STAGE_08_MINIBOSSES: readonly MinibossPlacement[] = [
  {
    id: 's8-mini',
    minibossId: 'miniboss-redline-clerk',
    trigger: { x: 8200, y: 0, width: 300, height: 540 },
    x: 8600,
    y: FLOOR_TOP,
    gates: true,
  },
]

/** Shared floor height, so the act II files agree with each other. */
export const ACT2_GROUND_HEIGHT = GROUND_H
