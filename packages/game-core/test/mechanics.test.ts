import { describe, expect, it } from 'vitest'
import {
  bounceOffWalls,
  isOneWay,
  overlaps,
  reflectVelocity,
  shouldLand,
  struckFace,
} from '../src/systems/Mechanics.js'

describe('Bounce walls (T-M2-02)', () => {
  it('reflects a horizontal approach on x', () => {
    expect(reflectVelocity({ x: 5, y: 0 }, 'left')).toEqual({ x: -5, y: 0 })
    expect(reflectVelocity({ x: 5, y: 0 }, 'right')).toEqual({ x: -5, y: 0 })
  })

  it('reflects a vertical approach on y', () => {
    expect(reflectVelocity({ x: 0, y: 5 }, 'top')).toEqual({ x: 0, y: -5 })
    expect(reflectVelocity({ x: 0, y: 5 }, 'bottom')).toEqual({ x: 0, y: -5 })
  })

  it('preserves speed across the bounce', () => {
    const incoming = { x: 3, y: 4 }
    const out = reflectVelocity(incoming, 'left')
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(Math.hypot(incoming.x, incoming.y), 10)
  })

  it('preserves the tangential component', () => {
    const out = reflectVelocity({ x: 3, y: 4 }, 'left')
    expect(out.y).toBe(4)
  })

  it('bounces off a wall it overlaps', () => {
    const wall = { x: 100, y: 0, width: 20, height: 200 }
    const box = { x: 108, y: 50, width: 8, height: 8 }
    const result = bounceOffWalls(box, { x: 6, y: 0 }, [wall])
    expect(result.bounced).toBe(true)
    expect(result.velocity.x).toBe(-6)
  })

  it('passes through when it touches nothing', () => {
    const wall = { x: 500, y: 0, width: 20, height: 200 }
    const box = { x: 10, y: 50, width: 8, height: 8 }
    const result = bounceOffWalls(box, { x: 6, y: 0 }, [wall])
    expect(result.bounced).toBe(false)
    expect(result.velocity).toEqual({ x: 6, y: 0 })
  })

  it('picks the face with the smallest penetration', () => {
    const wall = { x: 0, y: 0, width: 100, height: 100 }
    // Deep inside vertically, barely inside horizontally: the side was hit.
    const box = { x: 92, y: 40, width: 20, height: 20 }
    expect(struckFace(box, wall)).toBe('right')
  })
})

describe('Platform jumping (T-M2-03)', () => {
  it('treats thin planks as one-way', () => {
    expect(isOneWay({ x: 0, y: 0, width: 100, height: 16 })).toBe(true)
    expect(isOneWay({ x: 0, y: 0, width: 100, height: 60 })).toBe(false)
  })

  it('lands when falling onto a platform', () => {
    // Bottom was above the top before the step, at or below after it.
    expect(shouldLand(290, 305, 50, 20, { x: 0, y: 300, width: 200, height: 16 })).toBe(true)
  })

  it('does not land when still above the platform', () => {
    expect(shouldLand(250, 270, 50, 20, { x: 0, y: 300, width: 200, height: 16 })).toBe(false)
  })

  it('does not land when already below it', () => {
    expect(shouldLand(320, 340, 50, 20, { x: 0, y: 300, width: 200, height: 16 })).toBe(false)
  })

  it('does not land outside the horizontal span', () => {
    expect(shouldLand(290, 305, 500, 20, { x: 0, y: 300, width: 200, height: 16 })).toBe(false)
  })

  it('lets a fast faller land instead of tunnelling', () => {
    // 40px step straight through a 16px plank: the previous position is what saves it.
    expect(shouldLand(295, 335, 50, 20, { x: 0, y: 300, width: 200, height: 16 })).toBe(true)
  })

  it('detects overlapping boxes', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    expect(overlaps(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(overlaps(a, { x: 20, y: 20, width: 10, height: 10 })).toBe(false)
  })
})
