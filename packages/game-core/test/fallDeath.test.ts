import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { FALL_MARGIN, PLAYER_HEIGHT } from '../src/data/constants.js'

/**
 * Falling into a pit has to end something.
 *
 * Walking off the end of a stage is already prevented - updateMovement clamps
 * the player to the level - but a gap *inside* the level was not: the player
 * dropped through it, found no floor, and kept accelerating downward with all
 * three hearts intact. Measured on a real stage the character reached y = 64227
 * ten seconds later and was still falling at 12320 px/s, with the stage neither
 * failed nor cleared. On screen that reads as the game freezing, because the
 * camera has nothing left to follow.
 *
 * Found while recording a playthrough: the bot walked off a rope bridge and the
 * video showed the character dropping out of view and never coming back.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const
const RIGHT = { ...IDLE, moveX: 1 } as const

/** Two ledges with a pit between them, wide enough to fall through. */
function pitWorld(hearts = 3): World {
  return new World({
    spawn: { x: 100, y: 300 },
    platforms: [
      { x: 0, y: 400, width: 300, height: 60 },
      { x: 600, y: 400, width: 400, height: 60 },
    ],
    hearts,
  })
}

/** Runs the world until a predicate holds; returns the step it happened on. */
function runUntil(world: World, input: object, predicate: () => boolean, limit = 1200): number {
  for (let step = 0; step < limit; step += 1) {
    world.update(1 / 60, () => input as typeof IDLE)
    if (predicate()) return step
  }
  return -1
}

describe('falling into a pit', () => {
  it('costs a heart instead of falling forever', () => {
    const world = pitWorld(3)
    world.update(1 / 60, () => IDLE)

    const fellAt = runUntil(world, RIGHT, () => !world.player.onGround)
    expect(fellAt).toBeGreaterThanOrEqual(0)

    runUntil(world, RIGHT, () => world.player.hearts < 3)

    expect(world.player.hearts).toBe(2)
  })

  it('puts the player back on the ledge, not into the pit', () => {
    const world = pitWorld(3)
    world.update(1 / 60, () => IDLE)

    runUntil(world, RIGHT, () => world.player.hearts < 3)

    expect(world.player.hearts).toBe(2)
    // Back on top of the first ledge: its surface is y = 400, so the player's
    // top edge sits at 400 - PLAYER_HEIGHT.
    expect(world.player.position.y).toBeCloseTo(400 - PLAYER_HEIGHT, 0)
    expect(world.player.position.x).toBeLessThan(300)
    expect(world.player.onGround).toBe(true)
    // And not still moving, or the next step walks them straight back in.
    expect(world.player.velocity.x).toBe(0)
    expect(world.player.velocity.y).toBe(0)
  })

  it('ends the run when the last heart is lost to a fall', () => {
    const world = pitWorld(1)
    world.update(1 / 60, () => IDLE)
    expect(world.failedStage).toBe(false)

    runUntil(world, RIGHT, () => world.failedStage)

    expect(world.failedStage).toBe(true)
    expect(world.player.hearts).toBe(0)
  })

  it('does not trigger while the player is standing on solid ground', () => {
    const world = new World({
      spawn: { x: 100, y: 300 },
      platforms: [{ x: 0, y: 400, width: 1200, height: 60 }],
    })
    for (let step = 0; step < 120; step += 1) world.update(1 / 60, () => RIGHT)

    expect(world.player.hearts).toBe(3)
    expect(world.failedStage).toBe(false)
  })

  it('leaves a drop that stays inside the level alone', () => {
    // A lower ledge within the margin: dropping onto it must not cost a heart.
    const world = new World({
      spawn: { x: 100, y: 100 },
      platforms: [
        { x: 0, y: 200, width: 300, height: 40 },
        { x: 0, y: 200 + 40 + FALL_MARGIN - 100, width: 900, height: 40 },
      ],
    })
    for (let step = 0; step < 400; step += 1) world.update(1 / 60, () => RIGHT)

    expect(world.player.hearts).toBe(3)
    expect(world.failedStage).toBe(false)
  })
})
