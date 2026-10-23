import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { BOSS_HIT_HEIGHT, BOSS_HIT_WIDTH } from '../src/stages/BossDirector.js'

/**
 * A boss could wound the player and never be wounded back.
 *
 * damageBossBy was called from inside the loop that walks `targets`, and the
 * three boss stages declare `targets: []`. The loop body therefore never ran on
 * a boss stage, so gunfire, blasts and scoring all skipped the boss entirely -
 * the fight had one direction. Found by the agent that wired the boss portrait,
 * which could draw a boss but not be shot at one.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

const ARENA = { x: 800, y: 280, width: 40, height: 120 }

function bossWorld(): World {
  return new World({
    spawn: { x: 60, y: 300 },
    platforms: [{ x: 0, y: 400, width: 2000, height: 60 }],
    exit: ARENA,
    bossId: 'claude-auditor',
  })
}

/** Puts the player next to the arena and fires; returns the hp the boss lost. */
function shootBoss(world: World, seconds = 6): number {
  const before = world.activeBoss?.hp ?? 0
  const steps = Math.ceil(seconds / (1 / 60))
  for (let i = 0; i < steps; i += 1) {
    world.update(1 / 60, { ...IDLE, fire: true })
    // Keep the player beside the arena; the aim is derived from facing, and the
    // player spawns far to the left of it.
    world.player.position.x = ARENA.x - 40
    world.player.position.y = 300
  }
  return before - (world.activeBoss?.hp ?? 0)
}

describe('boss can be damaged (REQ-CMB-003)', () => {
  it('places a hit area at the arena', () => {
    const world = bossWorld()
    const boss = world.activeBoss
    expect(boss).not.toBeNull()
    if (boss === null) return

    expect(boss.box.width).toBe(BOSS_HIT_WIDTH)
    expect(boss.box.height).toBe(BOSS_HIT_HEIGHT)
    // Anchored to the arena the stage declares, not to the world origin.
    expect(boss.box.x).toBeGreaterThan(0)
    expect(boss.box.x).toBeLessThan(2000)
  })

  it('lets gunfire take hp off the boss', () => {
    const world = bossWorld()
    const lost = shootBoss(world)
    expect(lost).toBeGreaterThan(0)
  })

  it('defeats the boss when enough rounds land', () => {
    // The fight has to be winnable: a boss that cannot drop below its last heart
    // is the same defect one step further along.
    const world = bossWorld()
    shootBoss(world, 60)
    expect(world.activeBoss?.defeated).toBe(true)
  })

  it('reports a hit so the player can see the damage land', () => {
    // Every damage number in this game is read off the hit event. The boss never
    // emitted one, so it looked invulnerable even while its health fell.
    const world = bossWorld()
    const types: string[] = []
    for (let i = 0; i < 240; i += 1) {
      for (const event of world.update(1 / 60, { ...IDLE, fire: true })) types.push(event.type)
      world.player.position.x = ARENA.x - 40
      world.player.position.y = 300
    }
    expect(types).toContain('hit')
  })

  it('does not damage a boss the player never shot', () => {
    const world = bossWorld()
    const before = world.activeBoss?.hp ?? 0
    for (let i = 0; i < 120; i += 1) world.update(1 / 60, IDLE)
    expect(world.activeBoss?.hp).toBe(before)
  })
})
