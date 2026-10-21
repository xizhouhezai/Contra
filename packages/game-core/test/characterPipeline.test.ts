import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { CHARACTER_IDS, CHARACTERS, INITIAL_WEAPON } from '../src/data/characters.js'
import type { CharacterId } from '../src/data/types.js'

/**
 * Character differentiation (T2).
 *
 * Six characters that all play identically are one character with six
 * portraits. These assert the choice actually reaches the simulation: the
 * starting weapon differs, and the World knows which character it is running.
 */

function worldFor(characterId: CharacterId): World {
  return new World({
    spawn: { x: 0, y: 0 },
    characterId,
  })
}

describe('Character pipeline (T2)', () => {
  it('records the chosen character on the world', () => {
    for (const id of CHARACTER_IDS) {
      expect(worldFor(id).characterId).toBe(id)
    }
  })

  /** The weapon in the player's active slot. */
  function activeWeapon(world: World): string | undefined {
    return world.player.weaponSlots[world.player.activeSlot]?.weaponId
  }

  it('equips the weapon the character sheet promises', () => {
    for (const id of CHARACTER_IDS) {
      expect(activeWeapon(worldFor(id))).toBe(CHARACTERS[id].initialWeapon)
    }
  })

  it('gives all six characters a distinct starting weapon', () => {
    const weapons = CHARACTER_IDS.map((id) => activeWeapon(worldFor(id)))
    expect(new Set(weapons).size).toBe(CHARACTER_IDS.length)
  })

  it('defaults to a real character when none is given', () => {
    const world = new World({ spawn: { x: 0, y: 0 } })
    expect(CHARACTER_IDS).toContain(world.characterId)
  })

  it('maps every character to a weapon that exists', () => {
    for (const id of CHARACTER_IDS) {
      expect(INITIAL_WEAPON[id]).toBe(CHARACTERS[id].initialWeapon)
    }
  })
})
