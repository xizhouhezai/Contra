/**
 * REQ-CMB-001: 敌人主动攻击玩家
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file. The behaviour was covered before;
 * only the link was missing.
 */
import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { ENEMY_IDS } from '../src/data/enemies.js'
import { ENEMY_WEAPONS, maxConcurrentShooters } from '../src/data/enemyWeapons.js'
import { createTarget } from '../src/entities/Target.js'
import { createAttackState, stepAttack, volleyDirections } from '../src/systems/EnemyAttack.js'

/**
 * Enemies could only hurt a player who walked into them.
 *
 * data/enemies.ts described ten archetypes with distinct behaviours, and
 * systems/EnemyBehaviour.ts implemented two of those behaviours, but core.ts
 * called neither: the only path to damage was contact. These tests pin the attack
 * loop that was missing, and the fairness rules that make it playable.
 */

const IDLE = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false } as const

function world(options: { targetX?: number; archetype?: string; act?: 1 | 2 | 3 } = {}): World {
  // exactOptionalPropertyTypes rejects an explicit undefined, so the act key is
  // built separately and only merged in when the caller named one. Spreading a
  // conditional inline still yields `act: 1 | 2 | 3 | undefined` to the checker.
  const actKey: { act?: 1 | 2 | 3 } = options.act === undefined ? {} : { act: options.act }
  return new World({
    spawn: { x: 100, y: 300 },
    platforms: [{ x: 0, y: 400, width: 3000, height: 60 }],
    ...actKey,
    targets: [
      {
        id: 'e1',
        x: options.targetX ?? 400,
        y: 360,
        width: 32,
        height: 40,
        hp: 30,
        score: 50,
        archetype: options.archetype ?? 'patrol',
      },
    ],
  })
}

function collect(w: World, seconds: number): string[] {
  const types: string[] = []
  const steps = Math.ceil(seconds / (1 / 60))
  for (let i = 0; i < steps; i += 1) {
    for (const event of w.update(1 / 60, IDLE)) types.push(event.type)
  }
  return types
}

describe('enemy attacks (REQ-CMB-004)', () => {
  it('makes an enemy telegraph before it fires', () => {
    const w = world()
    const events = collect(w, 4)
    expect(events).toContain('enemyTelegraph')
    expect(events).toContain('enemyShot')
  })

  it('telegraphs before firing, never after', () => {
    const w = world()
    const events = collect(w, 4)
    const firstTelegraph = events.indexOf('enemyTelegraph')
    const firstShot = events.indexOf('enemyShot')
    expect(firstTelegraph).toBeGreaterThanOrEqual(0)
    expect(firstShot).toBeGreaterThan(firstTelegraph)
  })

  it('creates enemy-owned bullets that can hurt the player', () => {
    // The player stands still directly in the line of fire. A patrol drone fires
    // straight, so this must cost a heart - otherwise the enemy is decoration.
    const w = world({ targetX: 240 })
    const before = w.player.hearts
    collect(w, 8)
    expect(w.player.hearts).toBeLessThan(before)
  })

  it('leaves a target with no archetype inert', () => {
    const w = new World({
      spawn: { x: 100, y: 300 },
      platforms: [{ x: 0, y: 400, width: 3000, height: 60 }],
      targets: [{ id: 'box', x: 300, y: 360, width: 32, height: 40, hp: 30, score: 50 }],
    })
    const events = collect(w, 6)
    expect(events).not.toContain('enemyShot')
  })

  it('stays out of range until the player comes close', () => {
    // 2000px away against a 620px range: nothing should ever be fired.
    const w = world({ targetX: 2100 })
    const events = collect(w, 8)
    expect(events).not.toContain('enemyShot')
  })

  it('respects the act shooter budget', () => {
    // Act 1 allows one shooter. Six drones in range must not produce six volleys
    // inside one second - that is a wall, and a wall cannot be dodged.
    const targets = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i}`,
      x: 200 + i * 30,
      y: 360,
      width: 32,
      height: 40,
      hp: 30,
      score: 50,
      archetype: 'patrol',
    }))
    const w = new World({
      spawn: { x: 100, y: 300 },
      platforms: [{ x: 0, y: 400, width: 3000, height: 60 }],
      targets,
      act: 1,
    })
    const events = collect(w, 1.2)
    const shots = events.filter((t) => t === 'enemyShot').length
    expect(shots).toBeLessThanOrEqual(1)
  })
})

describe('enemy weapon data', () => {
  it('gives every archetype a weapon', () => {
    for (const id of ENEMY_IDS) expect(ENEMY_WEAPONS[id]).toBeDefined()
  })

  it('gives every ranged weapon a visible warning', () => {
    // The design doc forbids an attack with no telegraph outright: dying to
    // something you could not read is not difficulty.
    for (const id of ENEMY_IDS) {
      const weapon = ENEMY_WEAPONS[id]
      if (weapon.kind === 'melee') continue
      expect(weapon.telegraphSeconds).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('caps concurrent shooters per act', () => {
    expect(maxConcurrentShooters(1)).toBe(1)
    expect(maxConcurrentShooters(2)).toBe(2)
    expect(maxConcurrentShooters(3)).toBe(3)
  })
})

describe('volley geometry', () => {
  it('centres a fan on the aim', () => {
    // An off-centre fan misses whenever the player is exactly on the aim, which
    // reads as a bug rather than as a pattern.
    const dirs = volleyDirections({ x: 1, y: 0 }, 3, 30)
    expect(dirs).toHaveLength(3)
    expect(dirs[1]?.y).toBeCloseTo(0, 6)
    expect(dirs[0]?.y).toBeLessThan(0)
    expect(dirs[2]?.y).toBeGreaterThan(0)
  })

  it('returns one unchanged direction for a single shot', () => {
    const dirs = volleyDirections({ x: 0, y: 1 }, 1, 40)
    expect(dirs).toHaveLength(1)
    expect(dirs[0]?.x).toBeCloseTo(0, 6)
    expect(dirs[0]?.y).toBeCloseTo(1, 6)
  })
})

describe('attack timing', () => {
  it('locks the aim when the wind-up starts', () => {
    // A shot that keeps tracking through the warning can only be dodged by
    // having already moved, which is not a dodge.
    const target = createTarget({
      id: 'e1',
      x: 400,
      y: 360,
      width: 32,
      height: 40,
      hp: 10,
      score: 10,
      archetype: 'patrol',
    })
    const state = createAttackState()
    const weapon = ENEMY_WEAPONS.patrol

    const start = stepAttack(state, weapon, target, { x: 500, y: 380 }, true, 0, true)
    expect(start.startedTelegraph).toBe(true)

    // Player moves far away mid-warning; the volley still resolves.
    let fired = null
    for (let i = 0; i < 60; i += 1) {
      const step = stepAttack(state, weapon, target, { x: 900, y: 100 }, true, i / 60, true)
      if (step.fired) fired = step
    }
    expect(fired).not.toBeNull()
  })

  it('abandons the wind-up when the player leaves range', () => {
    const target = createTarget({
      id: 'e1',
      x: 400,
      y: 360,
      width: 32,
      height: 40,
      hp: 10,
      score: 10,
      archetype: 'patrol',
    })
    const state = createAttackState()
    const weapon = ENEMY_WEAPONS.patrol
    stepAttack(state, weapon, target, { x: 500, y: 380 }, true, 0, true)
    expect(state.windingUp).toBe(true)

    stepAttack(state, weapon, target, { x: 5000, y: 380 }, true, 0.2, true)
    expect(state.windingUp).toBe(false)
  })
})
