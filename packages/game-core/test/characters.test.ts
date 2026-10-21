import { describe, expect, it } from 'vitest'
import {
  CHARACTER_IDS,
  CHARACTERS,
  characterDefinition,
  PASSIVE_TUNING,
} from '../src/data/characters.js'
import { WEAPONS } from '../src/data/weapons.js'

describe('Character definitions (T-M1-03)', () => {
  it('defines all six characters', () => {
    expect(CHARACTER_IDS).toHaveLength(6)
    expect(Object.keys(CHARACTERS)).toHaveLength(6)
  })

  it('gives every character a distinct starting weapon', () => {
    const weapons = CHARACTER_IDS.map((id) => characterDefinition(id).initialWeapon)
    expect(new Set(weapons).size).toBe(6)
  })

  it('gives every character a distinct passive and bomb', () => {
    const passives = CHARACTER_IDS.map((id) => characterDefinition(id).passive)
    const bombs = CHARACTER_IDS.map((id) => characterDefinition(id).bomb)
    expect(new Set(passives).size).toBe(6)
    expect(new Set(bombs).size).toBe(6)
  })

  it('points every starting weapon at a real weapon', () => {
    for (const id of CHARACTER_IDS) {
      expect(WEAPONS[characterDefinition(id).initialWeapon]).toBeDefined()
    }
  })

  it('carries the codenames from the character spec', () => {
    expect(characterDefinition('deepseek').codename).toBe('蓝色大肥鱼')
    expect(characterDefinition('qwen').codename).toBe('千问')
    expect(characterDefinition('kimi').codename).toBe('月读')
    expect(characterDefinition('gemini').codename).toBe('双子')
  })

  it('keeps the passive tuning aligned with the spec', () => {
    expect(PASSIVE_TUNING.contextMarksRequired).toBe(5)
    expect(PASSIVE_TUNING.stickyDamageMultiplier).toBe(1.3)
    expect(PASSIVE_TUNING.rhythmKillsPerHeart).toBe(20)
  })
})
