import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { STAGE_01, STAGE_01_WAVES } from '../src/data/campaign.js'

/**
 * Stage 1 as the expansion rebuilds it: five beats, enemies arriving by wave, and
 * a door that does not open while a gating wave is unfinished.
 *
 * The old stage was a single 2400px corridor with three enemies standing in the
 * open. Measured on a recording, a player holding right cleared it in fifteen
 * seconds - the enemies never had to be fought, only walked past. These tests hold
 * the replacement to a different standard: the length has to come from fights that
 * finish, not from a longer walk.
 */
const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

function stageWorld(): World {
  return new World({
    spawn: STAGE_01.spawn,
    platforms: STAGE_01.platforms,
    targets: STAGE_01.targets,
    // Spread rather than pass: exactOptionalPropertyTypes rejects an explicit
    // undefined, and a stage without waves is a real case rather than a mistake.
    ...(STAGE_01.waves === undefined ? {} : { waves: STAGE_01.waves }),
    exit: STAGE_01.exit,
    act: 1,
  })
}

/** Runs steps with the player pinned at one x, reviving so death cannot stop the run. */
function runAt(world: World, x: number, steps: number): void {
  for (let i = 0; i < steps; i += 1) {
    world.player.position.x = x
    world.player.hearts = world.startingHearts
    world.update(1 / 60, IDLE)
  }
}

describe('stage 1 waves (stage-expansion-plan §4.3)', () => {
  it('starts with no enemies on the field', () => {
    // Everything arrives through a wave. An enemy placed up front is one the
    // player can outrun before its wave is due.
    const world = stageWorld()
    expect(world.targets).toHaveLength(0)
    expect(STAGE_01.waves?.length).toBe(5)
  })

  it('brings the first enemy in once the player advances', () => {
    const world = stageWorld()
    runAt(world, 500, 30)
    expect(world.targets.length).toBeGreaterThan(0)
  })

  it('does not fire a wave the player never reaches', () => {
    const world = stageWorld()
    runAt(world, 100, 60)
    expect(world.targets).toHaveLength(0)
  })

  it('holds the door while a gating wave is unfinished', () => {
    const world = stageWorld()
    // Walk to the second beat's trigger, which gates, then teleport to the exit.
    runAt(world, 1300, 30)
    expect(world.routeOpen).toBe(false)

    runAt(world, STAGE_01.exit.x + 10, 30)
    expect(world.clearedStage).toBe(false)
  })

  it('opens the door once every gating wave is cleared', () => {
    const world = stageWorld()
    for (const wave of STAGE_01_WAVES) {
      if (!wave.gates) continue
      // Long enough for the wave's own delays: a spawn held for two seconds has
      // not been placed yet, and a wave cannot be cleared before it has started.
      runAt(world, wave.trigger.x + 10, 200)
      // Clear it the way a player would: every enemy this wave placed dies.
      for (const target of world.targets) {
        if (wave.spawns.some((s) => s.target.id === target.id)) {
          target.alive = false
          target.hp = 0
        }
      }
      world.update(1 / 60, IDLE)
    }
    expect(world.routeOpen).toBe(true)

    runAt(world, STAGE_01.exit.x + 10, 30)
    expect(world.clearedStage).toBe(true)
  })

  it('is longer than the corridor it replaced', () => {
    // 2400px was fifteen seconds of holding right. The replacement has to be a
    // different order of magnitude or the whole exercise was cosmetic.
    expect(STAGE_01.widthPx).toBeGreaterThan(9000)
    expect(STAGE_01.timeTargetSeconds).toBeGreaterThanOrEqual(600)
  })

  it('stages its beats instead of stacking them', () => {
    // Triggers must be ordered and spread; overlapping triggers would fire every
    // wave at once and the stage would empty in one screen again.
    const starts = STAGE_01_WAVES.map((wave) => wave.trigger.x)
    expect([...starts].sort((a, b) => a - b)).toEqual(starts)
    for (let i = 1; i < starts.length; i += 1) {
      const gap = (starts[i] ?? 0) - (starts[i - 1] ?? 0)
      expect(gap).toBeGreaterThan(400)
    }
  })

  it('gives every enemy in a wave its own ground', () => {
    // Every spawn used to default to x: 0, so a wave of three placed all three on
    // the same pixel: one visible enemy that took three times the damage and read
    // as a single target that would not die.
    for (const wave of STAGE_01_WAVES) {
      const columns = wave.spawns.map((spawn) => spawn.x)
      expect(new Set(columns).size).toBe(columns.length)
      // A spawn behind the trigger is an enemy the run has already passed. On a
      // gating wave that is a wall the player cannot see, because the door only
      // opens once the whole group is dead.
      for (const column of columns) {
        expect(column).toBeGreaterThan(0)
      }
    }
  })

  it('puts every wave enemy on the floor, not at the trigger origin', () => {
    // A zero y offset spawns at y=0, above the screen: the player's level shots
    // pass underneath and the enemy can never be killed, so a gating wave never
    // clears.
    for (const wave of STAGE_01_WAVES) {
      for (const spawn of wave.spawns) {
        expect(wave.trigger.y + spawn.y).toBeGreaterThan(300)
      }
    }
  })

  it("spawns a wave's enemies far enough apart to be separate targets", () => {
    // Two enemies within a body width of each other overlap on screen and read as
    // one, which is the same defect as placing them on the same pixel.
    for (const wave of STAGE_01_WAVES) {
      const columns = wave.spawns.map((spawn) => spawn.x).sort((a, b) => a - b)
      for (let i = 1; i < columns.length; i += 1) {
        expect((columns[i] ?? 0) - (columns[i - 1] ?? 0)).toBeGreaterThan(40)
      }
    }
  })
})
