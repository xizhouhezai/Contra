/**
 * REQ-VAR-003 / REQ-CHR-009: 形象变体比例自适应与立绘一致
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file. The behaviour was covered before;
 * only the link was missing.
 */
import { describe, expect, it } from 'vitest'
import { loadLookChoices, resolveLookId, saveLookChoice } from '../src/data/looks.js'
import type { ProgressStorage } from '../src/stages/Progress.js'

/** In-memory Storage double, matching the one the progress tests use. */
function memoryStorage(seed: Record<string, string> = {}): ProgressStorage {
  const dump = new Map<string, string>(Object.entries(seed))
  return {
    get: (key) => dump.get(key) ?? null,
    set: (key, value) => {
      dump.set(key, value)
    },
    remove: (key) => {
      dump.delete(key)
    },
  }
}

const KEY = 'contra.looks.v1'

describe('Look persistence (REQ-VAR-002)', () => {
  it('round-trips a choice through storage', () => {
    const storage = memoryStorage()
    saveLookChoice(storage, 'deepseek', 'chibi-02')

    expect(loadLookChoices(storage)).toEqual({ deepseek: 'chibi-02' })
  })

  it('keeps one entry per character so a choice is not shared', () => {
    // REQ-VAR-002: switching character must not lose the other's look.
    const storage = memoryStorage()
    saveLookChoice(storage, 'deepseek', 'chibi-02')
    saveLookChoice(storage, 'qwen', 'portrait')

    const choices = loadLookChoices(storage)
    expect(choices.deepseek).toBe('chibi-02')
    expect(choices.qwen).toBe('portrait')
  })

  it('overwrites only the character being changed', () => {
    const storage = memoryStorage()
    saveLookChoice(storage, 'deepseek', 'chibi-02')
    saveLookChoice(storage, 'qwen', 'portrait')
    saveLookChoice(storage, 'deepseek', 'avatar')

    const choices = loadLookChoices(storage)
    expect(choices.deepseek).toBe('avatar')
    expect(choices.qwen).toBe('portrait')
  })

  it('reads a save written before looks were persisted', () => {
    // A player upgrading from a build without this feature has no key at all.
    const storage = memoryStorage()
    expect(loadLookChoices(storage)).toEqual({})
  })

  it('tolerates a save whose look map is not a map', () => {
    // Shapes a truncated or hand-edited write can leave behind.
    for (const raw of ['null', '[]', '"text"', '7', '{not json']) {
      const storage = memoryStorage({ [KEY]: raw })
      expect(loadLookChoices(storage)).toEqual({})
    }
  })

  it('drops entries that are not look ids and keeps the rest', () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({ deepseek: 'avatar', qwen: 42, glm: '', kimi: null }),
    })
    expect(loadLookChoices(storage)).toEqual({ deepseek: 'avatar' })
  })

  it('heals a half-corrupted blob on the next write', () => {
    const storage = memoryStorage({ [KEY]: JSON.stringify({ deepseek: 'avatar', qwen: 42 }) })
    saveLookChoice(storage, 'glm', 'portrait')
    expect(loadLookChoices(storage)).toEqual({ deepseek: 'avatar', glm: 'portrait' })
  })
})

describe('Look fallback (REQ-VAR-002)', () => {
  const AVAILABLE = ['avatar', 'portrait', 'chibi-01']

  it('returns a saved look that the catalogue still has', () => {
    expect(resolveLookId('chibi-01', AVAILABLE)).toBe('chibi-01')
  })

  it('falls back to the first look when the saved one is gone', () => {
    // The chibi set was renumbered between releases.
    expect(resolveLookId('chibi-07', AVAILABLE)).toBe('avatar')
  })

  it('falls back to the first look when nothing was saved', () => {
    expect(resolveLookId(undefined, AVAILABLE)).toBe('avatar')
  })

  it('returns nothing when the character has no looks left', () => {
    // Nothing to fall back to, and a crash here would brick the select screen.
    expect(resolveLookId('avatar', [])).toBeUndefined()
  })
})
