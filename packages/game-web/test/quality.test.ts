import { FIXED_STEP_SECONDS } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import {
  detectTier,
  nextTierDown,
  QUALITY,
  resolveQuality,
  shouldDowngrade,
} from '../src/performance/Quality'

describe('Quality tiers (T-M5-02)', () => {
  it('defines three tiers', () => {
    expect(Object.keys(QUALITY).sort()).toEqual(['high', 'low', 'medium'])
  })

  it('gives each tier different particle budgets', () => {
    const counts = [
      QUALITY.high.maxParticles,
      QUALITY.medium.maxParticles,
      QUALITY.low.maxParticles,
    ]
    expect(new Set(counts).size).toBe(3)
    expect(QUALITY.high.maxParticles).toBeGreaterThan(QUALITY.medium.maxParticles)
    expect(QUALITY.medium.maxParticles).toBeGreaterThan(QUALITY.low.maxParticles)
  })

  it('drops parallax layers as quality falls', () => {
    expect(QUALITY.high.parallaxLayers).toBe(4)
    expect(QUALITY.low.parallaxLayers).toBeLessThan(QUALITY.high.parallaxLayers)
  })

  it('turns effects off at the low tier', () => {
    expect(QUALITY.low.screenEffects).toBe(false)
    expect(QUALITY.high.screenEffects).toBe(true)
  })
})

describe('Quality never touches the simulation (T-M5-02)', () => {
  it('leaves the fixed step untouched', () => {
    // The single most important assertion in this file: quality is a rendering
    // concern, and the simulation must run at 1/60 on every tier.
    expect(FIXED_STEP_SECONDS).toBeCloseTo(1 / 60, 10)
  })

  it('exposes no simulation field at all', () => {
    for (const tier of Object.values(QUALITY)) {
      expect(tier).not.toHaveProperty('fixedStep')
      expect(tier).not.toHaveProperty('tickRate')
    }
  })
})

describe('Quality detection (T-M5-02)', () => {
  it('is conservative on high-density screens', () => {
    expect(detectTier(3, 8)).toBe('low')
  })

  it('is conservative on few cores', () => {
    expect(detectTier(2, 2)).toBe('low')
    expect(detectTier(2, 4)).toBe('medium')
  })

  it('allows the high tier only when both agree', () => {
    expect(detectTier(2, 8)).toBe('high')
  })

  it('steps down one tier at a time', () => {
    expect(nextTierDown('high')).toBe('medium')
    expect(nextTierDown('medium')).toBe('low')
    expect(nextTierDown('low')).toBe('low')
  })

  it('downgrades only on sustained low frame rate', () => {
    expect(shouldDowngrade({ averageFps: 30 })).toBe(true)
    expect(shouldDowngrade({ averageFps: 58 })).toBe(false)
  })

  it('lets a manual choice override detection', () => {
    expect(resolveQuality('high', 'low').tier).toBe('low')
    expect(resolveQuality('low', null).tier).toBe('low')
  })
})
