import { describe, expect, it } from 'vitest'
import type { StageDefinition } from '../src/data/stageTypes.js'
import { findStage, StageRunner } from '../src/stages/StageRunner.js'
import { input } from './support.js'

function stage(overrides: Partial<StageDefinition> = {}): StageDefinition {
  return {
    id: 'test-stage',
    name: '测试关',
    act: 1,
    index: 1,
    widthPx: 900,
    heightPx: 540,
    spawn: { x: 40, y: 340 },
    platforms: [{ x: 0, y: 400, width: 900, height: 60 }],
    bounceWalls: [],
    targets: [],
    mechanics: [],
    timeTargetSeconds: 30,
    exit: { x: 840, y: 280, width: 40, height: 120 },
    ...overrides,
  }
}

describe('StageRunner (T-M2-01)', () => {
  it('builds a world from a definition', () => {
    const runner = new StageRunner(stage())
    expect(runner.stage.id).toBe('test-stage')
    expect(runner.currentWorld.steps).toBe(0)
  })

  it('clears a stage by running to the exit', () => {
    const runner = new StageRunner(stage())
    // 180 px/s over 800px needs ~4.5s; allow 8s.
    for (let frame = 0; frame < 60 * 8; frame += 1) {
      runner.update(1 / 60, input({ moveX: 1 }))
    }
    expect(runner.progress().cleared).toBe(true)
  })

  it('reports progress against the designed time', () => {
    const runner = new StageRunner(stage({ timeTargetSeconds: 10 }))
    for (let frame = 0; frame < 60 * 5; frame += 1) runner.update(1 / 60, input())

    const progress = runner.progress()
    expect(progress.elapsedSeconds).toBeCloseTo(5, 1)
    expect(progress.paceRatio).toBeCloseTo(0.5, 1)
  })

  it('drives two different stages with the same code', () => {
    const first = new StageRunner(stage({ id: 'a', widthPx: 900 }))
    const second = new StageRunner(
      stage({
        id: 'b',
        widthPx: 1400,
        // The floor has to span the wider stage, or the player walks off the end.
        platforms: [{ x: 0, y: 400, width: 1400, height: 60 }],
        exit: { x: 1340, y: 280, width: 40, height: 120 },
      }),
    )

    expect(first.stage.id).toBe('a')
    expect(second.stage.id).toBe('b')
    expect(first.stage.widthPx).not.toBe(second.stage.widthPx)

    // Both clear with the same loop, no per-stage branching.
    for (const runner of [first, second]) {
      const frames = Math.ceil((runner.stage.widthPx / 180) * 60) + 180
      for (let frame = 0; frame < frames; frame += 1) runner.update(1 / 60, input({ moveX: 1 }))
      expect(runner.progress().cleared).toBe(true)
    }
  })

  it('finds a stage by id', () => {
    const catalogue = [stage({ id: 'one' }), stage({ id: 'two' })]
    expect(findStage(catalogue, 'two')?.id).toBe('two')
    expect(findStage(catalogue, 'missing')).toBeUndefined()
  })
})
