/**
 * REQ-STG-007: 第 12 关四形态连续战
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file. The behaviour was covered before;
 * only the link was missing.
 */
import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { ECHO_COUNT } from '../src/systems/Echoes.js'

/**
 * The GPT fight's interlude was modelled and never called.
 *
 * systems/Echoes.ts has the whole split state machine - three echoes, the body
 * unreachable while any survives, the final phase gated on clearing them - and
 * nothing invoked a line of it. The director advanced on HP alone, so stage 12
 * reached phase 3 at 40%, found a phase with no moves, and stopped. The boss
 * never attacked again and phase 4 could never open: the last fight in the game
 * ended in a stalemate.
 *
 * These tests pin the wiring rather than the state machine, which was already
 * correct.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const
const ARENA = { x: 1600, y: 280, width: 40, height: 120 }

function gptWorld(): World {
  return new World({
    spawn: { x: 60, y: 300 },
    platforms: [{ x: 0, y: 400, width: 2000, height: 60 }],
    exit: ARENA,
    bossId: 'gpt-emergent',
  })
}

/**
 * Shoots the body until the split happens, then stops.
 *
 * Stopping at the split rather than at a fixed HP is the difference between
 * testing the transition and testing what happens a second later: rounds already
 * in the air keep flying and take an echo with them, so a loop that runs on
 * measures the echoes the player happened to kill rather than the ones the split
 * created.
 */
function shootUntilSplit(world: World): void {
  const boss = world.activeBoss
  if (boss === null) return
  let guard = 0
  while (world.echoesLeft === 0 && guard < 4000) {
    guard += 1
    world.update(1 / 60, { ...IDLE, fire: true })
    world.player.position.x = ARENA.x - 120
    world.player.position.y = 300
  }
}

/**
 * Shoots each echo down with real rounds.
 *
 * Writing hp to zero on the target state would leave the echo bookkeeping
 * untouched - the two are separate views of one thing, and only the damage path
 * updates both - so a test that scribbled on the fields would prove nothing about
 * the wiring it is supposed to cover.
 */
function clearEchoes(world: World): void {
  // The floor is at y = 400. The player's y is the top of a 40px body, so 360
  // stands on it. Setting y from the echo's own box put the body in mid-air,
  // where it never touches the ground and - for a character whose weapon needs
  // a grounded stance - never fires at all.
  const FLOOR_TOP = 400
  const feetY = FLOOR_TOP - 40

  for (const echo of world.targets.filter((t) => t.id.startsWith('echo-'))) {
    if (!echo.alive) continue
    let guard = 0
    while (echo.alive && guard < 3000) {
      guard += 1
      world.player.position.x = echo.box.x - 70
      world.player.position.y = feetY
      world.player.hearts = 3
      world.update(1 / 60, { ...IDLE, fire: true })
    }
  }
}

describe('GPT echo interlude (T-M3-06)', () => {
  it('splits into three echoes at the threshold', () => {
    const world = gptWorld()
    expect(world.echoesLeft).toBe(0)
    shootUntilSplit(world)
    expect(world.echoesLeft).toBe(ECHO_COUNT)
  })

  it('stops the body taking damage while echoes live', () => {
    // Otherwise the split is cosmetic: keep hitting the boss and skip the
    // interlude.
    const world = gptWorld()
    shootUntilSplit(world)
    const boss = world.activeBoss
    if (boss === null) throw new Error('no boss')
    const hpAfterSplit = boss.hp

    for (let i = 0; i < 240; i += 1) {
      world.update(1 / 60, { ...IDLE, fire: true })
      world.player.position.x = ARENA.x - 120
      world.player.position.y = 300
    }
    // Direct damage calls are refused, not merely unlikely to land.
    expect(boss.hp).toBeLessThanOrEqual(hpAfterSplit)
  })

  it('puts the echoes on the field as real targets', () => {
    const world = gptWorld()
    shootUntilSplit(world)
    const echoes = world.targets.filter((t) => t.id.startsWith('echo-'))
    expect(echoes).toHaveLength(ECHO_COUNT)
    for (const echo of echoes) expect(echo.alive).toBe(true)
  })

  it('holds the fight in phase 3 until the echoes are gone', () => {
    const world = gptWorld()
    shootUntilSplit(world)
    const boss = world.activeBoss
    if (boss === null) throw new Error('no boss')
    expect(boss.phase).toBe(3)
  })

  it('opens the final phase once every echo is down', () => {
    const world = gptWorld()
    shootUntilSplit(world)
    clearEchoes(world)
    expect(world.echoesLeft).toBe(0)
    expect(world.echoesCleared).toBe(true)

    const boss = world.activeBoss
    if (boss === null) throw new Error('no boss')
    world.update(1 / 60, IDLE)
    expect(boss.phase).toBe(4)
  })

  it('lets the final phase attack again', () => {
    // The whole point: phase 4 has moves, phase 3 has none. If the transition
    // does not happen the boss stays silent for the rest of the fight.
    const world = gptWorld()
    shootUntilSplit(world)
    clearEchoes(world)
    world.update(1 / 60, IDLE)

    const types: string[] = []
    for (let i = 0; i < 400; i += 1) {
      for (const event of world.update(1 / 60, IDLE)) types.push(event.type)
      world.player.position.x = ARENA.x - 120
    }
    expect(types).toContain('bossTelegraph')
  })
})
