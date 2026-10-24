import { BOSSES, WEAPONS } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import {
  bossEffectForMove,
  bossEffectKey,
  effectKey,
  effectKeys,
  hasEffect,
  muzzleForWeapon,
} from '../src/assets/effects'

/**
 * REQ-ART-004: every attack has a visible effect.
 *
 * The requirement is not "an effect file exists" - it is that a player can see
 * that something was fired. Three things follow, and this covers all three:
 *
 *   1. Every weapon has a muzzle flash, so no shot is silent.
 *   2. Enemy fire never looks like the player's own, so a flash on screen says
 *      whose it is before the projectile has been read.
 *   3. Every boss move has an effect, so no telegraph resolves invisibly.
 *
 * The move list is read from the boss definitions rather than written out here.
 * The earlier version of this file hardcoded six GPT move ids and five of them
 * were misspelled, which passed while the fight telegraphed nothing - a hardcoded
 * list can only ever confirm the author's memory.
 */
const ALL_MOVES = Object.values(BOSSES).flatMap((boss) =>
  boss.phases.flatMap((phase) => phase.moves.map((move) => move.id)),
)

describe('attack effects (REQ-ART-004)', () => {
  it('names a texture key for every effect in the catalogue', () => {
    const keys = effectKeys()
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(hasEffect(key)).toBe(true)
  })

  it('gives every weapon a muzzle flash', () => {
    for (const weapon of Object.values(WEAPONS)) {
      const effect = muzzleForWeapon(weapon.id, 'player')
      expect(effect, `武器 ${weapon.id} 没有枪口特效`).toBeTruthy()
      expect(hasEffect(effectKey(effect))).toBe(true)
    }
  })

  it('keeps enemy fire out of the player colours', () => {
    const playerFlashes = new Set(
      Object.values(WEAPONS).map((weapon) => muzzleForWeapon(weapon.id, 'player')),
    )
    const enemyFlash = muzzleForWeapon('pulse', 'enemy')

    expect(playerFlashes.has(enemyFlash)).toBe(false)
    for (const weapon of Object.values(WEAPONS)) {
      expect(muzzleForWeapon(weapon.id, 'enemy')).toBe(enemyFlash)
    }
  })

  it('finds moves to check', () => {
    // Guards the test itself: an empty move list would make the next assertion
    // pass without examining anything.
    expect(ALL_MOVES.length).toBeGreaterThan(10)
  })

  it('gives every boss move an effect', () => {
    const missing = ALL_MOVES.filter((moveId) => bossEffectForMove(moveId) === null)
    expect(missing, `这些招式没有视觉表现: ${missing.join(', ')}`).toEqual([])
  })

  it('resolves every mapped effect to a real texture', () => {
    for (const moveId of ALL_MOVES) {
      const effect = bossEffectForMove(moveId)
      if (effect === null) continue
      expect(hasEffect(bossEffectKey(effect)), `${moveId} 指向了不存在的纹理`).toBe(true)
    }
  })

  it('does not invent an effect for a move that has none', () => {
    // A move with no mapping must come back null rather than a default: a wrong
    // effect shows the player the wrong threat, which is worse than none.
    expect(bossEffectForMove('not-a-real-move')).toBeNull()
  })
})
