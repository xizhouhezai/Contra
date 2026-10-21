import { describe, expect, it } from 'vitest'
import { PASSIVE_TUNING } from '../src/data/characters.js'
import { SPREAD_GAIN_PER_SHOT } from '../src/systems/Combat.js'
import {
  addMemoryMark,
  createPassiveState,
  extraHomingLocks,
  extraPrismTargets,
  foresightLeadSeconds,
  homingDamageMultiplier,
  registerRhythmKill,
  spreadGainFor,
} from '../src/systems/Passives.js'

describe('Passives (T-M1-03)', () => {
  it('DeepSeek halves the spread gain', () => {
    expect(spreadGainFor('spread-resist')).toBeCloseTo(SPREAD_GAIN_PER_SHOT * 0.5, 10)
    expect(spreadGainFor('foresight')).toBeCloseTo(SPREAD_GAIN_PER_SHOT, 10)
  })

  it('Qwen gets foresight lead time and nobody else does', () => {
    expect(foresightLeadSeconds('foresight')).toBe(0.5)
    expect(foresightLeadSeconds('spread-resist')).toBe(0)
  })

  it('Doubao boosts homing damage and locks', () => {
    expect(homingDamageMultiplier('sticky-tracking')).toBe(1.3)
    expect(extraHomingLocks('sticky-tracking')).toBe(1)
    expect(homingDamageMultiplier('multimodal')).toBe(1)
    expect(extraHomingLocks('multimodal')).toBe(0)
  })

  it('Gemini adds prism targets', () => {
    expect(extraPrismTargets('multimodal')).toBe(1)
    expect(extraPrismTargets('long-context')).toBe(0)
  })

  it('GLM heals once per stage after the kill threshold', () => {
    const state = createPassiveState()
    for (let kill = 1; kill < PASSIVE_TUNING.rhythmKillsPerHeart; kill += 1) {
      expect(registerRhythmKill(state, 'balanced-rhythm')).toBe(false)
    }
    expect(registerRhythmKill(state, 'balanced-rhythm')).toBe(true)
    // Second crossing must not heal again.
    for (let kill = 0; kill < PASSIVE_TUNING.rhythmKillsPerHeart; kill += 1) {
      expect(registerRhythmKill(state, 'balanced-rhythm')).toBe(false)
    }
  })

  it('Kimi pays out on the fifth mark then resets', () => {
    const state = createPassiveState()
    for (let mark = 1; mark < PASSIVE_TUNING.contextMarksRequired; mark += 1) {
      expect(addMemoryMark(state, 'long-context', 'enemy-1')).toBe(false)
    }
    expect(addMemoryMark(state, 'long-context', 'enemy-1')).toBe(true)
    expect(state.marks.get('enemy-1')).toBe(0)
    expect(state.pendingPayout).toContain('enemy-1')
  })

  it('does nothing for a character without that passive', () => {
    const state = createPassiveState()
    expect(addMemoryMark(state, 'multimodal', 'enemy-1')).toBe(false)
    expect(registerRhythmKill(state, 'multimodal')).toBe(false)
  })
})
