import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import type { WeaponId } from '../src/data/types.js'
import { WEAPONS } from '../src/data/weapons.js'
import { createPlayer, WEAPON_SLOT_COUNT } from '../src/entities/Player.js'
import {
  consumeShot,
  createWeaponSlot,
  ensureFallbackWeapon,
  hasUsableWeapon,
  resolveActiveSlot,
} from '../src/systems/Arsenal.js'
import { input } from './support.js'

const GROUND = { x: -4000, y: 200, width: 20000, height: 40 }

/** A world whose slots are filled exactly as the test wants them. */
function worldWithSlots(slots: (WeaponId | null)[]): World {
  const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
  world.player.weaponSlots = slots.map((id) => (id === null ? null : createWeaponSlot(id)))
  world.player.activeSlot = 0
  return world
}

describe('Four-slot pool (T-M1-01)', () => {
  it('starts with four empty slots and slot 0 active', () => {
    const player = createPlayer({ x: 0, y: 0 })

    expect(player.weaponSlots).toHaveLength(WEAPON_SLOT_COUNT)
    expect(player.weaponSlots.every((slot) => slot === null)).toBe(true)
    expect(player.activeSlot).toBe(0)
    expect(hasUsableWeapon(player)).toBe(false)
  })

  it('replaces only the active slot and keeps the others', () => {
    const world = worldWithSlots(['pulse', 'rifle', null, null])
    world.player.activeSlot = 1

    world.pickUpWeapon('laser')

    const weapons = world.player.weaponSlots.map((slot) => slot?.weaponId ?? null)
    expect(weapons).toEqual(['pulse', 'laser', null, null])
    expect(world.player.weaponSlots[1]?.ammoLeft).toBe(WEAPONS.laser.ammo)
  })

  it('emits weaponPicked with the slot that changed', () => {
    const world = worldWithSlots(['pulse', null, null, null])
    world.player.activeSlot = 3

    const events = world.update(1 / 60, input())
    world.pickUpWeapon('scatter')
    const after = world.update(1 / 60, input())

    expect(events.some((event) => event.type === 'weaponPicked')).toBe(false)
    const picked = after.find((event) => event.type === 'weaponPicked')
    expect(picked).toBeDefined()
    if (picked?.type !== 'weaponPicked') throw new Error('expected a weaponPicked event')
    expect(picked.weaponId).toBe('scatter')
    expect(picked.slot).toBe(3)
    expect(world.player.weaponSlots[0]?.weaponId).toBe('pulse')
  })

  it('refills instead of duplicating when the same weapon is picked again', () => {
    const world = worldWithSlots(['pulse', null, null, null])
    world.pickUpWeapon('pierce')
    const firstSlot = world.player.weaponSlots[0]
    if (firstSlot === null || firstSlot === undefined) throw new Error('expected a filled slot')
    firstSlot.ammoLeft = 5

    world.pickUpWeapon('pierce')

    expect(world.player.weaponSlots.filter((slot) => slot !== null)).toHaveLength(1)
    expect(world.player.weaponSlots[0]?.weaponId).toBe('pierce')
    expect(world.player.weaponSlots[0]?.ammoLeft).toBe(WEAPONS.pierce.ammo)
  })

  it('falls back to the previous slot when ammo runs out', () => {
    const world = worldWithSlots(['pulse', 'pierce', null, null])
    world.player.activeSlot = 1

    const shots: WeaponId[] = []
    for (let step = 0; step < 60 * 11; step += 1) {
      for (const event of world.update(1 / 60, input({ moveX: 1, fire: true }))) {
        if (event.type === 'shot') shots.push(event.weaponId)
      }
    }

    // Pierce holds 40 rounds at 4/s, so the eleventh second is pulse fire.
    expect(shots.slice(0, 40).every((id) => id === 'pierce')).toBe(true)
    expect(shots.slice(40).every((id) => id === 'pulse')).toBe(true)
    expect(world.player.weaponSlots[1]?.ammoLeft).toBe(0)
    expect(world.activeSlot).toBe(0)
    expect(world.player.weaponSlots[0]?.weaponId).toBe('pulse')
  })

  it('falls back through the ring to a slot ahead of the cursor', () => {
    const player = createPlayer({ x: 0, y: 0 })
    player.weaponSlots = [createWeaponSlot('pulse'), null, null, createWeaponSlot('rifle')]
    player.activeSlot = 3
    const ringSlot = player.weaponSlots[3]
    if (ringSlot === null || ringSlot === undefined) throw new Error('expected a filled slot')
    ringSlot.ammoLeft = 1

    const spent = consumeShot(player)

    expect(spent.weaponId).toBe('rifle')
    expect(player.activeSlot).toBe(0)
    expect(resolveActiveSlot(player).weaponId).toBe('pulse')
  })

  it('falls back to the pulse when every slot is empty', () => {
    const player = createPlayer({ x: 0, y: 0 })
    player.weaponSlots = [createWeaponSlot('rifle'), null, null, null]
    const emptySlot = player.weaponSlots[0]
    if (emptySlot === null || emptySlot === undefined) throw new Error('expected a filled slot')
    emptySlot.ammoLeft = 0
    player.activeSlot = 0

    expect(hasUsableWeapon(player)).toBe(false)

    const slot = ensureFallbackWeapon(player)

    expect(slot).toBe(0)
    expect(player.activeSlot).toBe(0)
    expect(player.weaponSlots[0]?.weaponId).toBe('pulse')
    expect(player.weaponSlots[0]?.ammoLeft).toBe(Number.POSITIVE_INFINITY)
    expect(hasUsableWeapon(player)).toBe(true)
  })

  it('never spends the fallback pulse', () => {
    const world = worldWithSlots([null, null, null, null])
    const events: string[] = []

    for (let step = 0; step < 60 * 5; step += 1) {
      for (const event of world.update(1 / 60, input({ moveX: 1, fire: true }))) {
        events.push(event.type)
      }
    }

    expect(events.filter((type) => type === 'shot').length).toBeGreaterThan(0)
    expect(world.player.weaponSlots[0]?.weaponId).toBe('pulse')
    expect(world.player.weaponSlots.filter((slot) => slot !== null)).toHaveLength(1)
    expect(world.player.weaponSlots[0]?.ammoLeft).toBe(Number.POSITIVE_INFINITY)
  })

  it('keeps the pulse when a character starts without one', () => {
    const world = new World({
      spawn: { x: 0, y: 160 },
      platforms: [GROUND],
      characterId: 'gemini',
    })

    expect(world.player.weaponSlots[0]?.weaponId).toBe('prism')

    // Prism holds 150 rounds at 4/s: it is dry after ~37s of sustained fire.
    for (let step = 0; step < 60 * 60; step += 1) {
      world.update(1 / 60, input({ moveX: 1, fire: true }))
    }

    expect(world.player.weaponSlots[0]?.weaponId).toBe('pulse')
  })
})
