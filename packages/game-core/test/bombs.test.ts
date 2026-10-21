import { describe, expect, it } from 'vitest'
import {
  bombActive,
  bombEffect,
  canDetonate,
  createBombState,
  detonate,
  INITIAL_BOMBS,
  updateBomb,
} from '../src/systems/Bombs.js'

describe('Bomb skills (T-M1-04)', () => {
  it('starts with three charges', () => {
    expect(createBombState().charges).toBe(INITIAL_BOMBS)
    expect(INITIAL_BOMBS).toBe(3)
  })

  it('spends one charge per detonation', () => {
    const state = createBombState()
    detonate(state, 'blast')
    expect(state.charges).toBe(2)
    detonate(state, 'blast')
    expect(state.charges).toBe(1)
  })

  it('refuses to fire with no charges left', () => {
    const state = createBombState(0)
    expect(canDetonate(state)).toBe(false)
    expect(detonate(state, 'blast')).toBeNull()
  })

  it('gives every character a different effect kind', () => {
    const kinds = [
      'blast',
      'laser-pierce',
      'homing-mother',
      'shield',
      'context-replay',
      'prism-refract',
    ].map((id) => bombEffect(id as never).kind)
    expect(new Set(kinds).size).toBe(6)
  })

  it('starts a timed effect only for timed bombs', () => {
    const shield = createBombState()
    detonate(shield, 'shield')
    expect(bombActive(shield)).toBe(true)

    const blast = createBombState()
    detonate(blast, 'blast')
    expect(bombActive(blast)).toBe(false)
  })

  it('expires a timed effect', () => {
    const state = createBombState()
    detonate(state, 'shield')
    updateBomb(state, 5)
    expect(bombActive(state)).toBe(false)
    expect(state.activeSeconds).toBe(0)
  })
})
