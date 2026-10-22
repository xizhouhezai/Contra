import { describe, expect, it } from 'vitest'
import { WEAPON_ICON_SIZE, weaponIconKey, weaponsWithIcons } from '../src/assets/weapons'

/** Weapon icons (T-M6-21). */

const WEAPON_IDS = [
  'pulse',
  'scatter',
  'rifle',
  'homing',
  'pierce',
  'cluster',
  'laser',
  'grenade',
  'replay',
  'prism',
]

describe('Weapon icons', () => {
  it('has an icon for every weapon the rules layer defines', () => {
    const available = weaponsWithIcons()
    for (const id of WEAPON_IDS) {
      expect(available).toContain(id)
    }
  })

  it('keys every icon by the weapon id the rules layer uses', () => {
    // The HUD reads world.player.weaponSlots[].weaponId, so a mismatch here
    // would show the wrong gun or nothing at all.
    expect(weaponIconKey('laser')).toBe('weaponIcon-laser')
  })

  it('prefixes every key so it cannot collide with other art', () => {
    for (const id of WEAPON_IDS) {
      expect(weaponIconKey(id).startsWith('weaponIcon-')).toBe(true)
    }
  })

  it('gives each weapon a distinct key', () => {
    const keys = WEAPON_IDS.map(weaponIconKey)
    expect(new Set(keys).size).toBe(WEAPON_IDS.length)
  })

  it('uses the source icon size the art actually has', () => {
    expect(WEAPON_ICON_SIZE).toBe(128)
  })
})
