/**
 * REQ-STG-009: 中段小 Boss
 * REQ-STG-010: 敌人按波次登场
 *
 * Act I as the expansion rebuilds it: every stage in the act is a ten minute
 * stage now, which means every one of them needs a middle. Stage 1 was the
 * vertical slice and has its own file; this one holds the three stages that
 * followed it, plus the two invariants that apply to all four.
 *
 * The point of these tests is not that the data is non-empty. It is that a stage
 * cannot be called "ten minutes" while being a corridor: the length has to come
 * from fights that have to be finished, and the fights have to be fights - spaced
 * apart, placed ahead of the player, and able to be hit.
 */
import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { CAMPAIGN_STAGES, STAGE_01, STAGE_02, STAGE_03, STAGE_04 } from '../src/data/campaign.js'
import { MINIBOSS_IDS, MINIBOSSES, minibossDefinition } from '../src/data/minibosses.js'
import type { StageDefinition } from '../src/data/stageTypes.js'

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

const ACT_ONE: readonly StageDefinition[] = [STAGE_01, STAGE_02, STAGE_03, STAGE_04]

function stageWorld(stage: StageDefinition): World {
  return new World({
    spawn: stage.spawn,
    platforms: stage.platforms,
    targets: stage.targets,
    exit: stage.exit,
    act: stage.act,
    stage: {
      id: stage.id,
      exit: stage.exit,
      bounceWalls: stage.bounceWalls,
      ...(stage.scrollMode === undefined ? {} : { scrollMode: stage.scrollMode }),
    },
    ...(stage.waves === undefined ? {} : { waves: stage.waves }),
    ...(stage.minibosses === undefined ? {} : { minibosses: stage.minibosses }),
    ...(stage.bossId === undefined ? {} : { bossId: stage.bossId }),
  })
}

/**
 * Runs steps with the player pinned at one x and revived every step.
 *
 * Pinning rather than walking is what makes a wave test about the wave: a bot
 * that holds right outruns every trigger it passes, so "the wave fired" would be
 * confounded with "the bot got there".
 */
function runAt(world: World, x: number, steps: number): void {
  for (let i = 0; i < steps; i += 1) {
    world.player.position.x = x
    world.player.hearts = world.startingHearts
    world.update(1 / 60, IDLE)
  }
}

describe('act I is a ten minute act (REQ-STG-010)', () => {
  it('gives all four act I stages the same budget', () => {
    for (const stage of ACT_ONE) {
      expect(stage.timeTargetSeconds, stage.id).toBe(600)
    }
  })

  it('makes every act I stage long enough to hold that budget', () => {
    // A ten minute stage at 180px/s is 108000px of pure running, which is not a
    // stage anyone should author. The length therefore comes from fights, and the
    // map still has to be big enough that the fights are not stacked on screen -
    // 12000px is about 66 seconds of running, so roughly a tenth of the budget.
    for (const stage of ACT_ONE) {
      expect(stage.widthPx, stage.id).toBeGreaterThanOrEqual(10000)
      expect(stage.widthPx, stage.id).toBeLessThanOrEqual(20000)
    }
  })

  it('stages every act I enemy through a wave', () => {
    // An enemy placed on frame one is one the player can outrun before its beat
    // is due, which is the fifteen-second-stage problem all over again.
    for (const stage of ACT_ONE) {
      expect(stage.targets, `${stage.id} 还有开局直接摆的敌人`).toHaveLength(0)
      expect(stage.waves?.length ?? 0, `${stage.id} 没有波次`).toBeGreaterThanOrEqual(4)
    }
  })

  it('spaces the beats so they cannot all fire in one screen', () => {
    for (const stage of ACT_ONE) {
      const starts = (stage.waves ?? []).map((wave) => wave.trigger.x)
      expect(
        [...starts].sort((a, b) => a - b),
        `${stage.id} 波次未按 x 排序`,
      ).toEqual(starts)
      for (let i = 1; i < starts.length; i += 1) {
        const gap = (starts[i] ?? 0) - (starts[i - 1] ?? 0)
        expect(gap, `${stage.id} 第 ${i} 与第 ${i + 1} 波挨得太近`).toBeGreaterThan(400)
      }
    }
  })

  it('gives every wave enemy its own column on the floor', () => {
    for (const stage of ACT_ONE) {
      for (const wave of stage.waves ?? []) {
        const columns = wave.spawns.map((spawn) => spawn.x)
        expect(new Set(columns).size, `${stage.id}/${wave.id} 有敌人叠在同一像素`).toBe(
          columns.length,
        )
        for (const column of columns) {
          // Behind the trigger is an enemy the run has already passed. On a
          // gating wave that is a wall the player cannot see.
          expect(column, `${stage.id}/${wave.id} 有生成点在触发点后方`).toBeGreaterThan(0)
        }
        for (let i = 1; i < columns.length; i += 1) {
          expect((columns[i] ?? 0) - (columns[i - 1] ?? 0)).toBeGreaterThan(40)
        }
      }
    }
  })

  it('keeps every wave enemy reachable rather than above the screen', () => {
    for (const stage of ACT_ONE) {
      for (const wave of stage.waves ?? []) {
        for (const spawn of wave.spawns) {
          expect(
            wave.trigger.y + spawn.y,
            `${stage.id}/${wave.id} 敌人生成在屏幕外`,
          ).toBeGreaterThan(100)
        }
      }
    }
  })

  it('gates at least one beat but not all of them', () => {
    // A stage where every fight is mandatory has no rhythm; one where none are is
    // a corridor.
    //
    // A boss stage is the exception and the reason is structural: its door is
    // already held by the boss, so a gating wave in front of it would put two
    // locks on one exit. What a boss stage needs instead is an approach, and the
    // gating there is the miniboss - which is asserted separately below.
    for (const stage of ACT_ONE) {
      const waves = stage.waves ?? []
      if (stage.bossId !== undefined) {
        expect(
          waves.every((wave) => !wave.gates),
          `${stage.id} 波次与 Boss 双重锁门`,
        ).toBe(true)
        continue
      }
      const gating = waves.filter((wave) => wave.gates).length
      expect(gating, `${stage.id} 没有必须打的波次`).toBeGreaterThan(0)
      expect(gating, `${stage.id} 每一波都必须打，没有节奏`).toBeLessThan(waves.length)
    }
  })
})

describe('act I mid-stage bosses (REQ-STG-009)', () => {
  it('gives every act I stage one, and stages 2-4 the id their art is named for', () => {
    const expectId = (stage: StageDefinition, id: string): void => {
      expect(stage.minibosses, `${stage.id} 缺少中段小 Boss`).toHaveLength(1)
      expect(stage.minibosses?.[0]?.minibossId, `${stage.id} 的小 Boss 不对`).toBe(id)
    }

    expectId(STAGE_01, 'miniboss-dock-foreman')
    expectId(STAGE_02, 'miniboss-pipe-warden')
    expectId(STAGE_03, 'miniboss-scaffold-crane')
    expectId(STAGE_04, 'miniboss-audit-clerk')
  })

  it('resolves every miniboss id a stage names', () => {
    // An id nothing can resolve is a fight that never starts, and it fails
    // silently: the placement is inert and the stage plays as if it had none.
    const named = ACT_ONE.flatMap((stage) => stage.minibosses ?? []).map((row) => row.minibossId)
    expect(named.length).toBeGreaterThan(0)
    for (const id of named) {
      expect(minibossDefinition(id), `未注册的中段小 Boss: ${id}`).toBeDefined()
    }
    // The registry holds the whole campaign's roster, not just this act's, so the
    // count is asserted against MINIBOSS_IDS rather than a literal. Acts II and
    // III add eight more; this file only cares that act I's four are among them.
    expect(Object.keys(MINIBOSSES)).toHaveLength(MINIBOSS_IDS.length)
    for (const id of MINIBOSS_IDS) expect(minibossDefinition(id)).toBeDefined()
  })

  it('makes every miniboss gating, because a fight that can be walked around is decoration', () => {
    for (const stage of ACT_ONE) {
      for (const placement of stage.minibosses ?? []) {
        expect(placement.gates, `${stage.id}/${placement.id}`).toBe(true)
      }
    }
  })

  it('places the fight inside the stage and ahead of its trigger', () => {
    for (const stage of ACT_ONE) {
      for (const placement of stage.minibosses ?? []) {
        expect(placement.x, `${stage.id}/${placement.id} 站在关卡外`).toBeGreaterThan(0)
        expect(placement.x).toBeLessThan(stage.exit.x)
        // A body behind the trigger is one the run has already walked past, and a
        // gating fight in that position is a wall the player cannot reach.
        expect(placement.x).toBeGreaterThan(placement.trigger.x)
        expect(placement.y).toBeGreaterThan(0)
      }
    }
  })

  it('starts the fight only when the player reaches the trigger', () => {
    const world = stageWorld(STAGE_02)
    const placement = STAGE_02.minibosses?.[0]
    if (placement === undefined) throw new Error('stage 2 has no miniboss')

    // Far from it: nothing on the field and the route is still shut, because the
    // fight has not been met yet.
    runAt(world, 200, 30)
    expect(world.runningMiniboss).toBeNull()
    expect(world.minibossRouteOpen).toBe(false)

    runAt(world, placement.trigger.x + 10, 10)
    expect(world.runningMiniboss).not.toBeNull()
    expect(world.runningMiniboss?.bossId).toBe('miniboss-pipe-warden')
  })

  it('keeps the door shut until the fight is finished', () => {
    const world = stageWorld(STAGE_02)
    const placement = STAGE_02.minibosses?.[0]
    if (placement === undefined) throw new Error('stage 2 has no miniboss')

    runAt(world, placement.trigger.x + 10, 10)
    expect(world.minibossRouteOpen).toBe(false)

    // Walk to the door without fighting, reviving so death cannot end the run.
    runAt(world, STAGE_02.exit.x + 10, 30)
    expect(world.clearedStage).toBe(false)
  })

  it('opens the route once the fight is down', () => {
    const world = stageWorld(STAGE_02)
    const placement = STAGE_02.minibosses?.[0]
    if (placement === undefined) throw new Error('stage 2 has no miniboss')

    runAt(world, placement.trigger.x + 10, 10)
    expect(world.runningMiniboss).not.toBeNull()

    // Drain it through the ship's own damage path rather than by setting a flag:
    // the question these tests exist for is whether a bullet that reaches the
    // body can end the fight, and setting defeated: true would answer a different
    // one.
    const before = world.minibossRouteOpen
    const body = world.activeMiniboss
    expect(body).not.toBeNull()

    // Stand where the fight is and hold the trigger down.
    for (let i = 0; i < 4000 && world.runningMiniboss !== null; i += 1) {
      const active = world.activeMiniboss
      if (active === null) break
      world.player.position.x = active.box.x - 120
      world.player.position.y = active.box.y + active.box.height - 40
      world.player.hearts = world.startingHearts
      world.update(1 / 60, { ...IDLE, fire: true })
    }

    expect(before).toBe(false)
    expect(world.runningMiniboss).toBeNull()
    expect(world.minibossRouteOpen).toBe(true)
  })

  it('is not finished by walking away from it', () => {
    const world = stageWorld(STAGE_02)
    const placement = STAGE_02.minibosses?.[0]
    if (placement === undefined) throw new Error('stage 2 has no miniboss')

    runAt(world, placement.trigger.x + 10, 10)
    // Thirty seconds of standing somewhere else. A fight that ended on distance
    // would let a player skip it by retreating, which is the same bug as a door
    // that opens without the boss being dead.
    runAt(world, placement.trigger.x - 800, 1800)

    expect(world.runningMiniboss).not.toBeNull()
    expect(world.minibossRouteOpen).toBe(false)
  })

  it('gives every miniboss two phases and a real telegraph on each move', () => {
    // REQ-CMB-002: an attack with no visible warning is not difficulty, it is
    // unfairness. The same rule has to hold for a mid-stage fight.
    for (const definition of Object.values(MINIBOSSES)) {
      expect(definition.phases.length, definition.id).toBeGreaterThanOrEqual(2)
      expect(definition.maxHp, definition.id).toBeGreaterThan(0)
      for (const phase of definition.phases) {
        expect(phase.moves.length, definition.id).toBeGreaterThan(0)
        for (const move of phase.moves) {
          expect(move.telegraphSeconds, `${definition.id}/${move.id} 没有预警`).toBeGreaterThan(0)
          expect(move.cooldownSeconds, `${definition.id}/${move.id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('makes the second phase harder rather than longer', () => {
    // A miniboss whose phase 2 is the same fight for another hundred HP is a
    // health bar, not a fight.
    for (const definition of Object.values(MINIBOSSES)) {
      const [first, second] = definition.phases
      if (first === undefined || second === undefined) continue
      expect(second.hpThreshold, definition.id).toBeLessThan(first.hpThreshold)
      expect(second.speedMultiplier, definition.id).toBeGreaterThan(first.speedMultiplier)
    }
  })

  it('keeps a miniboss well under a stage boss', () => {
    // The budget is what makes it a *mini*boss: a mid-stage fight that takes as
    // long as the act boss leaves the stage with two climaxes and no ending.
    for (const definition of Object.values(MINIBOSSES)) {
      expect(definition.maxHp, definition.id).toBeLessThan(600)
    }
  })
})

describe('the act I beats do not overlap', () => {
  it('never puts a miniboss trigger on top of a wave trigger', () => {
    // Two fights starting on the same frame would be two bosses winding up at
    // once, which is a coin flip rather than a fight.
    for (const stage of ACT_ONE) {
      for (const placement of stage.minibosses ?? []) {
        for (const wave of stage.waves ?? []) {
          const apart =
            wave.trigger.x + wave.trigger.width < placement.trigger.x ||
            placement.trigger.x + placement.trigger.width < wave.trigger.x
          expect(apart, `${stage.id}: ${wave.id} 与 ${placement.id} 触发区重叠`).toBe(true)
        }
      }
    }
  })

  it('keeps the campaign catalogue in stage order after the rewrite', () => {
    expect(CAMPAIGN_STAGES.map((stage) => stage.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
    expect(CAMPAIGN_STAGES.filter((stage) => stage.act === 1)).toHaveLength(4)
  })
})
