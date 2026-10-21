import type { CoreEvent } from '@contra/game-core'
import { describe, expect, it, vi } from 'vitest'
import { CoreEventBridge } from '../src/events/CoreEventBridge'

function bridgeWithSpies() {
  const spies = {
    shot: vi.fn(),
    hit: vi.fn(),
    enemyDied: vi.fn(),
    playerHurt: vi.fn(),
    playerDied: vi.fn(),
    weaponPicked: vi.fn(),
    explosion: vi.fn(),
    bossPhaseChanged: vi.fn(),
    stageCleared: vi.fn(),
  }
  return { bridge: new CoreEventBridge(spies), spies }
}

/** One sample per event family, so every route is exercised. */
const SAMPLES: readonly CoreEvent[] = [
  { type: 'shot', weaponId: 'pulse', position: { x: 10, y: 20 }, direction: { x: 1, y: 0 } },
  { type: 'hit', targetId: 'e1', damage: 10, position: { x: 4, y: 4 } },
  { type: 'enemyDied', enemyId: 'e1', position: { x: 4, y: 4 }, score: 100 },
  { type: 'playerHurt', heartsLeft: 2, position: { x: 8, y: 8 } },
  { type: 'playerDied', position: { x: 8, y: 8 } },
  { type: 'weaponPicked', weaponId: 'laser', slot: 1 },
  { type: 'explosion', position: { x: 12, y: 12 }, radius: 96 },
  { type: 'bossPhaseChanged', bossId: 'claude-auditor', phase: 2 },
  { type: 'stageCleared', score: 150 },
]

describe('CoreEventBridge (T-M1-09)', () => {
  it('routes each family to its own handler and no other', () => {
    for (const event of SAMPLES) {
      const { bridge, spies } = bridgeWithSpies()
      bridge.consume([event])

      const expected = spies[event.type as keyof typeof spies]
      expect(expected).toHaveBeenCalledTimes(1)
      expect(expected).toHaveBeenCalledWith(event)

      for (const [name, spy] of Object.entries(spies)) {
        if (name !== event.type) expect(spy).not.toHaveBeenCalled()
      }
    }
  })

  it('handles a batch in order without dropping any', () => {
    const { bridge, spies } = bridgeWithSpies()
    bridge.consume(SAMPLES)

    const total = Object.values(spies).reduce((sum, spy) => sum + spy.mock.calls.length, 0)
    expect(total).toBe(SAMPLES.length)
  })

  it('does nothing for an empty batch', () => {
    const { bridge, spies } = bridgeWithSpies()
    bridge.consume([])
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled()
  })
})
