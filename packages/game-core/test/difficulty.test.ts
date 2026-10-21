import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  difficultySettings,
  scaledDamage,
  scaledScore,
} from '../src/data/difficulty.js'

describe('Difficulty tiers (T-M5-04)', () => {
  it('defines three tiers', () => {
    expect(Object.keys(DIFFICULTIES).sort()).toEqual(['casual', 'hardcore', 'standard'])
  })

  it('defaults to standard', () => {
    expect(DEFAULT_DIFFICULTY).toBe('standard')
  })

  it('differs on damage in the right direction', () => {
    expect(DIFFICULTIES.casual.enemyDamageMultiplier).toBeLessThan(1)
    expect(DIFFICULTIES.standard.enemyDamageMultiplier).toBe(1)
    expect(DIFFICULTIES.hardcore.enemyDamageMultiplier).toBeGreaterThan(1)
  })

  it('differs on density', () => {
    expect(DIFFICULTIES.casual.enemyDensityMultiplier).toBeLessThan(
      DIFFICULTIES.hardcore.enemyDensityMultiplier,
    )
  })

  it('differs on hearts', () => {
    const hearts = [
      DIFFICULTIES.casual.playerHearts,
      DIFFICULTIES.standard.playerHearts,
      DIFFICULTIES.hardcore.playerHearts,
    ]
    expect(new Set(hearts).size).toBe(3)
    expect(Math.max(...hearts)).toBe(DIFFICULTIES.casual.playerHearts)
  })

  it('differs on score multiplier', () => {
    expect(DIFFICULTIES.hardcore.scoreMultiplier).toBeGreaterThan(
      DIFFICULTIES.standard.scoreMultiplier,
    )
  })

  it('is forgiving on casual but never free', () => {
    // A difficulty where nothing can hurt you teaches nothing.
    expect(DIFFICULTIES.casual.enemyDamageMultiplier).toBeGreaterThan(0)
    expect(DIFFICULTIES.casual.playerHearts).toBeGreaterThan(1)
  })

  it('scales damage but never below one', () => {
    expect(scaledDamage(2, 'casual')).toBe(1)
    expect(scaledDamage(1, 'casual')).toBe(1)
    expect(scaledDamage(1, 'standard')).toBe(1)
    expect(scaledDamage(1, 'hardcore')).toBe(2)
  })

  it('scales score upward on hardcore', () => {
    expect(scaledScore(100, 'hardcore')).toBeGreaterThan(100)
    expect(scaledScore(100, 'standard')).toBe(100)
  })

  it('exposes every tier through the lookup', () => {
    for (const id of ['casual', 'standard', 'hardcore'] as const) {
      expect(difficultySettings(id).id).toBe(id)
    }
  })
})
