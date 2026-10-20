import type { TargetDefinition } from '../entities/Target.js'
import type { PlatformDefinition, Rect, Vec2 } from './types.js'

/**
 * The M0 gray-box stage (T-M0-07): one 1600px floor, three targets, an exit on
 * the right. Rendering never reads this file's pixel values directly — it draws
 * whatever the rule layer reports (docs/game/design/modules.md §表现层模块).
 */
export interface GrayboxStageDefinition {
  readonly id: string
  readonly widthPx: number
  readonly heightPx: number
  readonly spawn: Vec2
  readonly platforms: readonly PlatformDefinition[]
  readonly targets: readonly TargetDefinition[]
  readonly exit: Rect
}

/** Floor plus two hovering planks; y grows downward, the floor top is at 400px. */
const FLOOR_Y = 400
const FLOOR_WIDTH = 1600

export const GRAYBOX_STAGE: GrayboxStageDefinition = {
  id: 'graybox-01',
  widthPx: FLOOR_WIDTH,
  heightPx: 540,
  spawn: { x: 40, y: FLOOR_Y - 60 },
  platforms: [
    { x: 0, y: FLOOR_Y, width: FLOOR_WIDTH, height: 60 },
    { x: 520, y: 320, width: 140, height: 16 },
    { x: 820, y: 264, width: 160, height: 16 },
  ],
  targets: [
    { id: 'target-1', x: 360, y: FLOOR_Y - 40, width: 32, height: 40, hp: 30, score: 50 },
    { id: 'target-2', x: 700, y: FLOOR_Y - 40, width: 32, height: 40, hp: 30, score: 50 },
    { id: 'target-3', x: 1060, y: FLOOR_Y - 40, width: 32, height: 40, hp: 30, score: 50 },
    { id: 'target-4', x: 1300, y: FLOOR_Y - 40, width: 32, height: 40, hp: 30, score: 50 },
  ],
  exit: { x: FLOOR_WIDTH - 80, y: FLOOR_Y - 120, width: 40, height: 120 },
}
