import { describe, expect, it } from 'vitest'
import {
  CHARACTER_FRAME,
  CHARACTER_STATES,
  characterSheets,
  characterTexture,
  ENEMY_FRAME,
  enemySheets,
  enemyTexture,
  PARALLAX_FACTORS,
  PARALLAX_LAYERS,
} from '../src/assets/manifest'

describe('Asset manifest (T-M4-04 / T-M4-05)', () => {
  it('finds a sheet for every character state', () => {
    const sheets = characterSheets()
    // Six characters, four states each.
    expect(sheets.length).toBe(6 * CHARACTER_STATES.length)
  })

  it('uses 48px frames for characters', () => {
    for (const sheet of characterSheets()) {
      expect(sheet.frameWidth).toBe(48)
      expect(sheet.frameHeight).toBe(48)
    }
    expect(CHARACTER_FRAME).toBe(48)
  })

  it('finds a sheet for all ten enemies', () => {
    expect(enemySheets().length).toBe(10)
  })

  it('uses 32px frames for enemies', () => {
    for (const sheet of enemySheets()) {
      expect(sheet.frameWidth).toBe(32)
      expect(sheet.frameHeight).toBe(32)
    }
    expect(ENEMY_FRAME).toBe(32)
  })

  it('names textures predictably', () => {
    expect(characterTexture('kimi', 'run')).toBe('kimi-run')
    expect(enemyTexture('armored')).toBe('enemy-armored')
  })

  it('lays out four parallax layers, far to near', () => {
    expect(PARALLAX_LAYERS).toHaveLength(4)
    // The sky is pinned, the foreground nearly tracks the world.
    expect(PARALLAX_FACTORS['industrial-sky']).toBe(0)
    const near = PARALLAX_FACTORS['industrial-foreground'] ?? 0
    const far = PARALLAX_FACTORS['industrial-far-buildings'] ?? 0
    expect(near).toBeGreaterThan(far)
  })
})
