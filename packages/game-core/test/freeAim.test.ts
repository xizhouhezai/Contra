import { describe, expect, it } from 'vitest'
import type { InputState } from '../src/data/types.js'
import { AIM_DIRECTIONS, aimVector } from '../src/systems/Weapons.js'

/**
 * Free aim (REQ-GUN-002).
 *
 * The requirement is that the aim angle becomes continuous while the existing
 * eight-direction behaviour keeps working unchanged, because twelve stages and
 * ten weapons were balanced against it.
 */

const base: InputState = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false }

describe('Eight directions still hold', () => {
  it('derives the same eight angles from the stick as before', () => {
    const seen = new Set<string>()
    for (const moveX of [-1, 0, 1] as const) {
      for (const moveY of [-1, 0, 1] as const) {
        if (moveX === 0 && moveY === 0) continue
        const v = aimVector({ ...base, moveX, moveY }, 1)
        const angle = Math.round((Math.atan2(v.y, v.x) * 180) / Math.PI)
        seen.add(String(angle))
      }
    }
    expect(seen.size).toBe(8)
  })

  it('fires forward when the stick is neutral', () => {
    expect(aimVector(base, 1)).toEqual({ x: 1, y: 0 })
    expect(aimVector(base, -1)).toEqual({ x: -1, y: 0 })
  })

  it('lists the eight canonical directions', () => {
    expect(AIM_DIRECTIONS).toHaveLength(8)
  })
})

describe('Free aim (REQ-GUN-002)', () => {
  it('wins over the stick when present', () => {
    const v = aimVector({ ...base, moveX: 1, aim: { x: 0, y: -1 } }, 1)
    expect(v.x).toBeCloseTo(0, 6)
    expect(v.y).toBeCloseTo(-1, 6)
  })

  it('produces angles between the eight directions', () => {
    // 22.5 degrees is exactly halfway between two of the eight.
    const radians = (22.5 * Math.PI) / 180
    const v = aimVector({ ...base, aim: { x: Math.cos(radians), y: Math.sin(radians) } }, 1)
    const angle = (Math.atan2(v.y, v.x) * 180) / Math.PI
    expect(angle).toBeCloseTo(22.5, 4)
  })

  it('normalises the vector so shot speed does not depend on the device', () => {
    const small = aimVector({ ...base, aim: { x: 0.1, y: 0.1 } }, 1)
    const large = aimVector({ ...base, aim: { x: 300, y: 300 } }, 1)
    expect(Math.hypot(small.x, small.y)).toBeCloseTo(1, 6)
    expect(Math.hypot(large.x, large.y)).toBeCloseTo(1, 6)
    expect(small.x).toBeCloseTo(large.x, 6)
  })

  it('falls back to the stick when the aim vector is zero', () => {
    // A device that reports no direction must not silently disable firing.
    const v = aimVector({ ...base, moveX: 1, aim: { x: 0, y: 0 } }, 1)
    expect(v).toEqual({ x: 1, y: 0 })
  })
})
