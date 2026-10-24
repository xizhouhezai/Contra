/**
 * REQ-NFR-004: 核心逻辑脱离渲染层测试
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file.
 */
import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { FIXED_STEP_SECONDS, MAX_STEPS_PER_FRAME } from '../src/data/constants.js'
import type { PlatformDefinition } from '../src/data/types.js'
import { frameDurations, input, scriptedInput } from './support.js'

const GROUND: PlatformDefinition = { x: -400, y: 200, width: 2000, height: 40 }

function makeWorld(): World {
  return new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
}

/** Runs `fps`-driven frames for `seconds` and returns the settled snapshot. */
function runAt(fps: number, seconds: number): World {
  const world = makeWorld()
  for (const dt of frameDurations(fps, seconds)) world.update(dt, scriptedInput)
  return world
}

describe('World fixed-step loop (T-M0-03)', () => {
  it('advances in 1/60s steps regardless of frame length', () => {
    expect(FIXED_STEP_SECONDS).toBeCloseTo(1 / 60, 12)

    const world = makeWorld()
    world.update(1 / 60, input())
    expect(world.steps).toBe(1)

    world.update(1 / 30, input())
    expect(world.steps).toBe(3)

    world.update(1 / 120, input())
    expect(world.steps).toBe(3)
  })

  it('produces identical state for the same input script at 30fps and 120fps', () => {
    const at30 = runAt(30, 1)
    const at120 = runAt(120, 1)

    expect(at120.snapshot()).toEqual(at30.snapshot())
    expect(at30.steps).toBe(60)
    expect(at120.steps).toBe(60)
  })

  it('also agrees at 60fps and over a longer run', () => {
    const at60 = runAt(60, 2)
    const at30 = runAt(30, 2)
    const at120 = runAt(120, 2)

    expect(at60.snapshot()).toEqual(at30.snapshot())
    expect(at120.snapshot()).toEqual(at30.snapshot())
    expect(at30.steps).toBe(120)
  })

  it('caps catch-up at five steps and never spirals', () => {
    const world = makeWorld()
    world.update(1, input())

    expect(world.steps).toBe(MAX_STEPS_PER_FRAME)
    expect(MAX_STEPS_PER_FRAME).toBe(5)

    world.update(1, input())
    expect(world.steps).toBe(2 * MAX_STEPS_PER_FRAME)
  })

  it('stops accumulating once the catch-up window is full', () => {
    const world = makeWorld()
    for (let frame = 0; frame < 10; frame += 1) world.update(1, input())

    expect(world.pendingTime).toBeLessThan(FIXED_STEP_SECONDS)
  })

  it('ignores non-positive and non-finite frame times', () => {
    const world = makeWorld()
    world.update(0, input())
    world.update(-1, input())
    world.update(Number.NaN, input())
    world.update(Number.POSITIVE_INFINITY, input())

    expect(world.steps).toBe(0)
  })
})
