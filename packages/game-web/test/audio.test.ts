import { describe, expect, it } from 'vitest'
import {
  BGM_KEYS,
  bgmForStage,
  bgmUrl,
  EVENT_SFX_KEYS,
  SFX_KEYS,
  sfxUrl,
  WEAPON_SFX_KEYS,
} from '../src/audio/manifest'

describe('Audio manifest (T-M4-08 / T-M4-09)', () => {
  it('has a sound for all ten weapons', () => {
    expect(WEAPON_SFX_KEYS).toHaveLength(10)
    for (const key of WEAPON_SFX_KEYS) expect(sfxUrl(key)).toBeDefined()
  })

  it('has the nine event sounds', () => {
    expect(EVENT_SFX_KEYS).toHaveLength(9)
    for (const key of EVENT_SFX_KEYS) expect(sfxUrl(key)).toBeDefined()
  })

  it('exposes nineteen effects in total', () => {
    expect(SFX_KEYS).toHaveLength(19)
  })

  it('ships six background tracks', () => {
    expect(BGM_KEYS).toHaveLength(6)
    for (const key of BGM_KEYS) expect(bgmUrl(key)).toBeDefined()
  })

  it('gives the boss stage its own theme', () => {
    expect(bgmForStage(4, true)).toBe('bgm-06')
    expect(bgmForStage(12, true)).toBe('bgm-06')
  })

  it('never repeats the same loop on consecutive non-boss stages', () => {
    const tracks = [1, 2, 3, 4, 5].map((index) => bgmForStage(index, false))
    expect(new Set(tracks).size).toBe(tracks.length)
  })

  it('cycles the five stage tracks across the campaign', () => {
    // Stage 6 reuses stage 1's loop rather than inventing a seventh.
    expect(bgmForStage(6, false)).toBe(bgmForStage(1, false))
    expect(bgmForStage(7, false)).toBe(bgmForStage(2, false))
  })
})
