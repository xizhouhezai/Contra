import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../src/data/constants.js'
import { enemyDefinition } from '../src/data/enemies.js'
import type { PlatformDefinition } from '../src/data/types.js'
import { createTarget } from '../src/entities/Target.js'
import {
  CHARGER_CHARGE_BOOST,
  CHARGER_SIGHT_PX,
  FLYER_CLIMB_RATIO,
  FLYER_HOVER_PX,
  MELEE_RANGE_PX,
  motionBounds,
  motionDefinition,
  stepMotion,
} from '../src/systems/EnemyBehaviour.js'

/**
 * Enemies that never moved.
 *
 * systems/EnemyBehaviour.ts implemented chase, flight and armour, and nothing
 * called it: an enemy was a box that could shoot and could be walked into, but
 * it never came for the player. These tests pin the world's motion step and the
 * four rules it must not break - approach the player, respect platforms, stay in
 * the level, and never invent a damage channel of its own.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

const FLOOR: PlatformDefinition = { x: 0, y: 400, width: 1600, height: 60 }

/** A one-target world over the given floor set, with the player standing still. */
function world(options: {
  archetype?: string
  targetX?: number
  targetY?: number
  targetWidth?: number
  targetHeight?: number
  spawnX?: number
  spawnY?: number
  platforms?: readonly PlatformDefinition[]
}): World {
  return new World({
    spawn: { x: options.spawnX ?? 100, y: options.spawnY ?? 300 },
    platforms: options.platforms ?? [FLOOR],
    targets: [
      {
        id: 'e1',
        x: options.targetX ?? 400,
        y: options.targetY ?? 360,
        width: options.targetWidth ?? 32,
        height: options.targetHeight ?? 40,
        hp: 1000,
        score: 50,
        ...(options.archetype === undefined ? {} : { archetype: options.archetype }),
      },
    ],
  })
}

function run(w: World, steps: number): void {
  for (let step = 0; step < steps; step += 1) w.update(1 / 60, IDLE)
}

/** Player centre, which is what the motion steps aim at. */
function playerCentre(w: World): { x: number; y: number } {
  return {
    x: w.player.position.x + PLAYER_WIDTH / 2,
    y: w.player.position.y + PLAYER_HEIGHT / 2,
  }
}

function onlyTarget(w: World) {
  const target = w.targets[0]
  if (target === undefined) throw new Error('expected one target')
  return target
}

describe('charger motion (T-M1-05 / T-M2-04)', () => {
  it('closes the distance to the player', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const target = onlyTarget(w)
    const before = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))

    run(w, 60)

    const after = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))
    expect(after).toBeLessThan(before)
  })

  it('moves at its charge speed, not its walk speed', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const target = onlyTarget(w)
    const startX = target.box.x

    run(w, 30)

    // 0.5s at 180px/s x 1.6. The gap is 304px, so nothing caps the travel yet.
    const expected = enemyDefinition('charger').speed * CHARGER_CHARGE_BOOST * 0.5
    expect(startX - target.box.x).toBeCloseTo(expected, 6)
  })

  it('stops on contact instead of walking through the player', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const target = onlyTarget(w)

    run(w, 300)

    // It presses until the boxes overlap and then holds: driving its centre onto
    // the player would just look like a teleport past them.
    const gap = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))
    expect(gap).toBeLessThanOrEqual(MELEE_RANGE_PX + 0.001)
    expect(gap).toBeGreaterThan(0)
  })

  it('hurts the player through the existing contact rule and no new channel', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const events: string[] = []
    for (let step = 0; step < 300; step += 1) {
      for (const event of w.update(1 / 60, IDLE)) events.push(event.type)
    }

    expect(w.player.hearts).toBeLessThan(3)
    // The charge is a contact attack: it reports playerHurt, exactly the event a
    // stationary hazard already produced. No enemy-contact damage type exists.
    expect(events).toContain('playerHurt')
  })

  it('stands still while the player is out of sight', () => {
    const w = world({ archetype: 'charger', targetX: 1500 })
    const target = onlyTarget(w)
    const startX = target.box.x

    run(w, 120)

    const gap = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))
    expect(gap).toBeGreaterThan(CHARGER_SIGHT_PX)
    expect(target.box.x).toBe(startX)
  })
})

describe('flyer motion (T-M1-05 / T-M2-05)', () => {
  it('flies toward the player horizontally', () => {
    const w = world({
      archetype: 'flyer',
      targetX: 900,
      targetY: 120,
      targetWidth: 30,
      targetHeight: 26,
    })
    const target = onlyTarget(w)
    const before = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))

    run(w, 60)

    const after = Math.abs(playerCentre(w).x - (target.box.x + target.box.width / 2))
    expect(after).toBeLessThan(before)
  })

  it('settles on the hover line above the player rather than onto them', () => {
    const w = world({
      archetype: 'flyer',
      targetX: 900,
      targetY: 120,
      targetWidth: 30,
      targetHeight: 26,
    })
    const target = onlyTarget(w)

    run(w, 600)

    const centreY = target.box.y + target.box.height / 2
    expect(centreY).toBeCloseTo(playerCentre(w).y - FLYER_HOVER_PX, 0)
    // Still above the player's own box, so a level shot keeps missing it.
    expect(centreY).toBeLessThan(w.player.position.y)
  })

  it('climbs slower than it strafes', () => {
    const w = world({
      archetype: 'flyer',
      targetX: 900,
      targetY: 120,
      targetWidth: 30,
      targetHeight: 26,
    })
    const target = onlyTarget(w)
    const startX = target.box.x
    const startY = target.box.y

    run(w, 30)

    const dx = Math.abs(startX - target.box.x)
    const dy = Math.abs(startY - target.box.y)
    const speed = enemyDefinition('flyer').speed
    expect(dx).toBeCloseTo(speed * 0.5, 6)
    expect(dy).toBeCloseTo(speed * FLYER_CLIMB_RATIO * 0.5, 6)
  })

  it('flies through a platform standing in its path', () => {
    const wall: PlatformDefinition = { x: 500, y: 200, width: 40, height: 200 }
    const w = world({
      archetype: 'flyer',
      targetX: 900,
      targetY: 260,
      targetWidth: 30,
      targetHeight: 26,
      spawnX: 100,
      platforms: [FLOOR, wall],
    })
    const target = onlyTarget(w)

    run(w, 300)

    // Flight ignores platforms: that is the mechanic the archetype exists for.
    expect(target.box.x + target.box.width / 2).toBeLessThan(wall.x)
  })
})

describe('enemy platform collision (T-M1-05)', () => {
  it('stops a charger flush against a wall face', () => {
    const wall: PlatformDefinition = { x: 300, y: 300, width: 40, height: 100 }
    const w = world({
      archetype: 'charger',
      targetX: 500,
      spawnX: 200,
      platforms: [FLOOR, wall],
    })
    const target = onlyTarget(w)

    run(w, 600)

    // The wall spans the charger's whole height, so the sweep has to end at the
    // right face: 300 + 40.
    expect(target.box.x).toBeCloseTo(wall.x + wall.width, 6)
  })

  it('never lets a charger end a step inside a platform', () => {
    const wall: PlatformDefinition = { x: 300, y: 300, width: 40, height: 100 }
    const w = world({
      archetype: 'charger',
      targetX: 500,
      spawnX: 200,
      platforms: [FLOOR, wall],
    })
    const target = onlyTarget(w)

    for (let step = 0; step < 600; step += 1) {
      w.update(1 / 60, IDLE)
      const inside =
        target.box.x < wall.x + wall.width &&
        target.box.x + target.box.width > wall.x &&
        target.box.y < wall.y + wall.height &&
        target.box.y + target.box.height > wall.y
      expect(inside).toBe(false)
    }
  })

  it('leaves a turret exactly where the stage put it', () => {
    const w = world({ archetype: 'turret', targetX: 300 })
    const target = onlyTarget(w)

    run(w, 600)

    expect(target.box.x).toBe(300)
    expect(target.box.y).toBe(360)
  })

  it('leaves a target with no archetype exactly where the stage put it', () => {
    const w = world({ targetX: 300 })
    const target = onlyTarget(w)

    run(w, 600)

    expect(target.box.x).toBe(300)
    expect(target.box.y).toBe(360)
  })
})

describe('enemy level bounds (T-M1-05)', () => {
  it('derives the playable rect from the platforms', () => {
    const bounds = motionBounds([FLOOR])
    expect(bounds).not.toBeNull()
    expect(bounds?.minX).toBe(0)
    expect(bounds?.maxX).toBe(1600)
    expect(bounds?.maxY).toBe(FLOOR.y + FLOOR.height)
  })

  it('reports no bounds when a world has no platform geometry', () => {
    expect(motionBounds([])).toBeNull()
  })

  it('keeps a flyer inside the level edges', () => {
    const w = world({
      archetype: 'flyer',
      targetX: 200,
      targetY: 200,
      targetWidth: 30,
      targetHeight: 26,
      spawnX: 1560,
    })
    const target = onlyTarget(w)
    const rightEdge = FLOOR.x + FLOOR.width

    let furthest = Number.NEGATIVE_INFINITY
    for (let step = 0; step < 1200; step += 1) {
      w.update(1 / 60, IDLE)
      furthest = Math.max(furthest, target.box.x + target.box.width)
    }

    // The player is pinned against the right wall, so an unclamped flyer would
    // chase the target point straight through it.
    expect(furthest).toBeLessThanOrEqual(rightEdge + 0.001)
  })

  it('keeps a charger inside the level edges', () => {
    const narrow: PlatformDefinition = { x: 100, y: 400, width: 700, height: 60 }
    const w = world({
      archetype: 'charger',
      targetX: 780,
      spawnX: 300,
      platforms: [narrow],
      targetWidth: 26,
      targetHeight: 34,
    })
    const target = onlyTarget(w)
    const rightEdge = narrow.x + narrow.width

    let furthest = Number.NEGATIVE_INFINITY
    for (let step = 0; step < 1200; step += 1) {
      w.update(1 / 60, IDLE)
      furthest = Math.max(furthest, target.box.x + target.box.width)
    }

    expect(furthest).toBeLessThanOrEqual(rightEdge + 0.001)
  })

  it('lifts nothing out of the level on the vertical axis', () => {
    // There is no derived ceiling: stage 6 hovers its flyers 140px above the only
    // floor the level has, so a ceiling taken from platform tops would bury them.
    const w = world({
      archetype: 'flyer',
      targetX: 900,
      targetY: 40,
      targetWidth: 30,
      targetHeight: 26,
    })
    const target = onlyTarget(w)
    const startY = target.box.y

    run(w, 60)

    expect(target.box.y).toBeGreaterThanOrEqual(0)
    expect(startY).toBeGreaterThanOrEqual(0)
  })
})

describe('motion step contract', () => {
  it('moves the box in place so every holder sees the new position', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const target = onlyTarget(w)
    const box = target.box
    const startX = box.x

    run(w, 30)

    // The renderer, collision and homing all hold this reference; rebuilding the
    // box each step would strand every one of them on the spawn position.
    expect(target.box).toBe(box)
    expect(box.x).toBeLessThan(startX)
  })

  it('keeps the box size fixed', () => {
    const w = world({ archetype: 'charger', targetX: 400 })
    const target = onlyTarget(w)

    run(w, 60)

    expect(target.box.width).toBe(32)
    expect(target.box.height).toBe(40)
  })

  it('refuses to resolve an archetype no enemy owns', () => {
    expect(motionDefinition('not-an-enemy')).toBeUndefined()
    expect(motionDefinition(undefined)).toBeUndefined()
    expect(motionDefinition('charger')?.behaviour).toBe('charger')
  })

  it('returns null for a behaviour that does not walk', () => {
    const box = { x: 0, y: 0, width: 32, height: 40 }
    const context = {
      player: { x: 500, y: 0 },
      dt: 1 / 60,
      platforms: [],
      bounds: null,
    }

    expect(stepMotion(enemyDefinition('turret'), box, context)).toBeNull()
    expect(stepMotion(enemyDefinition('armored'), box, context)).toBeNull()
    expect(stepMotion(enemyDefinition('charger'), box, context)).not.toBeNull()
    expect(stepMotion(enemyDefinition('flyer'), box, context)).not.toBeNull()
    expect(stepMotion(enemyDefinition('patrol'), box, context)).not.toBeNull()
  })

  it('starts a dead enemy from a mutable box without moving it', () => {
    const target = createTarget({
      id: 'e1',
      x: 400,
      y: 360,
      width: 32,
      height: 40,
      hp: 10,
      score: 10,
      archetype: 'charger',
    })
    target.alive = false
    const w = world({ archetype: 'charger', targetX: 400 })
    onlyTarget(w).alive = false

    run(w, 60)

    expect(onlyTarget(w).box.x).toBe(400)
    expect(target.box.width).toBe(32)
  })
})
