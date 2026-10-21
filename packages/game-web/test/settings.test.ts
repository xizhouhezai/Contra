import type { ProgressStorage } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings,
  saveSettings,
} from '../src/settings/settings'

function memoryStorage(): ProgressStorage & { readonly dump: Map<string, string> } {
  const dump = new Map<string, string>()
  return {
    dump,
    get: (key) => dump.get(key) ?? null,
    set: (key, value) => {
      dump.set(key, value)
    },
    remove: (key) => {
      dump.delete(key)
    },
  }
}

describe('Settings persistence (T-M5-03)', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips every field', () => {
    const storage = memoryStorage()
    const settings = {
      ...DEFAULT_SETTINGS,
      masterVolume: 0.3,
      sfxVolume: 0.9,
      difficulty: 'hardcore' as const,
      quality: 'low' as const,
      accessibility: { ...DEFAULT_SETTINGS.accessibility, reduceMotion: true },
    }
    saveSettings(storage, settings)

    const loaded = loadSettings(storage)
    expect(loaded.masterVolume).toBeCloseTo(0.3, 10)
    expect(loaded.sfxVolume).toBeCloseTo(0.9, 10)
    expect(loaded.difficulty).toBe('hardcore')
    expect(loaded.quality).toBe('low')
    expect(loaded.accessibility.reduceMotion).toBe(true)
  })

  it('clamps volume into 0..1', () => {
    const storage = memoryStorage()
    saveSettings(storage, { ...DEFAULT_SETTINGS, masterVolume: 5, sfxVolume: -2 })
    const loaded = loadSettings(storage)
    expect(loaded.masterVolume).toBe(1)
    expect(loaded.sfxVolume).toBe(0)
  })

  it('survives a corrupted blob', () => {
    const storage = memoryStorage()
    storage.set('contra.settings.v1', '{not json')
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })

  it('resets to defaults', () => {
    const storage = memoryStorage()
    saveSettings(storage, { ...DEFAULT_SETTINGS, difficulty: 'casual' })
    const reset = resetSettings(storage)
    expect(reset).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps an unset quality as null so detection still applies', () => {
    const storage = memoryStorage()
    saveSettings(storage, DEFAULT_SETTINGS)
    expect(loadSettings(storage).quality).toBeNull()
  })
})
