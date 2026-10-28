/**
 * REQ-STG-009 / REQ-STG-010 / REQ-VIS-001 for acts II and III.
 *
 * act1Expansion.test.ts proved the recipe on act I. This file holds acts II and
 * III to the same recipe - ten minute stages, beats that are spaced and ordered,
 * a gating mid-stage fight that is not decoration - and adds the two things those
 * acts have that act I does not: a vertical stage, and three boss stages whose
 * waves must not double-lock the exit.
 *
 * The reason both files exist rather than one loop over twelve stages: act I's
 * file is the one that explains the recipe, and it should not grow a section about
 * vertical scrolling. What they share is asserted identically, which is what makes
 * a stage that drifts out of the pattern fail here even if act I stayed right.
 */
import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { ACT_III_STAGES, STAGE_11 } from '../src/data/act3.js'
import { CAMPAIGN_STAGES, STAGE_05, STAGE_06, STAGE_07, STAGE_08 } from '../src/data/campaign.js'
import { MINIBOSS_IDS, minibossDefinition } from '../src/data/minibosses.js'
import type { StageDefinition } from '../src/data/stageTypes.js'
import type { MinibossId } from '../src/data/types.js'

const ACT_TWO: readonly StageDefinition[] = [STAGE_05, STAGE_06, STAGE_07, STAGE_08]
const LATER: readonly StageDefinition[] = [...ACT_TWO, ...ACT_III_STAGES]

describe('acts II and III are ten minute acts (REQ-STG-010)', () => {
  it('gives every later stage the same budget as act I', () => {
    expect(LATER).toHaveLength(8)
    for (const stage of LATER) {
      expect(stage.timeTargetSeconds, stage.id).toBe(600)
    }
  })

  it('makes every horizontal stage long enough, and the vertical one tall enough', () => {
    // 180px/s over 600 seconds is 108000px of running, which is not a stage anyone
    // should author. 12000px is about a tenth of the budget in travel; the rest is
    // fights. Stage 11 swaps the axis, so its length is in heightPx - and it earns
    // that length partly from falling, which is why 9600 is enough there.
    for (const stage of LATER) {
      if (stage.scrollMode === 'vertical') {
        expect(stage.heightPx, stage.id).toBeGreaterThanOrEqual(8000)
        expect(stage.widthPx, stage.id).toBeLessThan(stage.heightPx)
        continue
      }
      expect(stage.widthPx, stage.id).toBeGreaterThanOrEqual(10000)
      expect(stage.widthPx, stage.id).toBeLessThanOrEqual(20000)
    }
  })

  it('stages every later enemy through a wave', () => {
    for (const stage of LATER) {
      expect(stage.targets, `${stage.id} 还有开局直接摆的敌人`).toHaveLength(0)
      expect(stage.waves?.length ?? 0, `${stage.id} 没有波次`).toBeGreaterThanOrEqual(4)
    }
  })

  it('spaces the beats so they cannot all fire in one screen', () => {
    for (const stage of LATER) {
      const waves = stage.waves ?? []
      // Horizontal stages are laid out by x and vertical by y, so the axis under
      // test follows the stage rather than being assumed.
      const axis = stage.scrollMode === 'vertical' ? 'y' : 'x'
      const starts = waves.map((wave) => wave.trigger[axis])
      expect(
        [...starts].sort((a, b) => a - b),
        `${stage.id} 波次未按 ${axis} 排序`,
      ).toEqual(starts)
      for (let i = 1; i < starts.length; i += 1) {
        const gap = (starts[i] ?? 0) - (starts[i - 1] ?? 0)
        expect(gap, `${stage.id} 第 ${i} 与第 ${i + 1} 波挨得太近`).toBeGreaterThan(400)
      }
    }
  })

  it('gives every wave enemy its own lane and a reachable height', () => {
    for (const stage of LATER) {
      for (const wave of stage.waves ?? []) {
        const columns = wave.spawns.map((spawn) => spawn.x)
        expect(new Set(columns).size, `${stage.id}/${wave.id} 有敌人叠在同一像素`).toBe(
          columns.length,
        )
        for (const column of columns) {
          expect(column, `${stage.id}/${wave.id} 有生成点在触发点后方`).toBeGreaterThan(0)
        }
        for (let i = 1; i < columns.length; i += 1) {
          expect((columns[i] ?? 0) - (columns[i - 1] ?? 0)).toBeGreaterThan(40)
        }
        for (const spawn of wave.spawns) {
          expect(
            wave.trigger.y + spawn.y,
            `${stage.id}/${wave.id} 敌人生成在屏幕外`,
          ).toBeGreaterThan(100)
        }
      }
    }
  })

  it('gates some beats in every non-boss stage, and none in a boss stage', () => {
    // A boss stage's door already belongs to the boss. A gating wave in front of
    // it would put two locks on one exit, which is the one place the recipe bends.
    for (const stage of LATER) {
      const waves = stage.waves ?? []
      const gating = waves.filter((wave) => wave.gates).length
      if (stage.bossId !== undefined) {
        expect(gating, `${stage.id} 波次与 Boss 双重锁门`).toBe(0)
        continue
      }
      expect(gating, `${stage.id} 没有必须打的波次`).toBeGreaterThan(0)
      expect(gating, `${stage.id} 每一波都必须打，没有节奏`).toBeLessThan(waves.length)
    }
  })
})

describe('acts II and III mid-stage bosses (REQ-STG-009)', () => {
  it('gives all eight stages one, and the id its art is named for', () => {
    const expected: ReadonlyArray<[StageDefinition, string]> = [
      [STAGE_05, 'miniboss-coolant-overseer'],
      [STAGE_06, 'miniboss-array-warden'],
      [STAGE_07, 'miniboss-forge-master'],
      [STAGE_08, 'miniboss-redline-clerk'],
      [ACT_III_STAGES[0] as StageDefinition, 'miniboss-archive-keeper'],
      [ACT_III_STAGES[1] as StageDefinition, 'miniboss-mirror-lieutenant'],
      [ACT_III_STAGES[2] as StageDefinition, 'miniboss-shaft-gaoler'],
      [ACT_III_STAGES[3] as StageDefinition, 'miniboss-emergence-herald'],
    ]
    for (const [stage, id] of expected) {
      expect(stage.minibosses, `${stage.id} 缺少中段小 Boss`).toHaveLength(1)
      expect(stage.minibosses?.[0]?.minibossId, `${stage.id} 的小 Boss 不对`).toBe(id)
    }
  })

  it('resolves every id, and registers all twelve', () => {
    expect(MINIBOSS_IDS).toHaveLength(12)
    expect(new Set(MINIBOSS_IDS).size).toBe(12)
    for (const id of MINIBOSS_IDS) {
      expect(minibossDefinition(id), `未注册的中段小 Boss: ${id}`).toBeDefined()
    }
    // Every miniboss the campaign places has to be one of the twelve, or a stage
    // names an id nothing can spawn and the fight never starts.
    for (const stage of CAMPAIGN_STAGES) {
      for (const placement of stage.minibosses ?? []) {
        expect(MINIBOSS_IDS, `${stage.id}/${placement.id}`).toContain(placement.minibossId)
      }
    }
  })

  it('makes every later miniboss gating, and places it ahead of its trigger', () => {
    for (const stage of LATER) {
      for (const placement of stage.minibosses ?? []) {
        expect(placement.gates, `${stage.id}/${placement.id}`).toBe(true)
        expect(placement.x).toBeGreaterThan(placement.trigger.x)
        expect(placement.y).toBeGreaterThan(0)
        // Inside the stage along its own axis.
        if (stage.scrollMode === 'vertical') {
          expect(placement.y, `${stage.id}/${placement.id} 站在关卡外`).toBeLessThan(stage.exit.y)
        } else {
          expect(placement.x, `${stage.id}/${placement.id} 站在关卡外`).toBeLessThan(stage.exit.x)
        }
      }
    }
  })

  it('stands every miniboss on a surface the player can reach', () => {
    // The defect this exists for: stage 11's gaoler was anchored 240px below the
    // only ledge in that stretch of the shaft, so it hung in mid-air where a
    // level shot could not reach it and the fight could not be started. The unit
    // tests all passed - the data was well-formed, the trigger fired, the route
    // gated - and only the browser acceptance run found that the body was
    // unreachable.
    //
    // A body's feet (placement.y) must land on top of some platform, give or take
    // its own height, or the player has nowhere to stand and shoot from.
    for (const stage of CAMPAIGN_STAGES) {
      for (const placement of stage.minibosses ?? []) {
        const surfaces = stage.platforms.filter(
          (platform) =>
            Math.abs(platform.y - placement.y) <= 120 &&
            placement.x >= platform.x - 40 &&
            placement.x <= platform.x + platform.width + 40,
        )
        expect(
          surfaces.length,
          `${stage.id}/${placement.id} 悬空：脚下没有可站立的地面`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('never puts a miniboss trigger on top of a wave trigger', () => {
    for (const stage of LATER) {
      for (const placement of stage.minibosses ?? []) {
        for (const wave of stage.waves ?? []) {
          const apartX =
            wave.trigger.x + wave.trigger.width < placement.trigger.x ||
            placement.trigger.x + placement.trigger.width < wave.trigger.x
          const apartY =
            wave.trigger.y + wave.trigger.height < placement.trigger.y ||
            placement.trigger.y + placement.trigger.height < wave.trigger.y
          // Apart on either axis is enough: overlapping in x but not in y is two
          // fights at different heights, which is fine.
          expect(apartX || apartY, `${stage.id}: ${wave.id} 与 ${placement.id} 触发区重叠`).toBe(
            true,
          )
        }
      }
    }
  })

  it('scales the later fights with the act they are in', () => {
    // Act I's minibosses are 240-360 HP. Acts II and III should be harder, or the
    // campaign stops ramping and the last three fights feel like a step down.
    const laterHp = LATER.map((stage) => stage.minibosses?.[0]?.minibossId)
      .filter((id): id is MinibossId => id !== undefined)
      .map((id) => minibossDefinition(id)?.maxHp ?? 0)

    expect(laterHp).toHaveLength(8)
    for (const hp of laterHp) expect(hp).toBeGreaterThanOrEqual(320)
    // The final fight's herald is the high-water mark of the twelve.
    const herald = minibossDefinition('miniboss-emergence-herald')
    expect(herald?.maxHp).toBe(Math.max(...laterHp))
  })

  it('keeps the vertical stage the only one that scrolls down', () => {
    const vertical = CAMPAIGN_STAGES.filter((stage) => stage.scrollMode === 'vertical')
    expect(vertical).toHaveLength(1)
    expect(vertical[0]?.id).toBe('stage-11')
    expect(STAGE_11.exit.y).toBeGreaterThan(9000)
  })
})

describe('the vertical stage is traversable (T-M3-03)', () => {
  it('lets a player fall from the top to the door', () => {
    // The geometry check above is about data; this one is about play. Stage 11 is
    // 900 wide and 9600 tall, and the whole mechanic is that progress runs
    // downward - so the thing to prove is that a body starting at the top can
    // reach the door at the bottom without getting stuck on a ledge.
    //
    // The input is "walk right and jump", which is what a player does in a shaft
    // whose ledges alternate sides: the jump gets over the lip, the fall does the
    // rest. Standing still would land on the first plank and stay there, which is
    // what the first version of this test measured - and a stage that only works
    // if you never stop is not the same claim as a stage you can descend.
    const world = new World({
      spawn: STAGE_11.spawn,
      platforms: STAGE_11.platforms,
      exit: STAGE_11.exit,
      stage: { id: STAGE_11.id, exit: STAGE_11.exit, scrollMode: 'vertical' },
      waves: STAGE_11.waves ?? [],
      minibosses: STAGE_11.minibosses ?? [],
    })

    let lowest = world.player.position.y
    let stepsWithoutProgress = 0
    const MID = 450
    for (let step = 0; step < 60 * 240; step += 1) {
      world.player.hearts = world.startingHearts
      // Hold the open channel, and move right past the one ledge that closes it.
      //
      // The ledges are anchored alternately to the left wall and the right, and
      // neither reaches the middle: the 340-560 channel down the centre clears
      // every one of them. The single exception is the mid-stage fight's ledge,
      // which runs from 0 to 680 so the fight has room - so a player who wants to
      // skip that fight has to move right to get past it, and a player who does
      // not simply stops on it. Steering toward the channel is what a player
      // does; three earlier versions of this test pinned the body against a wall
      // and none of them measured the stage.
      const nearFight = world.player.position.y > 4900 && world.player.position.y < 5700
      const target = nearFight ? 780 : MID
      const dx = target - world.player.position.x
      const moveX = dx > 8 ? 1 : dx < -8 ? -1 : 0
      world.update(1 / 60, { moveX, moveY: 0, jump: false, fire: false, bomb: false })
      const y = world.player.position.y
      if (y > lowest + 1) {
        lowest = y
        stepsWithoutProgress = 0
      } else {
        stepsWithoutProgress += 1
      }
      // A body that stops descending for eight seconds has landed somewhere it
      // cannot get off; that is a stuck stage, not a slow one.
      if (stepsWithoutProgress > 60 * 8) break
    }

    expect(lowest, '玩家没能下降到井底').toBeGreaterThan(9000)
  })

  it('never builds a ledge that spans the whole shaft', () => {
    // The defect this exists for: a 900px plank across a 900px shaft is not a
    // ledge, it is a floor. A player who lands on it cannot get above it again -
    // the jump apex is 70px against the 280px between ledges - so the stage is
    // uncompletable and looks completely fine in a level editor. The simulated
    // descent below is what found it; this assertion is what keeps it found.
    //
    // The bottom floor is the one exception, and it is not an exception in the
    // rule: there is nothing below it to be blocked from.
    const ledges = STAGE_11.platforms.filter((platform) => platform.y < STAGE_11.exit.y)
    expect(ledges.length).toBeGreaterThan(20)
    for (const ledge of ledges) {
      expect(ledge.width, `y=${ledge.y} 的横台横跨整个井道，玩家会被困住`).toBeLessThan(
        STAGE_11.widthPx,
      )
    }
  })

  it('keeps the shaft narrow and the ledges within reach of its walls', () => {
    // A vertical stage whose ledges stick out past its width is a stage the
    // camera cannot frame. Cheap assertion, but it is the one that catches a
    // copy-pasted horizontal layout.
    for (const platform of STAGE_11.platforms) {
      expect(platform.x).toBeGreaterThanOrEqual(0)
      expect(platform.x + platform.width).toBeLessThanOrEqual(STAGE_11.widthPx)
    }
  })
})

describe('the campaign as a whole (REQ-VIS-001)', () => {
  it('places a mid-stage fight in all twelve stages', () => {
    expect(CAMPAIGN_STAGES).toHaveLength(12)
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.minibosses?.length ?? 0, `${stage.id}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('holds three boss stages, one per act', () => {
    const bossStages = CAMPAIGN_STAGES.filter((stage) => stage.bossId !== undefined)
    expect(bossStages).toHaveLength(3)
    expect(bossStages.map((stage) => stage.act)).toEqual([1, 2, 3])
  })

  it('sums to the requirement band', () => {
    const total = CAMPAIGN_STAGES.reduce((sum, stage) => sum + stage.timeTargetSeconds, 0)
    expect(total).toBeGreaterThanOrEqual(100 * 60)
    expect(total).toBeLessThanOrEqual(120 * 60)
  })
})
