import { describe, expect, it } from 'vitest'
import { ObjectPool } from '../src/systems/ObjectPool.js'

interface Bullet {
  active: boolean
  x: number
  y: number
}

function makePool(initialSize = 0) {
  return new ObjectPool<Bullet>({
    create: () => ({ active: false, x: 0, y: 0 }),
    reset: (b) => {
      b.x = 0
      b.y = 0
    },
    initialSize,
  })
}

describe('Object pool (T-M1-10)', () => {
  it('reuses a released instance', () => {
    const pool = makePool()
    const first = pool.acquire()
    pool.release(first)
    const second = pool.acquire()
    expect(second).toBe(first)
    expect(pool.createdCount).toBe(1)
  })

  it('resets on release', () => {
    const pool = makePool()
    const b = pool.acquire()
    b.x = 100
    pool.release(b)
    expect(b.x).toBe(0)
  })

  it('grows only when the free list is empty', () => {
    const pool = makePool(2)
    expect(pool.createdCount).toBe(2)
    const a = pool.acquire()
    const b = pool.acquire()
    expect(pool.createdCount).toBe(2)
    pool.acquire()
    expect(pool.createdCount).toBe(3)
    pool.release(a)
    pool.release(b)
  })

  it('keeps allocation flat after the peak is reached', () => {
    const pool = makePool()
    const held: Bullet[] = []
    for (let i = 0; i < 50; i += 1) held.push(pool.acquire())
    expect(pool.peakActive).toBe(50)
    pool.releaseAll(held)

    // Ten thousand acquire/release cycles at the same load: with every instance
    // back in the free list, not one further allocation should happen.
    const createdAfterPeak = pool.createdCount
    for (let cycle = 0; cycle < 10000; cycle += 1) {
      const item = pool.acquire()
      pool.release(item)
    }
    expect(pool.createdCount).toBe(createdAfterPeak)
    expect(pool.peakActive).toBe(50)
  })

  it('refuses to release the same instance twice', () => {
    const pool = makePool()
    const b = pool.acquire()
    expect(pool.release(b)).toBe(true)
    expect(pool.release(b)).toBe(false)
  })
})
