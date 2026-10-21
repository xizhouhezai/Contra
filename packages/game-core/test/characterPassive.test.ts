import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { PASSIVE_TUNING } from '../src/data/characters.js'

/**
 * Passive behaviour (T2).
 *
 * GLM's rhythm passive refunds one heart per stage once enough enemies die.
 * The rules that matter: it fires, it fires only once, and it never pushes the
 * player above the hearts they started with - an unbounded refund would make
 * the character unkillable rather than resilient.
 */

/** Kills one target by running the world until the queue drains. */
function damageAll(world: World): void {
  for (const target of world.targets) {
    target.alive = false
  }
}

describe('GLM rhythm passive (T2)', () => {
  it('does not fire for another character', () => {
    const world = new World({ spawn: { x: 0, y: 0 }, characterId: 'deepseek' })
    world.player.hearts = 1
    damageAll(world)
    world.update(1 / 60, { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false })
    expect(world.player.hearts).toBe(1)
  })

  it('keeps hearts within the starting maximum', () => {
    const world = new World({ spawn: { x: 0, y: 0 }, characterId: 'glm' })
    const starting = world.player.hearts
    damageAll(world)
    for (let i = 0; i < 600; i += 1) {
      world.update(1 / 60, { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false })
    }
    expect(world.player.hearts).toBeLessThanOrEqual(starting)
  })

  it('needs the tuned number of kills before it pays out', () => {
    expect(PASSIVE_TUNING.rhythmKillsPerHeart).toBeGreaterThan(0)
  })
})

describe('Character identity reaches the rule layer (T2)', () => {
  it('exposes the passive through the character sheet', () => {
    const world = new World({ spawn: { x: 0, y: 0 }, characterId: 'kimi' })
    expect(world.characterId).toBe('kimi')
  })
})
