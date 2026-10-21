import type { TargetDefinition } from '../entities/Target.js'
import type { BossId, MechanicId, PlatformDefinition, Rect, Vec2 } from './types.js'

/**
 * A stage, as data.
 *
 * Source of truth: docs/game/requirements/stages.md and
 * docs/game/design/data-model.md - 关卡数据.
 *
 * Everything the run loop needs is here; adding a stage means adding an object to
 * the catalogue, never touching StageRunner (T-M2-01 acceptance).
 */
export interface StageDefinition {
  readonly id: string
  readonly name: string
  /** Campaign act: 1, 2 or 3. */
  readonly act: 1 | 2 | 3
  /** Stage number within the campaign, 1..12. */
  readonly index: number
  readonly widthPx: number
  readonly heightPx: number
  readonly spawn: Vec2
  readonly platforms: readonly PlatformDefinition[]
  /** Walls that reflect bullets (mechanic: bounce-wall). */
  readonly bounceWalls: readonly Rect[]
  readonly targets: readonly TargetDefinition[]
  /** Mechanics this stage teaches or uses. */
  readonly mechanics: readonly MechanicId[]
  /** Boss guarding the stage, if any. */
  readonly bossId?: BossId
  /** Designed clear time, used to sanity-check pacing. */
  readonly timeTargetSeconds: number
  readonly exit: Rect
}
