/**
 * Act III stages 9-12.
 *
 * Source of truth: docs/game/requirements/stages.md - 幕 III.
 *
 * Appended to the campaign catalogue rather than kept apart, so the whole twelves
 * is one array and the flow test can walk it end to end.
 */
import type { StageDefinition } from './stageTypes.js'

const GROUND_H = 60
const FLOOR_TOP = 400

/** Stage 9 - 可破坏地形教学. */
export const STAGE_09: StageDefinition = {
  id: 'stage-09',
  name: '坍塌档案库',
  act: 3,
  index: 9,
  widthPx: 2900,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 2900, height: GROUND_H },
    { x: 700, y: 300, width: 160, height: 16 },
    { x: 1800, y: 300, width: 160, height: 16 },
  ],
  bounceWalls: [],
  targets: [
    { id: 't1', x: 900, y: FLOOR_TOP - 40, width: 32, height: 40, hp: 30, score: 50 },
    { id: 't2', x: 2000, y: FLOOR_TOP - 40, width: 32, height: 40, hp: 30, score: 50 },
  ],
  mechanics: ['breakable-terrain'],
  timeTargetSeconds: 130,
  exit: { x: 2820, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Stage 10 - 移动平台教学. Also home to the mirror apostle. */
export const STAGE_10: StageDefinition = {
  id: 'stage-10',
  name: '镜像回廊',
  act: 3,
  index: 10,
  widthPx: 3000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 3000, height: GROUND_H },
    { x: 800, y: 320, width: 140, height: 16 },
    { x: 1500, y: 260, width: 140, height: 16 },
    { x: 2200, y: 320, width: 140, height: 16 },
  ],
  bounceWalls: [],
  targets: [
    { id: 'mirror-1', x: 1200, y: FLOOR_TOP - 36, width: 30, height: 36, hp: 60, score: 240 },
    { id: 'mirror-2', x: 2400, y: FLOOR_TOP - 36, width: 30, height: 36, hp: 60, score: 240 },
  ],
  mechanics: ['moving-platform', 'tracking-enemy'],
  timeTargetSeconds: 140,
  exit: { x: 2920, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 11 - 纵向卷轴.
 *
 * Height and width swap roles: the stage is taller than it is wide and the exit
 * sits at the bottom, so progress runs downward.
 */
export const STAGE_11: StageDefinition = {
  id: 'stage-11',
  name: '垂直井',
  act: 3,
  index: 11,
  widthPx: 900,
  heightPx: 2400,
  spawn: { x: 60, y: 60 },
  platforms: [
    { x: 0, y: 200, width: 300, height: 16 },
    { x: 400, y: 480, width: 300, height: 16 },
    { x: 100, y: 760, width: 300, height: 16 },
    { x: 450, y: 1040, width: 300, height: 16 },
    { x: 120, y: 1320, width: 300, height: 16 },
    { x: 400, y: 1600, width: 300, height: 16 },
    { x: 0, y: 1900, width: 900, height: 20 },
  ],
  bounceWalls: [],
  targets: [
    { id: 't1', x: 500, y: 460, width: 30, height: 26, hp: 25, score: 140 },
    { id: 't2', x: 200, y: 1300, width: 30, height: 26, hp: 25, score: 140 },
  ],
  mechanics: ['vertical-scroll', 'flying-enemy'],
  scrollMode: 'vertical',
  timeTargetSeconds: 150,
  exit: { x: 400, y: 2320, width: 120, height: 40 },
}

/** Stage 12 - 终局, the GPT fight. */
export const STAGE_12: StageDefinition = {
  id: 'stage-12',
  name: '涌现',
  act: 3,
  index: 12,
  widthPx: 2000,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 2000, height: GROUND_H },
    { x: 500, y: 300, width: 160, height: 16 },
    { x: 1300, y: 300, width: 160, height: 16 },
  ],
  bounceWalls: [],
  targets: [],
  mechanics: ['platforming', 'armored-enemy'],
  bossId: 'gpt-emergent',
  timeTargetSeconds: 180,
  exit: { x: 1920, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/** Act III, in campaign order. */
export const ACT_III_STAGES: readonly StageDefinition[] = [STAGE_09, STAGE_10, STAGE_11, STAGE_12]

/**
 * Where an interlude plays after a stage.
 *
 * Act I and II close with a boss, so the story beat goes between them; act III
 * ends the campaign and needs no epilogue cue here.
 */
export const INTERLUDES: Readonly<Record<string, { title: string; body: string }>> = {
  'stage-04': {
    title: '幕 I 终 · 审计结束',
    body: '审计者的光束熄灭时，港口的风重新流动起来。更深处的机柜仍在低鸣。',
  },
  'stage-08': {
    title: '幕 II 终 · 改写停止',
    body: '重力归位的那一刻，你听见了自己心跳的方向。最后一扇门在下方。',
  },
}

/** Total designed campaign time, in seconds. */
export function totalCampaignSeconds(stages: readonly StageDefinition[]): number {
  return stages.reduce((sum, stage) => sum + stage.timeTargetSeconds, 0)
}
