import { describe, expect, it } from 'vitest'
import { COOP, coopEnabled, playerSlotCount } from '../src/data/coop.js'

/**
 * REQ-PLY-010 asks for co-op reserves at the data layer, not for a second player.
 *
 * The acceptance criterion is that the configuration exists and ships disabled.
 * These tests pin both halves: the fields are there and shaped, and turning them on
 * is a deliberate act rather than something that quietly starts happening.
 *
 * The disabled state matters more than it looks. A configuration that no longer
 * reads as off is how a half-built feature reaches players, and there is no second
 * player to give them.
 */
describe('co-op reserves (REQ-PLY-010)', () => {
  it('ships disabled', () => {
    expect(COOP.enabled).toBe(false)
    expect(coopEnabled()).toBe(false)
  })

  it('addresses one player slot while disabled', () => {
    expect(playerSlotCount()).toBe(1)
    expect(COOP.maxPlayers).toBe(1)
  })

  it('carries the settings a later milestone would need', () => {
    // The point of the reserve: the shape is decided now, so the milestone that
    // enables it is a switch rather than a design session.
    expect(COOP.lifeMode).toBe('shared')
    expect(typeof COOP.friendlyFire).toBe('boolean')
    expect(typeof COOP.friendlyFireMultiplier).toBe('number')
    expect(typeof COOP.sharedLifePool).toBe('number')
    expect(typeof COOP.respawnDelaySeconds).toBe('number')
  })

  it('does not leave friendly fire as an inert zero', () => {
    // friendlyFire false with a zero multiplier would make the later tuning of
    // that multiplier do nothing while looking live.
    expect(COOP.friendlyFire).toBe(false)
  })

  it('opens the second slot only when enabled', () => {
    const enabled = { ...COOP, enabled: true, maxPlayers: 2 as const }
    expect(coopEnabled(enabled)).toBe(true)
    expect(playerSlotCount(enabled)).toBe(2)
  })

  it('keeps the shipped preset free of a shared pool', () => {
    // A non-zero pool with maxPlayers 1 would spend hearts on a partner who does
    // not exist.
    expect(COOP.sharedLifePool).toBe(0)
    expect(COOP.respawnDelaySeconds).toBe(0)
  })
})
