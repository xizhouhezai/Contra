import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { BOSS_MOVE_REACH, reachFor } from '../src/data/bossReach.js'

/**
 * The boss was documented as telegraphing and attacking long before it did.
 *
 * data/bosses.ts has always carried moves with damage and telegraph windows;
 * core.ts called stepBoss and kept only phaseChanged and gravityFlipped, so a
 * boss moved, warned nothing, and could not take a heart. These tests pin the
 * wiring that was missing rather than the director, which was already correct.
 */

const ARENA_EXIT = { x: 800, y: 280, width: 40, height: 120 }

function bossWorld(options: { playerX?: number } = {}): World {
  return new World({
    spawn: { x: options.playerX ?? 820, y: 360 },
    platforms: [{ x: 0, y: 400, width: 2000, height: 60 }],
    exit: ARENA_EXIT,
    bossId: 'claude-auditor',
  })
}

const IDLE = {
  moveX: 0,
  moveY: 0,
  jump: false,
  fire: false,
  bomb: false,
} as const

/** Runs the world forward, returning every event type it produced. */
function run(world: World, seconds: number): string[] {
  const types: string[] = []
  const steps = Math.ceil(seconds / (1 / 60))
  for (let i = 0; i < steps; i += 1) {
    for (const event of world.update(1 / 60, IDLE)) types.push(event.type)
  }
  return types
}

describe('boss moves are applied (REQ-CMB-003)', () => {
  it('telegraphs before it attacks', () => {
    const world = bossWorld()
    const events = run(world, 3)
    expect(events).toContain('bossTelegraph')
  })

  it('emits an attack after the telegraph resolves', () => {
    const world = bossWorld()
    const events = run(world, 6)
    expect(events).toContain('bossAttack')
  })

  it('takes a heart when the player stands in reach', () => {
    // The auditor's beam covers the whole hall, so standing at the arena centre
    // is inside it. A boss that never costs a heart is decoration, not a fight.
    const world = bossWorld({ playerX: 820 })
    const before = world.player.hearts
    run(world, 6)
    expect(world.player.hearts).toBeLessThan(before)
  })

  it('does not attack before the telegraph finishes', () => {
    // The first move is audi-bean at 1.2s. Nothing should land inside 1s.
    const world = bossWorld()
    const events = run(world, 1)
    expect(events).not.toContain('bossAttack')
  })
})

describe('boss move reach', () => {
  it('gives every authored move an entry', () => {
    // A move missing from the table falls back to a short default, which would
    // silently make new boss moves almost harmless.
    const authored = [
      'audit-beam',
      'clause-chain',
      'rewrite-sweep',
      'redline-lance',
      'corpus-swarm',
      'harvest-vines',
      'emergence-burst',
      'reaper-scythe',
    ]
    for (const id of authored) expect(BOSS_MOVE_REACH[id]).toBeDefined()
  })

  it('keeps ground attacks away from a jumping player', () => {
    expect(reachFor('harvest-vines').requiresGrounded).toBe(true)
  })

  it('falls back to a short reach for an unknown move', () => {
    // Not arena-wide: an unknown move must not become unavoidable.
    expect(reachFor('not-a-real-move').maxDistance).toBeLessThan(500)
  })
})
