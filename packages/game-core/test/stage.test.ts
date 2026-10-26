import { describe, expect, it } from 'vitest'
import type { CoreEvent } from '../src/core.js'
import { World } from '../src/core.js'
import { PLAYER_HEIGHT, PLAYER_WIDTH, PULSE_DAMAGE } from '../src/data/constants.js'
import { GRAYBOX_STAGE } from '../src/data/stages.js'
import { input } from './support.js'

/** A world seeded from the gray-box stage, exactly as game-web seeds it. */
function stageWorld(): World {
  return new World({
    spawn: GRAYBOX_STAGE.spawn,
    platforms: GRAYBOX_STAGE.platforms,
    targets: GRAYBOX_STAGE.targets,
    exit: GRAYBOX_STAGE.exit,
  })
}

/** Y of the gray-box floor top; every grounded placement in these tests uses it. */
function floorTop(): number {
  const floor = GRAYBOX_STAGE.platforms[0]
  if (floor === undefined) throw new Error('expected a floor platform')
  return floor.y
}

/**
 * Steps the world, keeping the player alive.
 *
 * The simulation stops once the last heart is gone, so a test that walks the
 * whole stage would otherwise end mid-run the first time an enemy connects and
 * report a stage that was never cleared. These tests are about traversal and the
 * exit rule; dying has its own tests.
 */
function run(world: World, state: ReturnType<typeof input>, count: number): CoreEvent[] {
  const events: CoreEvent[] = []
  for (let step = 0; step < count; step += 1) {
    events.push(...world.update(1 / 60, state))
    world.player.hearts = world.startingHearts
  }
  return events
}

describe('Gray-box stage (T-M0-07)', () => {
  it('is one 1600px floor with targets and an exit on the right', () => {
    expect(GRAYBOX_STAGE.widthPx).toBe(1600)
    expect(GRAYBOX_STAGE.platforms[0]?.width).toBe(1600)
    expect(GRAYBOX_STAGE.targets.length).toBeGreaterThanOrEqual(3)
    expect(GRAYBOX_STAGE.exit.x + GRAYBOX_STAGE.exit.width).toBeLessThanOrEqual(1600)
    expect(GRAYBOX_STAGE.exit.x).toBeGreaterThan(GRAYBOX_STAGE.widthPx / 2)
  })

  it('spawns the player standing on the floor', () => {
    const world = stageWorld()
    run(world, input(), 30)

    expect(world.player.onGround).toBe(true)
    expect(world.player.position.x).toBe(GRAYBOX_STAGE.spawn.x)
  })

  it('carries the player from the spawn to the exit while running right', () => {
    const world = stageWorld()
    const events: CoreEvent[] = []

    // 180 px/s over ~1600px takes under 9 seconds; 12s leaves a wide margin.
    events.push(...run(world, input({ moveX: 1 }), 60 * 12))

    expect(world.player.position.x).toBeGreaterThan(GRAYBOX_STAGE.exit.x)
    const cleared = events.filter((event) => event.type === 'stageCleared')
    expect(cleared).toHaveLength(1)
    expect(world.clearedStage).toBe(true)
  })

  it('emits stageCleared exactly once even if the player lingers in the exit', () => {
    const world = stageWorld()
    const events = run(world, input({ moveX: 1 }), 60 * 12)
    const again = run(world, input(), 60)

    expect(events.filter((event) => event.type === 'stageCleared')).toHaveLength(1)
    expect(again.some((event) => event.type === 'stageCleared')).toBe(false)
  })

  it('does not clear the stage when the player never reaches the exit', () => {
    const world = stageWorld()
    const events = run(world, input(), 60)

    expect(world.clearedStage).toBe(false)
    expect(events.some((event) => event.type === 'stageCleared')).toBe(false)
  })

  it('treats the exit as an overlap test on the player box', () => {
    const exit = { x: 100, y: 0, width: 40, height: 400 }
    const world = new World({ spawn: { x: 0, y: 0 }, exit })
    run(world, input({ moveX: 1 }), 120)

    const playerRight = world.player.position.x + PLAYER_WIDTH
    expect(playerRight).toBeGreaterThan(exit.x)
    expect(world.clearedStage).toBe(true)
  })
})

describe('Gray-box targets (T-M0-07)', () => {
  it('starts every target alive with its authored hp', () => {
    const world = stageWorld()

    expect(world.targets).toHaveLength(GRAYBOX_STAGE.targets.length)
    expect(world.targets.every((target) => target.alive)).toBe(true)
  })

  it('absorbs a bullet when it hits a target and spends the bullet', () => {
    const world = stageWorld()
    const target = GRAYBOX_STAGE.targets[0]
    if (target === undefined) throw new Error('expected a target')

    // Stand just left of the first target and fire right.
    world.player.position.x = target.x - 60
    world.player.position.y = floorTop() - PLAYER_HEIGHT
    const events = run(world, input({ moveX: 1, fire: true }), 30)

    expect(events.some((event) => event.type === 'hit')).toBe(true)
    expect(world.targets[0]?.hp).toBeLessThan(target.hp)
  })

  it('awards the target score and reports enemyDied when hp reaches zero', () => {
    const world = stageWorld()
    const target = GRAYBOX_STAGE.targets[0]
    if (target === undefined) throw new Error('expected a target')

    world.player.position.x = target.x - 60
    world.player.position.y = floorTop() - PLAYER_HEIGHT

    const shotsNeeded = Math.ceil(target.hp / PULSE_DAMAGE)
    const events = run(world, input({ moveX: 1, fire: true }), shotsNeeded * 12 + 40)
    const died = events.filter((event) => event.type === 'enemyDied')

    expect(world.targets[0]?.alive).toBe(false)
    expect(died).toHaveLength(1)
    expect(world.currentScore).toBe(target.score)
  })

  it('stops awarding score once a target is destroyed', () => {
    const target = {
      id: 'target-only',
      x: 120,
      y: 100,
      width: 32,
      height: 40,
      hp: PULSE_DAMAGE,
      score: 50,
    }
    const world = new World({ spawn: { x: 0, y: 100 }, targets: [target] })
    const events = run(world, input({ fire: true }), 600)

    expect(events.filter((event) => event.type === 'enemyDied')).toHaveLength(1)
    expect(world.currentScore).toBe(50)
    expect(world.targets[0]?.alive).toBe(false)
  })
})
