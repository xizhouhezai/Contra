import { describe, expect, it } from 'vitest'
import { MENU_SFX, sfxForEvent } from '../src/audio/eventSfx'
import { SFX_KEYS } from '../src/audio/manifest'

/** Event to sound mapping (T4). */

const pos = { x: 0, y: 0 }

describe('Event to sound mapping (T4)', () => {
  it('gives each weapon its own shot sound', () => {
    for (const weaponId of ['pulse', 'scatter', 'rifle', 'laser'] as const) {
      const key = sfxForEvent({ type: 'shot', weaponId, position: pos, direction: { x: 1, y: 0 } })
      expect(key).toBe(weaponId)
    }
  })

  it('covers every event that should make a sound', () => {
    expect(sfxForEvent({ type: 'hit', targetId: 't1', damage: 1, position: pos })).toBe('hit')
    expect(sfxForEvent({ type: 'playerHurt', heartsLeft: 2, position: pos })).toBe('hurt')
    expect(sfxForEvent({ type: 'playerDied', position: pos })).toBe('die')
    expect(sfxForEvent({ type: 'weaponPicked', weaponId: 'homing', slot: 1 })).toBe('pickup')
    expect(sfxForEvent({ type: 'explosion', position: pos, radius: 32 })).toBe('explosion')
    expect(
      sfxForEvent({
        type: 'bossPhaseChanged',
        bossId: 'claude-auditor',
        phase: 2,
        healthFraction: 0.5,
      }),
    ).toBe('bossPhase')
    expect(sfxForEvent({ type: 'stageCleared', score: 100 })).toBe('clear')
  })

  it('keeps the two deliberate silences', () => {
    // hit already plays on the same frame as a death; two sounds read as one click.
    expect(sfxForEvent({ type: 'enemyDied', enemyId: 'e1', position: pos, score: 10 })).toBeNull()
    expect(sfxForEvent({ type: 'playerHealed', heartsLeft: 3 })).toBeNull()
  })

  it('only ever returns a key that exists', () => {
    const keys: (string | null)[] = [
      sfxForEvent({ type: 'shot', weaponId: 'pulse', position: pos, direction: { x: 1, y: 0 } }),
      sfxForEvent({ type: 'hit', targetId: 't1', damage: 1, position: pos }),
      sfxForEvent({ type: 'playerDied', position: pos }),
      MENU_SFX,
    ]
    for (const key of keys) {
      if (key !== null) expect(SFX_KEYS).toContain(key)
    }
  })
})
