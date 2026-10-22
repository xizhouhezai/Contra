import { describe, expect, it } from 'vitest'
import {
  ANIMATED_CLIPS,
  ANIMATED_CREDIT,
  clipKeyFor,
  clipLoops,
  stateFor,
} from '../src/assets/animated'

/** Free animated character (REQ-GUN-001). */

describe('Clip catalogue', () => {
  it('ships the five clips the source archive provides', () => {
    const keys = ANIMATED_CLIPS.map((clip) => clip.key)
    expect(keys).toContain('greek-idle')
    expect(keys).toContain('greek-walk')
    expect(keys).toContain('greek-attack')
    expect(keys).toContain('greek-die')
  })

  it('gives every clip a positive frame count and size', () => {
    for (const clip of ANIMATED_CLIPS) {
      expect(clip.frames).toBeGreaterThan(0)
      expect(clip.frameWidth).toBeGreaterThan(0)
      expect(clip.frameHeight).toBeGreaterThan(0)
      expect(clip.frameRate).toBeGreaterThan(0)
    }
  })

  it('carries the attribution the licence requires', () => {
    expect(ANIMATED_CREDIT.author.length).toBeGreaterThan(0)
    expect(ANIMATED_CREDIT.license).toBe('CC BY 4.0')
  })
})

describe('State to clip mapping (REQ-GUN-001)', () => {
  const base = { moveX: 0, firing: false, inAir: false, hearts: 3 }

  it('stands still when nothing is happening', () => {
    expect(stateFor(base)).toBe('idle')
  })

  it('walks when moving', () => {
    expect(stateFor({ ...base, moveX: 1 })).toBe('walk')
    expect(stateFor({ ...base, moveX: -1 })).toBe('walk')
  })

  it('attacks while firing, even when also moving', () => {
    // Shooting wins over walking: a character shooting while moving should look
    // like it is shooting.
    expect(stateFor({ ...base, firing: true })).toBe('attack')
    expect(stateFor({ ...base, firing: true, moveX: 1 })).toBe('attack')
  })

  it('jumps when airborne', () => {
    expect(stateFor({ ...base, inAir: true })).toBe('jump')
  })

  it('dies when out of hearts, over everything else', () => {
    expect(stateFor({ ...base, hearts: 0 })).toBe('die')
    expect(stateFor({ ...base, hearts: 0, firing: true, inAir: true })).toBe('die')
  })

  it('maps every state to a clip that exists', () => {
    const keys = new Set(ANIMATED_CLIPS.map((clip) => clip.key))
    for (const state of ['idle', 'walk', 'attack', 'jump', 'die'] as const) {
      expect(keys.has(clipKeyFor(state))).toBe(true)
    }
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
    expect(clipLoops('die')).toBe(false)
  })
})
