import { describe, expect, it } from 'vitest'
import {
  BREATH_AMPLITUDE,
  breathScale,
  HURT_SECONDS,
  hurtOffset,
  LEAN_RADIANS,
  motionFor,
  RECOIL_SECONDS,
  recoilOffset,
} from '../src/sprites/motion'

/** Procedural motion (REQ-MOT-001 / 002). */

const idle = { moveX: 0 as const, firing: false, hurtSeconds: 0 }

describe('Breathing (REQ-MOT-001)', () => {
  it('stays at or above 1 so the feet never sink', () => {
    for (let t = 0; t < 8; t += 0.05) {
      expect(breathScale(t)).toBeGreaterThanOrEqual(1)
    }
  })

  it('never exceeds the configured amplitude', () => {
    for (let t = 0; t < 8; t += 0.05) {
      expect(breathScale(t)).toBeLessThanOrEqual(1 + BREATH_AMPLITUDE)
    }
  })

  it('actually varies over time', () => {
    const samples = new Set<number>()
    for (let t = 0; t < 8; t += 0.1) samples.add(Math.round(breathScale(t) * 10000))
    expect(samples.size).toBeGreaterThan(5)
  })
})

describe('Recoil (REQ-MOT-001)', () => {
  it('is strongest immediately after the shot', () => {
    expect(recoilOffset(0)).toBeLessThan(0)
  })

  it('settles to nothing', () => {
    expect(recoilOffset(RECOIL_SECONDS)).toBe(0)
    expect(recoilOffset(RECOIL_SECONDS + 1)).toBe(0)
  })

  it('is monotonic: it never kicks back out', () => {
    let previous = recoilOffset(0)
    for (let t = 0; t < RECOIL_SECONDS; t += 0.005) {
      const current = recoilOffset(t)
      expect(current).toBeGreaterThanOrEqual(previous)
      previous = current
    }
  })
})

describe('Hurt shake (REQ-MOT-002)', () => {
  it('is silent when not hurt', () => {
    expect(hurtOffset(0, 1)).toBe(0)
  })

  it('decays as the hurt timer runs out', () => {
    const early = Math.abs(hurtOffset(HURT_SECONDS * 0.9, 0.02))
    const late = Math.abs(hurtOffset(HURT_SECONDS * 0.1, 0.02))
    expect(late).toBeLessThan(early)
  })

  it('oscillates rather than pushing one way', () => {
    const values = [0.01, 0.03, 0.05, 0.07].map((t) => hurtOffset(HURT_SECONDS * 0.8, t))
    expect(values.some((v) => v > 0)).toBe(true)
    expect(values.some((v) => v < 0)).toBe(true)
  })
})

describe('Motion reflects real state (REQ-MOT-002)', () => {
  it('breathes while standing still', () => {
    expect(motionFor(0.5, idle, 99).scaleY).not.toBe(1)
  })

  it('does not breathe while moving', () => {
    const moving = motionFor(0.5, { ...idle, moveX: 1 }, 99)
    expect(moving.scaleY).toBe(1)
  })

  it('leans in the direction of travel', () => {
    expect(motionFor(0.5, { ...idle, moveX: 1 }, 99).rotation).toBeCloseTo(LEAN_RADIANS, 10)
    expect(motionFor(0.5, { ...idle, moveX: -1 }, 99).rotation).toBeCloseTo(-LEAN_RADIANS, 10)
  })

  it('does not lean while standing', () => {
    expect(motionFor(0.5, idle, 99).rotation).toBe(0)
  })

  it('is still apart from breathing when nothing is happening', () => {
    const frame = motionFor(0.5, idle, 99)
    expect(frame.offsetX).toBe(0)
    expect(frame.offsetY).toBe(0)
  })
})
