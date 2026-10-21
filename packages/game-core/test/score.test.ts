import { describe, expect, it } from 'vitest'
import {
  accuracy,
  COMBO_BONUS_CAP,
  COMBO_WINDOW_SECONDS,
  comboMultiplier,
  createScoreState,
  registerHit,
  registerKill,
  registerShot,
  updateScore,
} from '../src/systems/Score.js'

describe('Score and combo (T-M1-08)', () => {
  it('starts empty with no combo', () => {
    const state = createScoreState()
    expect(state.score).toBe(0)
    expect(comboMultiplier(state)).toBe(1)
  })

  it('raises the multiplier with each kill', () => {
    const state = createScoreState()
    const first = registerKill(state, 100)
    expect(first).toBeGreaterThan(100)
    expect(state.combo).toBe(1)
  })

  it('caps the bonus at +100%', () => {
    const state = createScoreState()
    state.combo = 100
    expect(comboMultiplier(state)).toBeCloseTo(1 + COMBO_BONUS_CAP, 10)
  })

  it('expires the combo after the window', () => {
    const state = createScoreState()
    registerKill(state, 100)
    updateScore(state, COMBO_WINDOW_SECONDS + 0.01)
    expect(state.combo).toBe(0)
    expect(state.comboTimer).toBe(0)
  })

  it('keeps the combo alive inside the window', () => {
    const state = createScoreState()
    registerKill(state, 100)
    updateScore(state, COMBO_WINDOW_SECONDS - 0.5)
    expect(state.combo).toBe(1)
  })

  it('counts hits and shots', () => {
    const state = createScoreState()
    for (let i = 0; i < 10; i += 1) registerShot(state)
    for (let i = 0; i < 4; i += 1) registerHit(state)
    expect(accuracy(state)).toBeCloseTo(0.4, 10)
  })

  it('reports full accuracy before any shot is fired', () => {
    expect(accuracy(createScoreState())).toBe(1)
  })
})
