/**
 * REQ-STG-003: 关卡以 Boss 战结束
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file. The behaviour was covered before;
 * only the link was missing.
 */
import { describe, expect, it } from 'vitest'
import { ACT_III_STAGES, INTERLUDES, STAGE_11, totalCampaignSeconds } from '../src/data/act3.js'
import { CAMPAIGN_STAGES } from '../src/data/campaign.js'
import { StageRunner } from '../src/stages/StageRunner.js'
import { reachedExit } from '../src/systems/Terrain.js'
import { input } from './support.js'

describe('Act III stages (T-M3-05)', () => {
  it('adds four stages for act III', () => {
    expect(ACT_III_STAGES).toHaveLength(4)
    expect(CAMPAIGN_STAGES).toHaveLength(12)
    expect(CAMPAIGN_STAGES.filter((s) => s.act === 3)).toHaveLength(4)
  })

  it('numbers the twelve stages in order', () => {
    expect(CAMPAIGN_STAGES.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('teaches all three new mechanics', () => {
    const used = new Set(CAMPAIGN_STAGES.flatMap((s) => s.mechanics))
    for (const mechanic of ['breakable-terrain', 'moving-platform', 'vertical-scroll']) {
      expect(used.has(mechanic as never)).toBe(true)
    }
  })

  it('makes stage 11 the vertical one', () => {
    expect(STAGE_11.scrollMode).toBe('vertical')
    expect(STAGE_11.heightPx).toBeGreaterThan(STAGE_11.widthPx)
    const vertical = CAMPAIGN_STAGES.filter((s) => s.scrollMode === 'vertical')
    expect(vertical).toHaveLength(1)
  })

  it('puts the GPT boss on stage 12', () => {
    const final = CAMPAIGN_STAGES.find((s) => s.index === 12)
    expect(final?.bossId).toBe('gpt-emergent')
    const bossStages = CAMPAIGN_STAGES.filter((s) => s.bossId !== undefined)
    expect(bossStages).toHaveLength(3)
  })

  it('places every act III exit inside the stage', () => {
    for (const stage of ACT_III_STAGES) {
      expect(stage.exit.x + stage.exit.width).toBeLessThanOrEqual(stage.widthPx)
      expect(stage.exit.y + stage.exit.height).toBeLessThanOrEqual(stage.heightPx)
    }
  })
})

describe('Campaign flow (T-M3-08)', () => {
  it('loads and advances all twelve stages with one runner', () => {
    for (const stage of CAMPAIGN_STAGES) {
      const runner = new StageRunner(stage)
      // Enough frames to cross the stage at run speed, regardless of axis.
      const span = Math.max(stage.widthPx, stage.heightPx)
      const frames = Math.ceil((span / 180) * 60) + 300
      for (let frame = 0; frame < frames; frame += 1) {
        runner.update(1 / 60, input({ moveX: 1, moveY: 1, jump: true }))
      }
      expect(runner.progress().steps).toBeGreaterThan(0)
    }
  })

  it('sits inside the designed 25-40 minute campaign length', () => {
    const total = totalCampaignSeconds(CAMPAIGN_STAGES)
    expect(total).toBeGreaterThanOrEqual(25 * 60)
    expect(total).toBeLessThanOrEqual(40 * 60)
  })

  it('gives every stage a positive designed time', () => {
    for (const stage of CAMPAIGN_STAGES) expect(stage.timeTargetSeconds).toBeGreaterThan(0)
  })

  it('reaches a vertical exit only from below it', () => {
    const exit = STAGE_11.exit
    const atExit = { x: exit.x + 10, y: exit.y - 10, width: 24, height: 40 }
    const farAbove = { x: exit.x + 10, y: 100, width: 24, height: 40 }
    expect(reachedExit(atExit, exit, 'vertical')).toBe(true)
    expect(reachedExit(farAbove, exit, 'vertical')).toBe(false)
  })
})

describe('Interludes (T-M3-07)', () => {
  it('plays after the two act bosses', () => {
    expect(Object.keys(INTERLUDES).sort()).toEqual(['stage-04', 'stage-08'])
  })

  it('gives each interlude a title and body', () => {
    for (const interlude of Object.values(INTERLUDES)) {
      expect(interlude.title.length).toBeGreaterThan(0)
      expect(interlude.body.length).toBeGreaterThan(0)
    }
  })
})
