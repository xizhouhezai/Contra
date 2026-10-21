import { describe, expect, it } from 'vitest'
import { CAMPAIGN_STAGES, STAGE_04, STAGE_08 } from '../src/data/campaign.js'
import {
  clearProgress,
  emptyProgress,
  gradeRun,
  isUnlocked,
  loadProgress,
  type ProgressStorage,
  recordClear,
  saveProgress,
} from '../src/stages/Progress.js'
import { StageRunner } from '../src/stages/StageRunner.js'
import { input } from './support.js'

/** In-memory Storage double. */
function memoryStorage(): ProgressStorage & { readonly dump: Map<string, string> } {
  const dump = new Map<string, string>()
  return {
    dump,
    get: (key) => dump.get(key) ?? null,
    set: (key, value) => {
      dump.set(key, value)
    },
    remove: (key) => {
      dump.delete(key)
    },
  }
}

const IDS = CAMPAIGN_STAGES.map((stage) => stage.id)

describe('Campaign stages (T-M2-10 / T-M2-11)', () => {
  it('defines eight stages covering acts I and II', () => {
    expect(CAMPAIGN_STAGES).toHaveLength(8)
    expect(CAMPAIGN_STAGES.filter((s) => s.act === 1)).toHaveLength(4)
    expect(CAMPAIGN_STAGES.filter((s) => s.act === 2)).toHaveLength(4)
  })

  it('numbers stages 1 through 8 in order', () => {
    expect(CAMPAIGN_STAGES.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('puts a boss on stages 4 and 8', () => {
    expect(STAGE_04.bossId).toBe('claude-auditor')
    expect(STAGE_08.bossId).toBe('claude-rewriter')
    const bossStages = CAMPAIGN_STAGES.filter((s) => s.bossId !== undefined)
    expect(bossStages).toHaveLength(2)
  })

  it('teaches all five act I/II mechanics', () => {
    const used = new Set(CAMPAIGN_STAGES.flatMap((s) => s.mechanics))
    for (const mechanic of [
      'bounce-wall',
      'platforming',
      'tracking-enemy',
      'flying-enemy',
      'armored-enemy',
    ]) {
      expect(used.has(mechanic as never)).toBe(true)
    }
  })

  it('gives every stage a positive designed time', () => {
    for (const stage of CAMPAIGN_STAGES) expect(stage.timeTargetSeconds).toBeGreaterThan(0)
  })

  it('places the exit inside the stage bounds', () => {
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.exit.x + stage.exit.width).toBeLessThanOrEqual(stage.widthPx)
      expect(stage.exit.y).toBeGreaterThan(0)
    }
  })

  it('loads and clears every stage with the same runner', () => {
    for (const stage of CAMPAIGN_STAGES) {
      const runner = new StageRunner(stage)
      const frames = Math.ceil((stage.widthPx / 180) * 60) + 240
      for (let frame = 0; frame < frames; frame += 1) {
        runner.update(1 / 60, input({ moveX: 1, jump: true }))
      }
      expect(runner.progress().stageId).toBe(stage.id)
      expect(runner.progress().steps).toBeGreaterThan(0)
    }
  })
})

describe('Progress storage (T-M2-12)', () => {
  it('starts empty with only stage 1 unlocked', () => {
    const progress = emptyProgress(IDS)
    expect(progress.stages).toHaveLength(8)
    expect(progress.unlockedThrough).toBe(1)
    expect(isUnlocked(progress, 1)).toBe(true)
    expect(isUnlocked(progress, 2)).toBe(false)
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    const progress = recordClear(emptyProgress(IDS), 'stage-01', 1200, 2)
    saveProgress(storage, progress)

    const loaded = loadProgress(storage, IDS)
    expect(loaded.unlockedThrough).toBe(2)
    expect(loaded.stages[0]?.cleared).toBe(true)
    expect(loaded.stages[0]?.bestScore).toBe(1200)
  })

  it('keeps the best score across clears', () => {
    let progress = emptyProgress(IDS)
    progress = recordClear(progress, 'stage-01', 800, 2)
    progress = recordClear(progress, 'stage-01', 1500, 2)
    progress = recordClear(progress, 'stage-01', 300, 2)
    expect(progress.stages[0]?.bestScore).toBe(1500)
    expect(progress.stages[0]?.clears).toBe(3)
  })

  it('clears the save', () => {
    const storage = memoryStorage()
    saveProgress(storage, recordClear(emptyProgress(IDS), 'stage-01', 100, 2))
    clearProgress(storage)
    expect(loadProgress(storage, IDS).unlockedThrough).toBe(1)
  })

  it('survives a corrupted save', () => {
    const storage = memoryStorage()
    storage.set('contra.progress.v1', '{not json')
    const loaded = loadProgress(storage, IDS)
    expect(loaded.unlockedThrough).toBe(1)
    expect(loaded.stages.every((s) => !s.cleared)).toBe(true)
  })

  it('reconstitutes a stage added after the save was written', () => {
    const storage = memoryStorage()
    saveProgress(storage, {
      stages: [{ stageId: 'stage-01', cleared: true, bestScore: 500, clears: 1 }],
      unlockedThrough: 2,
    })
    const loaded = loadProgress(storage, IDS)
    expect(loaded.stages).toHaveLength(8)
    expect(loaded.stages[7]?.cleared).toBe(false)
  })
})

describe('Run grading (T-M2-13)', () => {
  const base = { score: 1000, accuracy: 0.9, elapsedSeconds: 90, timeTargetSeconds: 100 }

  it('awards S for fast and accurate', () => {
    expect(gradeRun(base)).toBe('S')
  })

  it('drops to A when slow but accurate', () => {
    expect(gradeRun({ ...base, elapsedSeconds: 130 })).toBe('A')
  })

  it('drops to A when fast but sloppy', () => {
    expect(gradeRun({ ...base, accuracy: 0.5 })).toBe('A')
  })

  it('gives B when both miss', () => {
    expect(gradeRun({ ...base, elapsedSeconds: 130, accuracy: 0.7 })).toBe('B')
  })

  it('gives C when badly off both', () => {
    expect(gradeRun({ ...base, elapsedSeconds: 200, accuracy: 0.3 })).toBe('C')
  })
})
