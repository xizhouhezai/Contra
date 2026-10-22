import { CHARACTER_IDS } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import { chibiModules } from '../src/assets/chibi'
import { DEFAULT_LOOK, looksFor, resolveLook } from '../src/assets/looks'

/**
 * Character looks (REQ-VAR-001 to 003).
 *
 * These pin the behaviour that matters: a character with art gets a portrait
 * look, a character with chibi images gets extras, a missing id falls back
 * instead of crashing, and the fallback is stable.
 */

const PORTRAIT = 'https://example.invalid/portrait.webp'

describe('Look catalogue (REQ-VAR-001)', () => {
  it('offers the avatar first, because a square portrait reads on a small card', () => {
    // The full-body illustration is still available, just not first: it is
    // wider than the card and had to be scaled down to fit.
    const looks = looksFor('deepseek', PORTRAIT)
    expect(looks[0]?.kind).toBe('avatar')
    expect(looks[0]?.id).toBe(DEFAULT_LOOK)
    expect(looks.some((look) => look.kind === 'portrait')).toBe(true)
  })

  it('offers no portrait when the character has no art', () => {
    const looks = looksFor('deepseek', undefined)
    expect(looks.some((look) => look.kind === 'portrait')).toBe(false)
  })

  it('gives every character at least one look', () => {
    for (const id of CHARACTER_IDS) {
      const looks = looksFor(id, PORTRAIT)
      expect(looks.length).toBeGreaterThan(0)
    }
  })

  it('uses a texture key that is unique per look', () => {
    const keys = CHARACTER_IDS.flatMap((id) => looksFor(id, PORTRAIT).map((l) => l.textureKey))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('records the source file for attribution', () => {
    for (const look of looksFor('deepseek', PORTRAIT)) {
      expect(look.source.length).toBeGreaterThan(0)
    }
  })
})

describe('Look fallback (REQ-VAR-001)', () => {
  it('returns the chosen look when it exists', () => {
    const looks = looksFor('deepseek', PORTRAIT)
    const second = looks[1]
    if (second === undefined) return
    expect(resolveLook('deepseek', second.id, PORTRAIT).id).toBe(second.id)
  })

  it('falls back instead of throwing on an unknown id', () => {
    // A save can point at an image that was renamed or removed.
    const look = resolveLook('deepseek', 'chibi-does-not-exist', PORTRAIT)
    expect(look).toBeDefined()
    expect(look.id).toBe(DEFAULT_LOOK)
  })

  it('falls back when the character has no art at all', () => {
    const look = resolveLook('gemini', undefined, undefined)
    expect(look).toBeDefined()
  })
})

describe('Chibi index (REQ-VAR-002)', () => {
  it('indexes the six playable characters', () => {
    for (const id of CHARACTER_IDS) {
      expect(Array.isArray(chibiModules[id])).toBe(true)
    }
  })

  it('excludes boss art from the selectable looks', () => {
    // meme-claude and meme-gpt hold boss art, not playable looks.
    expect(chibiModules.claude).toBeUndefined()
    expect(chibiModules.gpt).toBeUndefined()
  })

  it('keeps a stable order so the switcher does not jump', () => {
    for (const list of Object.values(chibiModules)) {
      if (list === undefined) continue
      const names = list.map((entry) => entry.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    }
  })

  it('loads images lazily rather than importing them eagerly', () => {
    // REQ-NFR-003: all 57 eager imports pushed the first load past 8MB.
    const first = chibiModules.deepseek?.[0]
    expect(first).toBeDefined()
    expect(typeof first?.load).toBe('function')
  })
})
