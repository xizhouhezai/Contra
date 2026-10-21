import { CAMPAIGN_STAGES, type StageDefinition } from '@contra/game-core'

/**
 * Stage lookup for the presentation layer (T1).
 *
 * The scene receives a stageId through its init data. This resolves it against
 * the campaign catalogue, falling back to the first stage when the id is absent
 * or unknown - a stale save or a hand-typed URL should start the game, not crash
 * it.
 *
 * Kept as a pure function so the mapping can be tested without a browser.
 */

/** Id used when no stage was requested. */
export const DEFAULT_STAGE_ID = 'stage-01'

export interface StageRequest {
  readonly stageId?: string
  readonly characterId?: string
}

/** Resolves the stage to play, never returning undefined. */
export function resolveStage(request: StageRequest | undefined): StageDefinition {
  const id = request?.stageId ?? DEFAULT_STAGE_ID
  return CAMPAIGN_STAGES.find((stage) => stage.id === id) ?? firstStage()
}

function firstStage(): StageDefinition {
  const first = CAMPAIGN_STAGES[0]
  if (first === undefined) throw new Error('campaign has no stages')
  return first
}

/** True when the id names a real stage rather than the fallback. */
export function isKnownStage(stageId: string): boolean {
  return CAMPAIGN_STAGES.some((stage) => stage.id === stageId)
}

/** The stage after this one, or null on the last. */
export function nextStage(stage: StageDefinition): StageDefinition | null {
  const index = CAMPAIGN_STAGES.findIndex((candidate) => candidate.id === stage.id)
  if (index < 0) return null
  return CAMPAIGN_STAGES[index + 1] ?? null
}

/** 1-based position in the campaign, for BGM selection and the HUD. */
export function stageNumber(stage: StageDefinition): number {
  return stage.index
}

/** True when the stage is a boss fight. */
export function isBossStage(stage: StageDefinition): boolean {
  return stage.bossId !== undefined
}

/** True when the stage scrolls vertically. */
export function isVerticalStage(stage: StageDefinition): boolean {
  return stage.scrollMode === 'vertical'
}
