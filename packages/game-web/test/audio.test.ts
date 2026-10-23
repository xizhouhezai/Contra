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

  it('has the eleven event sounds', () => {
    // Nine until the boss learned to attack: a wind-up needs to be audible and a
    // landed move needs its own weight, so bossTelegraph and bossAttack joined.
    expect(EVENT_SFX_KEYS).toHaveLength(11)
    for (const key of EVENT_SFX_KEYS) expect(sfxUrl(key)).toBeDefined()
  })

  it('exposes twenty-one effects in total', () => {
    expect(SFX_KEYS).toHaveLength(21)
  })

  it('ships one track per stage', () => {
    // Twelve stages, twelve named tracks. The earlier arrangement was six
    // generically numbered files cycled across the campaign, which meant two
    // neighbouring stages shared a loop.
    expect(BGM_KEYS).toHaveLength(12)
    for (const key of BGM_KEYS) expect(bgmUrl(key)).toBeDefined()
  })

  it('gives every stage its own theme, boss stages included', () => {
    const tracks = Array.from({ length: 12 }, (_, i) => bgmForStage(i + 1, false))
    expect(new Set(tracks).size).toBe(12)
    expect(tracks[0]).toBe('bgm-01-dock')
    expect(tracks[11]).toBe('bgm-12-emergence')
  })

  it('names each track after the stage it belongs to', () => {
    // A name like bgm-04-auditor says where it plays; a bare bgm-04 does not.
    for (const key of BGM_KEYS) {
      expect(key.split('-').length).toBeGreaterThanOrEqual(3)
    }
  })

  it('falls back to a real track for a stage out of range', () => {
    // A stage index outside the campaign must not return a key with no file.
    expect(bgmUrl(bgmForStage(99, false))).toBeDefined()
    expect(bgmUrl(bgmForStage(0, false))).toBeDefined()
  })

  it('never reuses a loop, which the cycling arrangement used to do', () => {
    // Stage 6 used to reuse stage 1's loop because there were only five stage
    // tracks. With one per stage that is exactly the bug this guards against.
    expect(bgmForStage(6, false)).not.toBe(bgmForStage(1, false))
    expect(bgmForStage(7, false)).not.toBe(bgmForStage(2, false))
  })
})
