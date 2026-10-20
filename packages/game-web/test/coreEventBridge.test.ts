import type { CoreEvent } from '@contra/game-core'
import { describe, expect, it, vi } from 'vitest'
import { CoreEventBridge } from '../src/events/CoreEventBridge'

function bridgeWithSpies() {
  const shot = vi.fn()
  const stageCleared = vi.fn()
  const bridge = new CoreEventBridge({ shot, stageCleared })
  return { bridge, shot, stageCleared }
}

describe('CoreEventBridge (T-M0-06)', () => {
  it('routes the shot family to the shot handler', () => {
    const { bridge, shot, stageCleared } = bridgeWithSpies()
    const event: CoreEvent = {
      type: 'shot',
      weaponId: 'pulse',
      position: { x: 10, y: 20 },
      direction: { x: 1, y: 0 },
    }

    bridge.consume([event])

    expect(shot).toHaveBeenCalledWith(event)
    expect(stageCleared).not.toHaveBeenCalled()
  })

  it('routes the stageCleared family to the clear handler', () => {
    const { bridge, shot, stageCleared } = bridgeWithSpies()
    const event: CoreEvent = { type: 'stageCleared', score: 150 }

    bridge.consume([event])

    expect(stageCleared).toHaveBeenCalledWith(event)
    expect(shot).not.toHaveBeenCalled()
  })

  it('ignores the seven families M1 has not wired yet', () => {
    const { bridge, shot, stageCleared } = bridgeWithSpies()
    const deferred: CoreEvent[] = [
      { type: 'hit', targetId: 'target-1', damage: 10, position: { x: 0, y: 0 } },
      { type: 'enemyDied', enemyId: 'target-1', position: { x: 0, y: 0 }, score: 50 },
      { type: 'playerHurt', heartsLeft: 2, position: { x: 0, y: 0 } },
      { type: 'playerDied', position: { x: 0, y: 0 } },
      { type: 'weaponPicked', weaponId: 'laser', slot: 1 },
      { type: 'explosion', position: { x: 0, y: 0 }, radius: 96 },
      { type: 'bossPhaseChanged', bossId: 'claude-auditor', phase: 2 },
    ]

    expect(() => bridge.consume(deferred)).not.toThrow()
    expect(shot).not.toHaveBeenCalled()
    expect(stageCleared).not.toHaveBeenCalled()
  })

  it('preserves the order of a mixed batch', () => {
    const order: string[] = []
    const bridge = new CoreEventBridge({
      shot: () => order.push('shot'),
      stageCleared: () => order.push('stageCleared'),
    })

    bridge.consume([
      { type: 'shot', weaponId: 'pulse', position: { x: 0, y: 0 }, direction: { x: 1, y: 0 } },
      { type: 'stageCleared', score: 50 },
      { type: 'hit', targetId: 'target-1', damage: 10, position: { x: 0, y: 0 } },
      { type: 'shot', weaponId: 'pulse', position: { x: 0, y: 0 }, direction: { x: 1, y: 0 } },
    ])

    expect(order).toEqual(['shot', 'stageCleared', 'shot'])
  })

  it('accepts an empty batch', () => {
    const { bridge, shot, stageCleared } = bridgeWithSpies()

    bridge.consume([])

    expect(shot).not.toHaveBeenCalled()
    expect(stageCleared).not.toHaveBeenCalled()
  })
})
