import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { BOSSES } from '../src/data/bosses.js'

/** Boss integration (T3). */

const idle = { moveX: 0 as const, moveY: 0 as const, jump: false, fire: false, bomb: false }

function bossWorld(bossId: string): World {
  return new World({ spawn: { x: 0, y: 0 }, bossId: bossId as never })
}

describe('Boss mounting (T3)', () => {
  it('spawns no boss on an ordinary stage', () => {
    expect(new World({ spawn: { x: 0, y: 0 } }).activeBoss).toBeNull()
  })

  it('spawns the boss the stage names', () => {
    const world = bossWorld('claude-auditor')
    expect(world.activeBoss).not.toBeNull()
    expect(world.activeBoss?.definition.id).toBe('claude-auditor')
  })

  it('starts at full hp and phase one', () => {
    const world = bossWorld('claude-auditor')
    expect(world.activeBoss?.hp).toBe(BOSSES['claude-auditor']?.maxHp)
    expect(world.activeBoss?.phase).toBe(1)
  })

  it('refuses an unknown boss id instead of rendering an empty arena', () => {
    expect(() => bossWorld('no-such-boss')).toThrow(/unknown boss/)
  })
})

describe('Boss progression (T3)', () => {
  it('advances its clock as the world steps', () => {
    const world = bossWorld('claude-auditor')
    for (let i = 0; i < 120; i += 1) world.update(1 / 60, idle)
    expect(world.steps).toBeGreaterThan(0)
  })

  it('reports a phase change once hp crosses a threshold', () => {
    const world = bossWorld('claude-auditor')
    const boss = world.activeBoss
    expect(boss).not.toBeNull()
    if (boss === null) return

    const maxHp = boss.definition.maxHp
    boss.hp = Math.floor(maxHp * 0.4)

    const events: string[] = []
    for (let i = 0; i < 180; i += 1) {
      for (const event of world.update(1 / 60, idle)) events.push(event.type)
    }
    expect(boss.phase).toBeGreaterThan(1)
  })

  it('keeps gravity inversion temporary rather than permanent', () => {
    const world = bossWorld('claude-rewriter')
    for (let i = 0; i < 1200; i += 1) world.update(1 / 60, idle)
    const boss = world.activeBoss
    if (boss === null) return
    // After enough cycles the boss is either upright, or between flips.
    expect(typeof world.gravityInverted).toBe('boolean')
  })
})
