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

/** Shorthand for a target that stands on the floor. */
function groundTarget(id: string, x: number, hp = 30, score = 50) {
  return { id, x, y: FLOOR_TOP - 40, width: 32, height: 40, hp, score }
}

/** Stage 1 - 码头晨雾. Teaches move, jump, aim, shoot. */
export const STAGE_01: StageDefinition = {
  id: 'stage-01',
  name: '码头晨雾',
  act: 1,
  index: 1,
  widthPx: 2400,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 2400, height: GROUND_H },
    // One low step, per the spec's "仅一处低矮台阶".
    { x: 900, y: FLOOR_TOP - 40, width: 120, height: 40 },
  ],
  bounceWalls: [],
  targets: [groundTarget('t1', 600), groundTarget('t2', 1400), groundTarget('t3', 2000)],
  mechanics: [],
  timeTargetSeconds: 90,
  exit: { x: 2320, y: FLOOR_TOP - 120, width: 40, height: 120 },
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
  exit: { x: 2720, y: 220, width: 40, height: 120 },
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

/** Acts I and II, in campaign order. */
export const CAMPAIGN_STAGES: readonly StageDefinition[] = [
  STAGE_01,
  STAGE_02,
  STAGE_03,
  STAGE_04,
  STAGE_05,
  STAGE_06,
  STAGE_07,
  STAGE_08,
]
