import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'

/**
 * A boss stage's door does not open while the boss is standing.
 *
 * REQ-STG-003 says every stage ends with a boss fight, and REQ-PLY-008 says the
 * boss has its own bar and phases. Both were decorative: the arena and the door
 * share a place in the stage data, so a player could walk straight into the exit,
 * clear the stage, and leave the boss at full health.
 *
 * Found by recording a playthrough. The bot was told to fight and instead reached
 * the door, and the video showed a stage completing during a fight that had not
 * happened.
 */
const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const
const ARENA = { x: 1520, y: 280, width: 40, height: 120 }

function bossWorld(): World {
  return new World({
    spawn: { x: 60, y: 360 },
    platforms: [{ x: 0, y: 400, width: 1600, height: 60 }],
    exit: ARENA,
    bossId: 'claude-auditor',
  })
}

/** Walks the player into the door and reports whether the stage cleared. */
function walkIntoDoor(world: World): boolean {
  world.player.position.x = ARENA.x + 10
  world.player.position.y = 360
  for (let i = 0; i < 30; i += 1) {
    world.player.hearts = world.startingHearts
    world.update(1 / 60, { ...IDLE, moveX: 1 })
  }
  return world.clearedStage
}

describe('a boss stage keeps its boss (REQ-STG-003)', () => {
  it('refuses to clear while the boss is alive', () => {
    const world = bossWorld()
    const boss = world.activeBoss
    if (boss === null) throw new Error('no boss')
    expect(boss.defeated).toBe(false)
    expect(walkIntoDoor(world)).toBe(false)
  })

  it('clears once the boss is down', () => {
    const world = bossWorld()
    const boss = world.activeBoss
    if (boss === null) throw new Error('no boss')
    boss.hp = 0
    boss.defeated = true
    expect(walkIntoDoor(world)).toBe(true)
  })

  it('leaves a stage without a boss unaffected', () => {
    // The guard must not become a rule that every stage needs a boss to end.
    const world = new World({
      spawn: { x: 60, y: 360 },
      platforms: [{ x: 0, y: 400, width: 1600, height: 60 }],
      exit: ARENA,
    })
    expect(walkIntoDoor(world)).toBe(true)
  })
})
