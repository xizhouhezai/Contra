import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../src/data/constants.js'
import { enemyDefinition } from '../src/data/enemies.js'
import type { PlatformDefinition, Rect } from '../src/data/types.js'
import { createBullet } from '../src/entities/Bullet.js'
import type { TargetDefinition } from '../src/entities/Target.js'
import { createWeaponSlot } from '../src/systems/Arsenal.js'
import {
  armourDamage,
  bulletBox,
  facingFromMotion,
  platformCarry,
  reflectBulletsOffWalls,
  solidPlatforms,
} from '../src/systems/MechanicEffects.js'
import { createTerrainState, platformAt, type TerrainPlatform } from '../src/systems/Terrain.js'
import { input } from './support.js'

/**
 * The eight stage mechanics, as the World applies them.
 *
 * Every helper these mechanics rest on was already written and unit-tested, and
 * nothing called them: a stage could declare bounce walls, a moving plank or a
 * breakable block and the player would never see one of them behave differently.
 * These tests drive the real World, so deleting the wiring - not just the maths -
 * is what makes them fail.
 */

const FLOOR: PlatformDefinition = { x: 0, y: 400, width: 1600, height: 60 }

function run(world: World, steps: number, overrides: Parameters<typeof input>[0] = {}): void {
  for (let step = 0; step < steps; step += 1) world.update(1 / 60, input(overrides))
}

function target(
  id: string,
  x: number,
  y: number,
  extra: Partial<TargetDefinition> = {},
): TargetDefinition {
  return { id, x, y, width: 32, height: 40, hp: 1000, score: 50, ...extra }
}

function onlyTarget(world: World) {
  const found = world.targets[0]
  if (found === undefined) throw new Error('expected one target')
  return found
}

describe('Bounce walls (bounce-wall)', () => {
  const WALL: Rect = { x: 300, y: 100, width: 20, height: 300 }

  function round(x: number, y: number, vx: number, vy: number) {
    return createBullet('b1', 'player', { x, y }, { x: vx, y: vy }, 10, { weaponId: 'pulse' })
  }

  it('turns a round around instead of letting it pass', () => {
    const bullet = round(WALL.x - 4, 200, 400, 0)

    const bounced = reflectBulletsOffWalls([bullet], [WALL])

    expect(bounced).toBe(1)
    expect(bullet.velocity.x).toBeLessThan(0)
  })

  it('leaves the round outside the wall so it cannot reflect again next step', () => {
    const bullet = round(WALL.x - 2, 200, 400, 0)

    reflectBulletsOffWalls([bullet], [WALL])

    // Still overlapping here would flip the velocity back on the following step
    // and the round would shudder in place against the wall.
    expect(bulletBox(bullet).x + 8).toBeLessThanOrEqual(WALL.x)
  })

  it('flies on untouched when the stage authored no walls', () => {
    const bullet = round(0, 200, 400, 0)

    expect(reflectBulletsOffWalls([bullet], [])).toBe(0)
    expect(bullet.velocity.x).toBe(400)
  })

  it('flies on untouched when it misses every wall', () => {
    const bullet = round(0, 200, 400, 0)

    expect(reflectBulletsOffWalls([bullet], [WALL])).toBe(0)
    expect(bullet.velocity.x).toBe(400)
  })

  it('bounces a real shot back to the player who fired it', () => {
    const world = new World({
      spawn: { x: 100, y: 360 },
      platforms: [FLOOR],
      targets: [target('t1', 600, 340)],
      stage: {
        id: 'bounce',
        exit: { x: 1500, y: 240, width: 60, height: 160 },
        bounceWalls: [WALL],
      },
    })

    run(world, 30, { fire: true, moveX: 1 })

    const live = world.bullets.filter((bullet) => bullet.velocity.x < 0)
    expect(live.length).toBeGreaterThan(0)
  })
})

describe('Armoured front (armored-enemy)', () => {
  const armoured = enemyDefinition('armored')
  const enemy: Rect = { x: 500, y: 300, width: 40, height: 44 }

  it('absorbs a shot that arrives at its face', () => {
    const shot: Rect = { x: 600, y: 310, width: 8, height: 8 }

    // Facing right, shot from the right: the armour takes it.
    expect(armourDamage(armoured, shot, enemy, 1, 25, false)).toBe(0)
  })

  it('takes full damage from behind', () => {
    const shot: Rect = { x: 400, y: 310, width: 8, height: 8 }

    expect(armourDamage(armoured, shot, enemy, 1, 25, false)).toBe(25)
  })

  it('takes full damage from a piercing round, whichever side it lands on', () => {
    const shot: Rect = { x: 600, y: 310, width: 8, height: 8 }

    expect(armourDamage(armoured, shot, enemy, 1, 25, true)).toBe(25)
  })

  it('leaves an unarmoured enemy alone from every side', () => {
    const shot: Rect = { x: 600, y: 310, width: 8, height: 8 }

    expect(armourDamage(enemyDefinition('patrol'), shot, enemy, 1, 25, false)).toBe(25)
  })

  it('keeps facing until the body actually travels', () => {
    // Re-aiming at the shooter every step would make the front unhittable by
    // definition, and "get behind it" would be a rule the player could not use.
    expect(facingFromMotion(0, -1)).toBe(-1)
    expect(facingFromMotion(-0.5, 1)).toBe(-1)
    expect(facingFromMotion(0.5, -1)).toBe(1)
  })

  /** A wide floor, so a fight can happen on either side of the enemy. */
  const ARENA: PlatformDefinition = { x: 0, y: 400, width: 2000, height: 60 }
  const ARMOURED = { x: 400, y: 340, width: 40, height: 44 }

  /** Stands the player up, lets the enemy turn, then holds the trigger. */
  function duel(archetype: string, spawnX: number): World {
    const world = new World({
      spawn: { x: spawnX, y: 360 },
      platforms: [ARENA],
      targets: [{ id: 'e1', ...ARMOURED, hp: 1000, score: 50, archetype }],
    })
    run(world, 40)
    return world
  }

  it('shrugs off every shot the player lands on its face', () => {
    // Approaching from the right: the enemy turns to meet the player, so this is
    // the frontal hit the armour is for.
    const world = duel('armored', 700)

    run(world, 80, { fire: true, moveX: -1 })

    expect(onlyTarget(world).hp).toBe(1000)
  })

  it('still takes damage once the player gets behind it', () => {
    const world = duel('armored', 100)

    run(world, 80, { fire: true, moveX: 1 })

    expect(onlyTarget(world).hp).toBeLessThan(1000)
  })

  it('leaves an unarmoured enemy taking damage from either side', () => {
    // The control for the pair above: same fight, same shots, no armour.
    const fromFront = duel('patrol', 700)
    run(fromFront, 80, { fire: true, moveX: -1 })

    const fromBack = duel('patrol', 100)
    run(fromBack, 80, { fire: true, moveX: 1 })

    expect(onlyTarget(fromFront).hp).toBeLessThan(1000)
    expect(onlyTarget(fromBack).hp).toBeLessThan(1000)
  })
})

describe('Moving platforms (moving-platform)', () => {
  const PLANK: TerrainPlatform = {
    x: 0,
    y: 400,
    width: 1600,
    height: 60,
    motion: { axis: 'horizontal', amplitudePx: 20, periodSeconds: 4, phaseSeconds: 0 },
  }

  it('carries a rider that stands on it', () => {
    const world = new World({ spawn: { x: 100, y: 400 - PLAYER_HEIGHT }, platforms: [PLANK] })

    run(world, 60)

    // The plank slides from +20 back to 0 over its first quarter cycle, and the
    // rider goes with it: walking was never involved.
    expect(world.player.position.x).toBeLessThan(100 - 10)
  })

  it('leaves a body in the air where it is', () => {
    const world = new World({ spawn: { x: 100, y: 200 }, platforms: [PLANK] })

    run(world, 5)

    expect(world.player.position.x).toBeCloseTo(100, 6)
  })

  it('reports no carry for a body standing on a still platform', () => {
    const still: TerrainPlatform = { x: 0, y: 400, width: 1600, height: 60 }
    const feet = { x: 100, width: PLAYER_WIDTH, bottom: 400 }

    const delta = platformCarry([still], createTerrainState(), 0, 1 / 60, feet)

    expect(delta).toEqual({ x: 0, y: 0 })
  })

  it('drops a broken plank out of the collision set', () => {
    const breakable: TerrainPlatform = { x: 0, y: 400, width: 400, height: 60, breakableHp: 1 }
    const state = createTerrainState()
    state.destroyed.add('platform-0')

    expect(solidPlatforms([breakable], state, 0)).toHaveLength(0)
  })

  it('returns planks where their motion has moved them', () => {
    const state = createTerrainState()

    const [atZero] = solidPlatforms([PLANK], state, 0)
    const [atHalf] = solidPlatforms([PLANK], state, 2)

    expect(atZero?.x).toBeCloseTo(platformAt(PLANK, 0).x, 6)
    expect(atHalf?.x).not.toBeCloseTo(atZero?.x ?? 0, 1)
  })
})

describe('Breakable terrain (breakable-terrain)', () => {
  it('drops the player through a floor their own blast destroyed', () => {
    const world = new World({
      spawn: { x: 100, y: 400 - PLAYER_HEIGHT },
      platforms: [{ x: 0, y: 400, width: 1200, height: 60, breakableHp: 1 }],
    })
    world.player.weaponSlots = [createWeaponSlot('grenade')]
    world.player.activeSlot = 0

    // The throw has to arc up and come back down before it can land on the floor.
    //
    // The floor is the only surface in this world, so once it breaks the player
    // has nothing left to land on and keeps going until the fall plane catches
    // them, at which point they lose a heart and are put back on the ledge they
    // came from. That is the fix rather than a regression: what this test is
    // about is that the floor really did stop holding them, and the lost heart
    // is what records it. Asserting `y > 400` instead would now pass only in the
    // broken build where the fall had no end.
    run(world, 80, { fire: true, moveY: 1 })

    expect(world.player.hearts).toBeLessThan(3)
  })

  it('keeps holding the player up when nothing is fired', () => {
    const world = new World({
      spawn: { x: 100, y: 400 - PLAYER_HEIGHT },
      platforms: [{ x: 0, y: 400, width: 1200, height: 60, breakableHp: 1 }],
    })

    run(world, 30)

    expect(world.player.position.y).toBeCloseTo(400 - PLAYER_HEIGHT, 6)
  })

  it('never breaks a platform that declares no HP', () => {
    const world = new World({
      spawn: { x: 100, y: 400 - PLAYER_HEIGHT },
      platforms: [FLOOR],
    })
    world.player.weaponSlots = [createWeaponSlot('grenade')]
    world.player.activeSlot = 0

    run(world, 80, { fire: true, moveY: 1 })

    expect(world.player.position.y).toBeCloseTo(400 - PLAYER_HEIGHT, 6)
  })
})

describe('Vertical scroll (vertical-scroll)', () => {
  const EXIT: Rect = { x: 100, y: 400, width: 120, height: 120 }
  /** A ledge whose top is level with the exit's bottom: past it, not inside it. */
  const LEDGE: PlatformDefinition = { x: 0, y: 560, width: 1200, height: 40 }

  function world(scrollMode?: 'horizontal' | 'vertical'): World {
    return new World({
      spawn: { x: 120, y: 560 - PLAYER_HEIGHT },
      platforms: [LEDGE],
      exit: EXIT,
      ...(scrollMode === undefined ? {} : { stage: { id: 's', exit: EXIT, scrollMode } }),
    })
  }

  it('clears on the way down, even though the player never entered the box', () => {
    const vertical = world('vertical')

    run(vertical, 5)

    expect(vertical.clearedStage).toBe(true)
  })

  it('still wants a horizontal stage walked into', () => {
    const horizontal = world()

    run(horizontal, 5)

    expect(horizontal.clearedStage).toBe(false)
  })
})
