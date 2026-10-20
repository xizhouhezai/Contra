import { type CoreEvent, GRAYBOX_STAGE, type InputState } from '@contra/game-core'
import { describe, expect, it } from 'vitest'
import { CoreEventBridge } from '../src/events/CoreEventBridge'
import { createGrayboxWorld } from '../src/stage/createGrayboxWorld'

const RUN_RIGHT: InputState = { moveX: 1, moveY: 0, jump: false, fire: true, bomb: false }

/** Drives the world exactly the way StageScene.update does, one 1/60s frame at a time. */
function play(world: ReturnType<typeof createGrayboxWorld>, input: InputState, frames: number) {
  const seen: CoreEvent[] = []
  const bridge = new CoreEventBridge({
    shot: (event) => seen.push(event),
    stageCleared: (event) => seen.push(event),
  })
  for (let frame = 0; frame < frames; frame += 1) {
    bridge.consume(world.update(1 / 60, input))
  }
  return seen
}

describe('StageScene wiring (T-M0-06 / T-M0-07)', () => {
  it('seeds the world from the gray-box stage definition', () => {
    const world = createGrayboxWorld()

    expect(world.player.position.x).toBe(GRAYBOX_STAGE.spawn.x)
    expect(world.targets).toHaveLength(GRAYBOX_STAGE.targets.length)
    expect(world.exit).toEqual(GRAYBOX_STAGE.exit)
  })

  it('produces shot events the bridge forwards while running right and firing', () => {
    const world = createGrayboxWorld()
    const events = play(world, RUN_RIGHT, 60)

    expect(events.filter((event) => event.type === 'shot').length).toBe(6)
  })

  it('clears the stage when the player runs the full length to the exit', () => {
    const world = createGrayboxWorld()
    const events = play(world, RUN_RIGHT, 60 * 12)
    const cleared = events.filter((event) => event.type === 'stageCleared')

    expect(cleared).toHaveLength(1)
    expect(world.clearedStage).toBe(true)
    expect(world.player.position.x).toBeGreaterThan(GRAYBOX_STAGE.exit.x)
  })

  it('never clears the stage while the player stands still', () => {
    const world = createGrayboxWorld()
    const events = play(world, { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false }, 600)

    expect(events.some((event) => event.type === 'stageCleared')).toBe(false)
    expect(world.clearedStage).toBe(false)
  })

  it('keeps the rule layer authoritative: the world advances without any renderer', () => {
    const world = createGrayboxWorld()
    const before = world.steps

    play(world, RUN_RIGHT, 120)

    expect(world.steps).toBe(before + 120)
  })
})
