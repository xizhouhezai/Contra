import { describe, expect, it } from 'vitest'
import {
  allowsFlashing,
  allowsShake,
  DEFAULT_ACCESSIBILITY,
  glyphFor,
  hudFontSize,
  KEYBOARD_ACTIONS,
  STATE_GLYPHS,
} from '../src/accessibility/options'

describe('Reduce motion (T-M5-05)', () => {
  it('allows effects by default', () => {
    expect(allowsFlashing(DEFAULT_ACCESSIBILITY)).toBe(true)
    expect(allowsShake(DEFAULT_ACCESSIBILITY)).toBe(true)
  })

  it('stops flashing and shake when asked', () => {
    const calm = { ...DEFAULT_ACCESSIBILITY, reduceMotion: true }
    expect(allowsFlashing(calm)).toBe(false)
    expect(allowsShake(calm)).toBe(false)
  })
})

describe('Colour is never the only cue (T-M5-05)', () => {
  it('gives every colour-coded state a distinct glyph', () => {
    const glyphs = Object.values(STATE_GLYPHS)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('draws the glyph alongside the colour', () => {
    expect(glyphFor('playerHurt', DEFAULT_ACCESSIBILITY)).toBe(STATE_GLYPHS.playerHurt)
  })

  it('can be turned off without losing the colour cue', () => {
    const noShapes = { ...DEFAULT_ACCESSIBILITY, shapeCues: false }
    expect(glyphFor('pickup', noShapes)).toBeNull()
  })
})

describe('Large text (T-M5-05)', () => {
  it('scales the HUD', () => {
    expect(hudFontSize(DEFAULT_ACCESSIBILITY)).toBe(14)
    expect(hudFontSize({ ...DEFAULT_ACCESSIBILITY, largeText: true })).toBe(20)
  })
})

describe('Keyboard can reach everything (T-M5-05)', () => {
  it('covers movement, aiming, the three actions and pause', () => {
    expect(KEYBOARD_ACTIONS).toContain('moveLeft')
    expect(KEYBOARD_ACTIONS).toContain('moveRight')
    expect(KEYBOARD_ACTIONS).toContain('aimUp')
    expect(KEYBOARD_ACTIONS).toContain('aimDown')
    expect(KEYBOARD_ACTIONS).toContain('jump')
    expect(KEYBOARD_ACTIONS).toContain('fire')
    expect(KEYBOARD_ACTIONS).toContain('bomb')
    expect(KEYBOARD_ACTIONS).toContain('pause')
  })
})
