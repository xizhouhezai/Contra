import { describe, expect, it } from 'vitest'
import { CELL_SIZE, cellRange, SpatialHash } from '../src/systems/SpatialHash.js'

function entry(id: string, x: number, y: number, w = 16, h = 16) {
  return { id, rect: { x, y, width: w, height: h }, value: id }
}

/**
 * A numeric-payload entry, for the one test that measures a SpatialHash<number>.
 *
 * The string variant above is what the other cases use; naming the generic as
 * number in one test and handing it string payloads was a type error that nothing
 * checked, because game-core's tests were never typechecked.
 */
function numericEntry(id: string, x: number, y: number, w = 16, h = 16) {
  return { id, rect: { x, y, width: w, height: h }, value: 1 }
}

describe('Spatial hash (T-M1-07)', () => {
  it('uses 64x64 buckets', () => {
    expect(CELL_SIZE).toBe(64)
    const range = cellRange({ x: 0, y: 0, width: 16, height: 16 })
    expect(range).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('spans the buckets a wide rect touches', () => {
    const range = cellRange({ x: 60, y: 0, width: 10, height: 10 })
    expect(range.minX).toBe(0)
    expect(range.maxX).toBe(1)
  })

  it('finds an entry by its cell', () => {
    const hash = new SpatialHash<string>()
    hash.insert(entry('a', 10, 10))
    expect(hash.query({ x: 0, y: 0, width: 32, height: 32 }).map((e) => e.id)).toContain('a')
  })

  it('misses entries in another cell', () => {
    const hash = new SpatialHash<string>()
    hash.insert(entry('a', 10, 10))
    expect(hash.query({ x: 500, y: 500, width: 16, height: 16 })).toHaveLength(0)
  })

  it('dedupes an entry spanning several cells', () => {
    const hash = new SpatialHash<string>()
    hash.insert(entry('wide', 0, 0, 200, 16))
    const unique = hash.queryUnique({ x: 0, y: 0, width: 200, height: 16 })
    expect(unique.filter((e) => e.id === 'wide')).toHaveLength(1)
  })

  it('clears between stages', () => {
    const hash = new SpatialHash<string>()
    hash.insert(entry('a', 10, 10))
    hash.clear()
    expect(hash.size).toBe(0)
  })

  it('answers a 200-entity query within the frame budget', () => {
    const hash = new SpatialHash<number>()
    for (let i = 0; i < 200; i += 1) {
      hash.insert(numericEntry(`e${i}`, (i % 20) * 40, Math.floor(i / 20) * 40, 24, 24))
    }
    let hits = 0
    const started = performance.now()
    for (let i = 0; i < 200; i += 1) {
      hits += hash.queryUnique({
        x: (i % 20) * 40,
        y: Math.floor(i / 20) * 40,
        width: 24,
        height: 24,
      }).length
    }
    const elapsed = performance.now() - started
    expect(hits).toBeGreaterThan(0)
    // Budget from REQ-NFR-001: a full sweep must fit in a 16ms frame.
    expect(elapsed).toBeLessThan(16)
  })
})
