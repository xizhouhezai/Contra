import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { PLAYER_WIDTH } from '../src/data/constants.js'

/**
 * The player could walk off the stage.
 *
 * updateMovement resolved collisions against platforms and nothing else, and
 * World had no idea how wide a stage was - WorldOptions does not carry widthPx.
 * Walking right past the last platform put the character over empty space, where
 * resolveY found no floor, so they fell forever and the camera followed.
 *
 * Found by a recording bot that ran right on a loop and reached x = 10612 on a
 * 2400px stage, with onGround false for the last thirty seconds.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const
const RIGHT = { ...IDLE, moveX: 1 } as const

function wideWorld(): World {
  return new World({
    spawn: { x: 100, y: 300 },
    platforms: [{ x: 0, y: 400, width: 1200, height: 60 }],
    exit: { x: 1100, y: 280, width: 40, height: 120 },
  })
}

describe('stage bounds', () => {
  it('stops the player at the right edge instead of letting them leave', () => {
    const world = wideWorld()
    for (let i = 0; i < 600; i += 1) world.update(1 / 60, RIGHT)
    // The bound is the union of platforms and the exit, so it is the platform's
    // right edge (1200), not the exit's (1140) - the floor continues past the
    // exit, and stopping the player at the exit would make a stage look walled
    // off after the goal line. The body is PLAYER_WIDTH wide.
    expect(world.player.position.x).toBeLessThanOrEqual(1200 - PLAYER_WIDTH + 0.5)
    expect(world.player.position.x).toBeGreaterThan(1100)
    expect(Number.isFinite(world.player.position.x)).toBe(true)
  })

  it('keeps the player on the ground at the edge', () => {
    // The bug's signature was standing in mid-air past the terrain: no floor, so
    // gravity won every step.
    const world = wideWorld()
    for (let i = 0; i < 600; i += 1) world.update(1 / 60, RIGHT)
    expect(world.player.onGround).toBe(true)
  })

  it('stops the player at the left edge', () => {
    const world = wideWorld()
    for (let i = 0; i < 600; i += 1) world.update(1 / 60, { ...IDLE, moveX: -1 })
    expect(world.player.position.x).toBeGreaterThanOrEqual(-0.5)
  })

  it('still lets the player reach the exit', () => {
    // A bound that stops short of the exit would make a stage unclearable, which
    // is a worse bug than the one being fixed.
    const world = wideWorld()
    for (let i = 0; i < 900; i += 1) world.update(1 / 60, RIGHT)
    expect(world.player.position.x + PLAYER_WIDTH).toBeGreaterThanOrEqual(1100)
  })
})
