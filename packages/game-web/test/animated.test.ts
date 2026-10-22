import { describe, expect, it } from 'vitest'
import {
  ANIMATION_CLIPS,
  CLIP_FRAME_RATE,
  clipLoops,
  FRAME_CREDIT,
  FRAME_SIZE,
  sheetKey,
  stateFor,
} from '../src/assets/animated'

/** Character animation frames (REQ-GUN-001). */

describe('Clip catalogue', () => {
  it('ships the five clips the packer produces', () => {
    expect([...ANIMATION_CLIPS]).toEqual(['idle', 'walk', 'attack', 'jump', 'hurt'])
  })

  it('gives every clip a playback rate', () => {
    for (const clip of ANIMATION_CLIPS) {
      expect(CLIP_FRAME_RATE[clip]).toBeGreaterThan(0)
    }
  })

  it('uses a frame size the packer actually writes', () => {
    // scripts/pack-sprites.py packs 256px cells; a mismatch here would slice
    // every sheet into the wrong frames.
    expect(FRAME_SIZE).toBe(256)
  })

  it('carries the licence the art is under', () => {
    // The frames are derived from CC BY-NC-SA designs, which is why the
    // project stays non-commercial.
    expect(FRAME_CREDIT.license).toBe('CC BY-NC-SA 4.0')
  })
})

describe('Texture keys', () => {
  it('prefixes every key so it cannot collide with the placeholder sheets', () => {
    // manifest.ts registers the old grey placeholders as 'deepseek-idle'.
    // A shared key silently drops one of the two textures, and the placeholder
    // won - which is how the real frames once failed to appear.
    expect(sheetKey('deepseek', 'idle')).toBe('anim-deepseek-idle')
  })

  it('gives each character and clip a distinct key', () => {
    const keys = new Set<string>()
    for (const character of ['deepseek', 'qwen', 'doubao'] as const) {
      for (const clip of ANIMATION_CLIPS) keys.add(sheetKey(character, clip))
    }
    expect(keys.size).toBe(15)
  })
})

describe('State to clip mapping', () => {
  const base = { moveX: 0, firing: false, inAir: false, hurt: false, hearts: 3 }

  it('stands still when nothing is happening', () => {
    expect(stateFor(base)).toBe('idle')
  })

  it('walks when moving', () => {
    expect(stateFor({ ...base, moveX: 1 })).toBe('walk')
    expect(stateFor({ ...base, moveX: -1 })).toBe('walk')
  })

  it('attacks while firing, even when also moving', () => {
    expect(stateFor({ ...base, firing: true })).toBe('attack')
    expect(stateFor({ ...base, firing: true, moveX: 1 })).toBe('attack')
  })

  it('jumps when airborne', () => {
    expect(stateFor({ ...base, inAir: true })).toBe('jump')
  })

  it('lets being hurt interrupt firing', () => {
    // A hit should read as a hit, not as the character calmly shooting.
    expect(stateFor({ ...base, hurt: true, firing: true })).toBe('hurt')
  })

  it('dies when out of hearts, over everything else', () => {
    expect(stateFor({ ...base, hearts: 0 })).toBe('die')
    expect(stateFor({ ...base, hearts: 0, firing: true, inAir: true })).toBe('die')
  })
})

describe('Looping', () => {
  it('loops the resting clips', () => {
    expect(clipLoops('idle')).toBe(true)
    expect(clipLoops('walk')).toBe(true)
  })

  it('plays one-shot clips once', () => {
    // An attack that looped would keep swinging after the trigger was released.
    expect(clipLoops('attack')).toBe(false)
    expect(clipLoops('hurt')).toBe(false)
  })
})
