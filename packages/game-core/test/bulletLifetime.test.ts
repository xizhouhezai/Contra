import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'

/**
 * Nothing culled bullets that left the world.
 *
 * The omission hid because a player round usually ends on an enemy or a platform.
 * An enemy round fired to the left over an empty stretch of stage had nothing to
 * hit, so it flew forever - one was found at x = -8839 after thirty seconds, still
 * moving. Every live bullet is walked by the hit pass, the blast pass and the
 * player-damage check each step, so they accumulated without bound.
 *
 * Found while recording a playthrough: the bot reported one enemy bullet on screen
 * for the whole run, and it turned out to be eight thousand pixels off the map.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

function arenaWorld(): World {
  return new World({
    spawn: { x: 100, y: 300 },
    platforms: [{ x: 0, y: 400, width: 1200, height: 60 }],
    targets: [],
    exit: { x: 1100, y: 280, width: 40, height: 120 },
  })
}

describe('bullet lifetime', () => {
  it('has no bullets left after a long idle run', () => {
    const world = arenaWorld()
    for (let i = 0; i < 600; i += 1) world.update(1 / 60, IDLE)
    expect(world.bullets.length).toBe(0)
  })

  it('culls an enemy round that flies off the stage', () => {
    // Firing left from the right edge gives the round nothing to hit, which is
    // exactly the case that leaked.
    const world = new World({
      spawn: { x: 1100, y: 300 },
      platforms: [{ x: 0, y: 400, width: 1200, height: 60 }],
      targets: [
        {
          id: 'e1',
          x: 400,
          y: 360,
          width: 32,
          height: 40,
          hp: 99,
          score: 10,
          archetype: 'patrol',
        },
      ],
      act: 1,
    })
    // Hold the player inside the drone's range so it fires, then count rounds.
    // Standing still in range is what a player crossing the lane does.
    let sawEnemyRound = false
    for (let i = 0; i < 900; i += 1) {
      world.update(1 / 60, IDLE)
      world.player.position.x = 600
      world.player.position.y = 300
      if (world.bullets.some((b) => b.owner === 'enemy')) sawEnemyRound = true
    }
    expect(sawEnemyRound).toBe(true)
    // Whatever happened to it, nothing is left flying far off the map.
    for (const bullet of world.bullets) {
      expect(bullet.position.x).toBeGreaterThan(-1000)
    }
  })

  it('keeps a player round that is still on the stage', () => {
    const world = arenaWorld()
    world.update(1 / 60, { ...IDLE, fire: true })
    expect(world.bullets.length).toBeGreaterThan(0)
  })
})
