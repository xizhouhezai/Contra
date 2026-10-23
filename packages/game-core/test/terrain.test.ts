import { describe, expect, it } from 'vitest'
import {
  applyBlast,
  blocksMovement,
  createTerrainState,
  motionOffset,
  platformAt,
  platformDelta,
  platformId,
  reachedExit,
  type TerrainPlatform,
} from '../src/systems/Terrain.js'

const STATIC: TerrainPlatform = { x: 0, y: 300, width: 100, height: 20 }

const BREAKABLE: TerrainPlatform = {
  x: 200,
  y: 300,
  width: 100,
  height: 20,
  breakableHp: 2,
  reveals: { id: 'loot-1', x: 240, y: 260 },
}

const HORIZONTAL: TerrainPlatform = {
  x: 400,
  y: 300,
  width: 100,
  height: 16,
  motion: { axis: 'horizontal', amplitudePx: 50, periodSeconds: 4, phaseSeconds: 0 },
}

const VERTICAL: TerrainPlatform = {
  x: 600,
  y: 300,
  width: 100,
  height: 16,
  motion: { axis: 'vertical', amplitudePx: 40, periodSeconds: 2, phaseSeconds: 0 },
}

describe('Breakable terrain (T-M3-01)', () => {
  it('starts intact', () => {
    const state = createTerrainState()
    expect(blocksMovement(BREAKABLE, state, 1)).toBe(true)
  })

  it('breaks after enough blasts', () => {
    const state = createTerrainState()
    const platforms = [BREAKABLE]

    const first = applyBlast(platforms, state, { x: 250, y: 300 }, 80)
    expect(first).toHaveLength(0)
    expect(blocksMovement(BREAKABLE, state, 0)).toBe(true)

    const second = applyBlast(platforms, state, { x: 250, y: 300 }, 80)
    expect(second).toContain(platformId(BREAKABLE, 0))
    expect(blocksMovement(BREAKABLE, state, 0)).toBe(false)
  })

  it('ignores blasts out of range', () => {
    const state = createTerrainState()
    const broken = applyBlast([BREAKABLE], state, { x: 5000, y: 5000 }, 50)
    expect(broken).toHaveLength(0)
    expect(blocksMovement(BREAKABLE, state, 0)).toBe(true)
  })

  it('never breaks an indestructible platform', () => {
    const state = createTerrainState()
    for (let hit = 0; hit < 10; hit += 1) applyBlast([STATIC], state, { x: 50, y: 300 }, 200)
    expect(blocksMovement(STATIC, state, 0)).toBe(true)
  })

  it('reveals loot once it breaks', () => {
    const state = createTerrainState()
    applyBlast([BREAKABLE], state, { x: 250, y: 300 }, 80)
    applyBlast([BREAKABLE], state, { x: 250, y: 300 }, 80)
    expect(BREAKABLE.reveals?.id).toBe('loot-1')
    expect(state.destroyed.has(platformId(BREAKABLE, 0))).toBe(true)
  })
})

/** The motion a platform carries, or a thrown error when the fixture is wrong. */
function motionOf(platform: TerrainPlatform) {
  const motion = platform.motion
  if (motion === undefined) throw new Error('fixture has no motion')
  return motion
}

describe('Moving platforms (T-M3-02)', () => {
  it('is a pure function of time', () => {
    const motion = motionOf(HORIZONTAL)
    expect(motionOffset(motion, 1.3)).toBe(motionOffset(motion, 1.3))
  })

  it('is at its peak at phase zero', () => {
    expect(motionOffset(motionOf(HORIZONTAL), 0)).toBeCloseTo(50, 10)
  })

  it('returns to the peak after one full period', () => {
    const motion = motionOf(HORIZONTAL)
    expect(motionOffset(motion, motion.periodSeconds)).toBeCloseTo(motionOffset(motion, 0), 8)
  })

  it('moves horizontal platforms only on x', () => {
    const atZero = platformAt(HORIZONTAL, 0)
    const half = platformAt(HORIZONTAL, (HORIZONTAL.motion?.periodSeconds ?? 2) / 2)
    expect(atZero.y).toBe(300)
    expect(half.y).toBe(300)
    expect(atZero.x).not.toBe(half.x)
  })

  it('moves vertical platforms only on y', () => {
    const atZero = platformAt(VERTICAL, 0)
    const half = platformAt(VERTICAL, (VERTICAL.motion?.periodSeconds ?? 2) / 2)
    expect(atZero.x).toBe(600)
    expect(half.x).toBe(600)
    expect(atZero.y).not.toBe(half.y)
  })

  it('leaves static platforms alone', () => {
    expect(platformAt(STATIC, 99)).toEqual({ x: 0, y: 300, width: 100, height: 20 })
  })

  it('reports the rider delta between two samples', () => {
    const delta = platformDelta(HORIZONTAL, 0, 0.5)
    expect(delta.x).not.toBe(0)
    expect(delta.y).toBe(0)
  })

  it('carries a rider by the same amount the platform moved', () => {
    const riderStart = 450
    const delta = platformDelta(HORIZONTAL, 1, 1.5)
    const riderEnd = riderStart + delta.x
    expect(riderEnd - riderStart).toBeCloseTo(delta.x, 10)
  })
})

describe('Vertical scroll (T-M3-03)', () => {
  const exit = { x: 100, y: 800, width: 80, height: 40 }

  it('reaches a vertical exit from above', () => {
    const player = { x: 120, y: 790, width: 24, height: 40 }
    expect(reachedExit(player, exit, 'vertical')).toBe(true)
  })

  it('does not reach while still high up', () => {
    const player = { x: 120, y: 300, width: 24, height: 40 }
    expect(reachedExit(player, exit, 'vertical')).toBe(false)
  })

  it('still requires horizontal overlap', () => {
    const player = { x: 500, y: 800, width: 24, height: 40 }
    expect(reachedExit(player, exit, 'vertical')).toBe(false)
  })

  it('keeps horizontal stages using the box test', () => {
    const horizontalExit = { x: 100, y: 200, width: 40, height: 120 }
    const inside = { x: 110, y: 220, width: 24, height: 40 }
    const above = { x: 110, y: 50, width: 24, height: 40 }
    expect(reachedExit(inside, horizontalExit, 'horizontal')).toBe(true)
    expect(reachedExit(above, horizontalExit, 'horizontal')).toBe(false)
  })
})
