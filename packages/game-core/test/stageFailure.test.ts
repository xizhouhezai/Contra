import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'

/**
 * The rule layer could not say the run was lost.
 *
 * A dead player stopped taking damage and the simulation carried on, so a stage
 * that could no longer be won never ended. REQ-PLY-007 (death returns you to the
 * start) and REQ-VIS-002 (retry within three seconds) both need to know the run is
 * over, and neither could ask.
 *
 * The damage path is exercised through a target standing on the player rather than
 * by calling the private method: contact damage is what actually kills a player in
 * play, and a test that reached past the collision would not notice if it stopped
 * working.
 */
const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

/**
 * A world whose only threat sits where the player will actually be.
 *
 * The player spawns in the air and falls to the floor, so a target placed at the
 * spawn height is only overlapped for a few frames - long enough for one hit and
 * no more, which looks like the failure flag is broken rather than like the test
 * put the enemy in the wrong place. FLOOR_TOP is 400 and a 40px body stands at
 * 360.
 */
const FLOOR_TOP = 400
const STANDING_Y = FLOOR_TOP - 40

function lethalWorld(): World {
  return new World({
    spawn: { x: 200, y: STANDING_Y },
    platforms: [{ x: 0, y: FLOOR_TOP, width: 2000, height: 60 }],
    targets: [{ id: 'brute', x: 190, y: STANDING_Y, width: 40, height: 40, hp: 999, score: 0 }],
    exit: { x: 1900, y: 280, width: 40, height: 120 },
  })
}

/**
 * Runs until the player dies.
 *
 * The budget is generous because applyHit grants invulnerability frames: three
 * hearts cannot be spent in three steps, and a tight loop would return while the
 * player was still alive and make the failure flag look broken.
 */
function runUntilDead(world: World): number {
  let steps = 0
  while (world.player.hearts > 0 && steps < 20000) {
    steps += 1
    world.update(1 / 60, IDLE)
  }
  return steps
}

describe('stage failure (REQ-PLY-007 / REQ-VIS-002)', () => {
  it('starts a run as not failed', () => {
    const world = new World({ spawn: { x: 60, y: 300 } })
    expect(world.failedStage).toBe(false)
  })

  it('marks the run failed when the last heart goes', () => {
    const world = lethalWorld()
    runUntilDead(world)
    expect(world.player.hearts).toBe(0)
    expect(world.failedStage).toBe(true)
  })

  it('does not report failure while hearts remain', () => {
    const world = lethalWorld()
    // One hit only.
    world.update(1 / 60, IDLE)
    if (world.player.hearts > 0) expect(world.failedStage).toBe(false)
  })

  it('does not leak failure into a fresh run', () => {
    // The retry builds a new World; a flag carried across would end the restarted
    // stage on its first step.
    const world = lethalWorld()
    runUntilDead(world)
    expect(world.failedStage).toBe(true)
    expect(lethalWorld().failedStage).toBe(false)
  })

  it('never reports both failed and cleared', () => {
    // A stage cannot be won and lost at once, and the presentation trusts these
    // two to pick a transition.
    const world = lethalWorld()
    runUntilDead(world)
    expect(world.clearedStage).toBe(false)
  })
})
