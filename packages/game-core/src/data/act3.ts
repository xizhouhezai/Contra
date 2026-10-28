/**
 * Act III stages 9-12.
 *
 * Source of truth: docs/game/requirements/stages.md - 幕 III.
 *
 * Appended to the campaign catalogue rather than kept apart, so the whole twelve
 * is one array and the flow test can walk it end to end.
 *
 * All four are rebuilt for the expansion: each is a ten minute stage now, with
 * waves, a gating mid-stage fight and - except for the vertical one - 12000px of
 * level. Stage 11 is the exception in shape rather than in budget: it is 9600
 * tall instead of 12000 wide, because its whole mechanic is that it runs downward.
 */

import {
  STAGE_09_MINIBOSSES,
  STAGE_09_WAVES,
  STAGE_10_MINIBOSSES,
  STAGE_10_WAVES,
  STAGE_11_MINIBOSSES,
  STAGE_11_WAVES,
  STAGE_12_MINIBOSSES,
  STAGE_12_WAVES,
} from './act3Waves.js'
import type { StageDefinition } from './stageTypes.js'

const GROUND_H = 60
const FLOOR_TOP = 400

/**
 * Stage 9 - 坍塌档案库. Breakable-terrain teaching stage.
 *
 * Rebuilt for the expansion. The stage is about the floor coming apart, so its
 * geometry is mostly breakable: the walkways that would otherwise be a corridor
 * are planks with 20 HP, and the player's own gun is the way through.
 */
export const STAGE_09: StageDefinition = {
  id: 'stage-09',
  name: '坍塌档案库',
  act: 3,
  index: 9,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 3800, height: GROUND_H },
    // The first breakable wall: a level shot stops here, so it has to come down.
    { x: 3900, y: FLOOR_TOP - 180, width: 24, height: 180, breakableHp: 20 },
    // Walkways that break. Each is a shortcut the player can open rather than a
    // wall they must break: the floor below always goes somewhere.
    { x: 1700, y: 300, width: 160, height: 16, breakableHp: 20 },
    { x: 2400, y: 260, width: 160, height: 16, breakableHp: 20 },
    { x: 3200, y: 300, width: 160, height: 16, breakableHp: 20 },
    { x: 4000, y: FLOOR_TOP, width: 3400, height: GROUND_H },
    { x: 4300, y: 290, width: 180, height: 16, breakableHp: 20 },
    { x: 5200, y: 250, width: 180, height: 16, breakableHp: 20 },
    { x: 6100, y: 290, width: 180, height: 16, breakableHp: 20 },
    { x: 6800, y: FLOOR_TOP - 110, width: 200, height: 18 },
    { x: 7500, y: FLOOR_TOP, width: 4500, height: GROUND_H },
    { x: 7800, y: 280, width: 180, height: 16, breakableHp: 20 },
    { x: 8700, y: 250, width: 180, height: 16, breakableHp: 20 },
    { x: 9600, y: 280, width: 180, height: 16, breakableHp: 20 },
    { x: 10500, y: 260, width: 180, height: 16, breakableHp: 20 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_09_WAVES,
  minibosses: STAGE_09_MINIBOSSES,
  mechanics: ['breakable-terrain'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 10 - 镜像回廊. Moving-platform teaching stage.
 *
 * Rebuilt for the expansion. Three moving planks were the whole of the mechanic
 * on a 3000px stage; now there are nine across 12000px, on both axes and out of
 * phase, so the route is a timing problem for the length of the stage rather than
 * for one screen. The mirror apostle shares the stage with its own lieutenant.
 */
export const STAGE_10: StageDefinition = {
  id: 'stage-10',
  name: '镜像回廊',
  act: 3,
  index: 10,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 3200, height: GROUND_H },
    {
      x: 800,
      y: 320,
      width: 140,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 90, periodSeconds: 5, phaseSeconds: 0 },
    },
    {
      x: 1500,
      y: 260,
      width: 140,
      height: 16,
      motion: { axis: 'vertical', amplitudePx: 70, periodSeconds: 4, phaseSeconds: 1.3 },
    },
    {
      x: 2300,
      y: 320,
      width: 140,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 120, periodSeconds: 6, phaseSeconds: 2.6 },
    },
    { x: 3400, y: FLOOR_TOP, width: 3400, height: GROUND_H },
    {
      x: 3700,
      y: 300,
      width: 150,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 110, periodSeconds: 5.5, phaseSeconds: 0.8 },
    },
    {
      x: 4500,
      y: 250,
      width: 150,
      height: 16,
      motion: { axis: 'vertical', amplitudePx: 80, periodSeconds: 4.5, phaseSeconds: 2 },
    },
    {
      x: 5300,
      y: 300,
      width: 150,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 130, periodSeconds: 6.5, phaseSeconds: 3.2 },
    },
    {
      x: 6100,
      y: 260,
      width: 150,
      height: 16,
      motion: { axis: 'vertical', amplitudePx: 90, periodSeconds: 5, phaseSeconds: 1.1 },
    },
    { x: 7000, y: FLOOR_TOP, width: 5000, height: GROUND_H },
    {
      x: 7400,
      y: 310,
      width: 150,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 100, periodSeconds: 5.2, phaseSeconds: 2.4 },
    },
    {
      x: 8200,
      y: 250,
      width: 150,
      height: 16,
      motion: { axis: 'vertical', amplitudePx: 85, periodSeconds: 4.8, phaseSeconds: 0.5 },
    },
    {
      x: 9000,
      y: 300,
      width: 150,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 120, periodSeconds: 6.2, phaseSeconds: 3.8 },
    },
    {
      x: 9800,
      y: 260,
      width: 150,
      height: 16,
      motion: { axis: 'vertical', amplitudePx: 75, periodSeconds: 4.2, phaseSeconds: 1.9 },
    },
    {
      x: 10600,
      y: 310,
      width: 150,
      height: 16,
      motion: { axis: 'horizontal', amplitudePx: 110, periodSeconds: 5.8, phaseSeconds: 2.2 },
    },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_10_WAVES,
  minibosses: STAGE_10_MINIBOSSES,
  mechanics: ['moving-platform', 'tracking-enemy'],
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
}

/**
 * Stage 11 - 垂直井. Vertical scroll.
 *
 * Height and width swap roles: the shaft is 900 wide and 9600 tall, the player
 * descends, and the exit sits at the bottom. The waves in act3Waves.ts are placed
 * by y for the same reason - progress here runs downward.
 *
 * Two rules make a shaft playable, and both were learned by simulating one rather
 * than by looking at it:
 *
 *   1. **No ledge may span the full width.** A 900px plank across a 900px shaft is
 *      not a ledge, it is a floor, and a player who lands on it can never get
 *      above it again - the jump apex is 70px against a 280px gap. The stage
 *      becomes uncompletable and looks fine in a level editor.
 *   2. **Ledges alternate sides and leave a channel.** Left ledges sit at x=0, right
 *      ones at x=560, so there is always a ~250px gap beside each one. That gap is
 *      the fast route down for a player who wants to skip the fights, and the ledge
 *      is where the fights happen - the waves are placed by y band, so descending
 *      through the channel still meets them.
 *
 * 9600px is not the horizontal stages' 12000, and that is deliberate rather than
 * an oversight: falling is faster than running, and the shaft earns its length
 * from the ledges the player has to stop on rather than from distance alone.
 */
export const STAGE_11: StageDefinition = {
  id: 'stage-11',
  name: '垂直井',
  act: 3,
  index: 11,
  widthPx: 900,
  heightPx: 9600,
  spawn: { x: 60, y: 60 },
  platforms: [
    // Alternating left/right ledges, 340 wide, leaving a 560px channel on the
    // other side. The first few are the teaching ones; the spacing tightens
    // slightly as the shaft goes down.
    { x: 0, y: 200, width: 340, height: 16 },
    { x: 560, y: 480, width: 340, height: 16 },
    { x: 0, y: 760, width: 340, height: 16 },
    { x: 560, y: 1040, width: 340, height: 16 },
    { x: 0, y: 1320, width: 340, height: 16 },
    { x: 560, y: 1600, width: 340, height: 16 },
    { x: 0, y: 1880, width: 360, height: 16 },
    { x: 540, y: 2160, width: 360, height: 16 },
    { x: 0, y: 2440, width: 360, height: 16 },
    { x: 540, y: 2720, width: 360, height: 16 },
    { x: 0, y: 3000, width: 360, height: 16 },
    { x: 540, y: 3280, width: 360, height: 16 },
    { x: 0, y: 3560, width: 380, height: 16 },
    { x: 520, y: 3840, width: 380, height: 16 },
    { x: 0, y: 4120, width: 380, height: 16 },
    { x: 520, y: 4400, width: 380, height: 16 },
    { x: 0, y: 4680, width: 380, height: 16 },
    { x: 520, y: 4960, width: 380, height: 16 },
    // The mid-stage fight's ledge. Wider than the rest because it is a fight, not
    // a foothold - but it stops at 680 of the shaft's 900, leaving a 220px channel
    // on the right. That channel is not decoration: a full-width ledge here would
    // be the wall from rule 1, and this is precisely where the simulated descent
    // got stuck when the ledge was 900 wide.
    //
    // It is also on the left, the same side as the ledge above it, which is
    // deliberate: the player has to fall through the right-hand channel to reach
    // it, so arriving at the fight is itself a small piece of positioning.
    { x: 0, y: 5600, width: 680, height: 20 },
    { x: 560, y: 6200, width: 340, height: 16 },
    { x: 0, y: 6480, width: 340, height: 16 },
    { x: 560, y: 6760, width: 340, height: 16 },
    { x: 0, y: 7040, width: 340, height: 16 },
    { x: 560, y: 7320, width: 340, height: 16 },
    { x: 0, y: 7600, width: 340, height: 16 },
    { x: 560, y: 7880, width: 340, height: 16 },
    { x: 0, y: 8160, width: 340, height: 16 },
    { x: 560, y: 8440, width: 340, height: 16 },
    { x: 0, y: 8720, width: 340, height: 16 },
    { x: 560, y: 9000, width: 340, height: 16 },
    // The floor of the shaft, where the door is. This one *is* full width, because
    // it is the bottom: there is nothing below it to be blocked from.
    { x: 0, y: 9400, width: 900, height: 20 },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_11_WAVES,
  minibosses: STAGE_11_MINIBOSSES,
  mechanics: ['vertical-scroll', 'flying-enemy'],
  scrollMode: 'vertical',
  timeTargetSeconds: 600,
  exit: { x: 400, y: 9360, width: 120, height: 40 },
}

/**
 * Stage 12 - 涌现. The final stage.
 *
 * Rebuilt for the expansion. The approach is four beats that mix every archetype
 * in the game, then the 涌现先驱, then the four-form GPT fight in the arena. None
 * of the waves gate - the boss holds the door - and the miniboss does, so the last
 * thing between the player and the ending has to be beaten rather than walked past.
 */
export const STAGE_12: StageDefinition = {
  id: 'stage-12',
  name: '涌现',
  act: 3,
  index: 12,
  widthPx: 12000,
  heightPx: 540,
  spawn: { x: 60, y: FLOOR_TOP - 60 },
  platforms: [
    { x: 0, y: FLOOR_TOP, width: 10800, height: GROUND_H },
    // The infinite mirror hall: paired planks that face each other, so the stage
    // looks like it repeats even where it does not.
    { x: 500, y: 300, width: 160, height: 16 },
    { x: 820, y: 300, width: 160, height: 16 },
    { x: 1900, y: 280, width: 160, height: 16 },
    { x: 2220, y: 280, width: 160, height: 16 },
    { x: 3300, y: 300, width: 160, height: 16 },
    { x: 3620, y: 300, width: 160, height: 16 },
    { x: 4700, y: 280, width: 160, height: 16 },
    { x: 5020, y: 280, width: 160, height: 16 },
    { x: 6100, y: 300, width: 160, height: 16 },
    { x: 6420, y: 300, width: 160, height: 16 },
    { x: 7500, y: 280, width: 160, height: 16 },
    { x: 7820, y: 280, width: 160, height: 16 },
    { x: 8900, y: 300, width: 160, height: 16 },
    { x: 9220, y: 300, width: 160, height: 16 },
    { x: 10100, y: 280, width: 160, height: 16 },
    // The arena for the final fight.
    { x: 10800, y: FLOOR_TOP, width: 1200, height: GROUND_H },
  ],
  bounceWalls: [],
  targets: [],
  waves: STAGE_12_WAVES,
  minibosses: STAGE_12_MINIBOSSES,
  mechanics: ['platforming', 'armored-enemy'],
  bossId: 'gpt-emergent',
  timeTargetSeconds: 600,
  exit: { x: 11880, y: FLOOR_TOP - 120, width: 40, height: 120 },
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
