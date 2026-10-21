import { CAMPAIGN_STAGES } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STAGE_ID,
  isBossStage,
  isKnownStage,
  isVerticalStage,
  nextStage,
  resolveStage,
  stageNumber,
} from '../src/stage/resolveStage'

describe('Stage resolution (T1)', () => {
  it('resolves every campaign stage by id', () => {
    for (const stage of CAMPAIGN_STAGES) {
      expect(resolveStage({ stageId: stage.id }).id).toBe(stage.id)
    }
  })

  it('falls back to stage 1 when no id is given', () => {
    expect(resolveStage(undefined).id).toBe(DEFAULT_STAGE_ID)
    expect(resolveStage({}).id).toBe(DEFAULT_STAGE_ID)
  })

  it('falls back instead of returning undefined for an unknown id', () => {
    const stage = resolveStage({ stageId: 'stage-99' })
    expect(stage.id).toBe(DEFAULT_STAGE_ID)
  })

  it('knows which ids are real', () => {
    expect(isKnownStage('stage-01')).toBe(true)
    expect(isKnownStage('stage-12')).toBe(true)
    expect(isKnownStage('stage-99')).toBe(false)
  })

  it('walks to the next stage and stops at the last', () => {
    const first = resolveStage({ stageId: 'stage-01' })
    expect(nextStage(first)?.id).toBe('stage-02')

    const last = resolveStage({ stageId: 'stage-12' })
    expect(nextStage(last)).toBeNull()
  })

  it('numbers stages 1..12', () => {
    expect(stageNumber(resolveStage({ stageId: 'stage-01' }))).toBe(1)
    expect(stageNumber(resolveStage({ stageId: 'stage-12' }))).toBe(12)
  })

  it('marks the three boss stages', () => {
    const bosses = CAMPAIGN_STAGES.filter((s) => isBossStage(s)).map((s) => s.id)
    expect(bosses).toEqual(['stage-04', 'stage-08', 'stage-12'])
  })

  it('marks stage 11 as the only vertical one', () => {
    const vertical = CAMPAIGN_STAGES.filter((s) => isVerticalStage(s)).map((s) => s.id)
    expect(vertical).toEqual(['stage-11'])
  })
})
