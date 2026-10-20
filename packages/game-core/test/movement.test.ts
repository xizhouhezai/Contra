import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { GRAVITY, JUMP_SPEED, MOVE_SPEED, PLAYER_HEIGHT } from '../src/data/constants.js'
import type { PlatformDefinition } from '../src/data/types.js'
import { input } from './support.js'

const GROUND: PlatformDefinition = { x: -400, y: 200, width: 2000, height: 40 }

/** Steps the world `count` times with the same input. */
function run(world: World, state: ReturnType<typeof input>, count: number): void {
  for (let step = 0; step < count; step += 1) world.update(1 / 60, state)
}

function settledWorld(): World {
  const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
  run(world, input(), 30)
  return world
}

describe('Movement system (T-M0-04)', () => {
  it('uses the GDD §3.1 numbers', () => {
    expect(MOVE_SPEED).toBe(180)
    expect(JUMP_SPEED).toBe(420)
    expect(GRAVITY).toBe(1200)
  })

  it('lands on the platform and stays there without sinking through', () => {
    const world = settledWorld()

    expect(world.player.onGround).toBe(true)
    expect(world.player.position.y).toBeCloseTo(GROUND.y - PLAYER_HEIGHT, 10)
    expect(world.player.velocity.y).toBe(0)

    run(world, input(), 300)
    expect(world.player.position.y).toBeCloseTo(GROUND.y - PLAYER_HEIGHT, 10)
    expect(world.player.onGround).toBe(true)
  })

  it('runs at 180 px/s', () => {
    const world = settledWorld()
    const before = world.player.position.x

    run(world, input({ moveX: 1 }), 60)
    expect(world.player.position.x - before).toBeCloseTo(MOVE_SPEED, 6)

    const back = world.player.position.x
    run(world, input({ moveX: -1 }), 60)
    expect(world.player.position.x).toBeCloseTo(back - MOVE_SPEED, 6)
    expect(world.player.facing).toBe(-1)
  })

  it('peaks at the apex the GDD numbers actually produce', () => {
    const world = settledWorld()
    const groundY = world.player.position.y
    let apex = groundY

    world.update(1 / 60, input({ jump: true }))
    for (let step = 0; step < 120; step += 1) {
      world.update(1 / 60, input())
      apex = Math.min(apex, world.player.position.y)
    }

    const height = groundY - apex
    // Continuous solution v0^2 / 2g = 73.5px; the discrete 1/60 apex is 70.0px.
    const continuousApex = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY)
    expect(continuousApex).toBeCloseTo(73.5, 6)
    expect(height).toBeGreaterThan(69)
    expect(height).toBeLessThan(74)
  })

  it('returns to the ground after the arc and does not double jump', () => {
    const world = settledWorld()
    const groundY = world.player.position.y

    world.update(1 / 60, input({ jump: true }))
    run(world, input({ jump: true }), 10)
    expect(world.player.velocity.y).toBeLessThan(0)

    run(world, input(), 120)
    expect(world.player.onGround).toBe(true)
    expect(world.player.position.y).toBeCloseTo(groundY, 10)
  })

  it('does not jump while airborne', () => {
    const world = settledWorld()
    world.update(1 / 60, input({ jump: true }))
    run(world, input(), 10)
    const velocityBefore = world.player.velocity.y

    world.update(1 / 60, input({ jump: true }))
    expect(world.player.velocity.y).toBeGreaterThan(velocityBefore)
  })

  it('stops against a wall instead of passing through it', () => {
    const wall: PlatformDefinition = { x: 100, y: 100, width: 40, height: 200 }
    const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND, wall] })
    run(world, input({ moveX: 1 }), 240)

    expect(world.player.position.x).toBeCloseTo(wall.x - 24, 10)
  })

  it('falls freely with no platform underneath', () => {
    const world = new World({ spawn: { x: 0, y: 0 } })
    run(world, input(), 30)

    expect(world.player.onGround).toBe(false)
    expect(world.player.position.y).toBeGreaterThan(0)
  })
})
