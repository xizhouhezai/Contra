import { describe, expect, it } from 'vitest'
import type { EnemyState } from '../src/data/enemies.js'
import { enemyDefinition } from '../src/data/enemies.js'
import {
  attackSide,
  CHARGER_CHARGE_BOOST,
  canReachFlyer,
  damageAgainst,
  type EnemyMotion,
  FLYER_MIN_AIM_OFFSET_PX,
  inSight,
  knockBack,
  stepCharger,
  stepFlyer,
} from '../src/systems/EnemyBehaviour.js'

const charger = enemyDefinition('charger')
const flyer = enemyDefinition('flyer')
const armored = enemyDefinition('armored')
const patrol = enemyDefinition('patrol')

function motion(x: number, y: number, state: EnemyState = 'chase'): EnemyMotion {
  return { position: { x, y }, state, knockedSeconds: 0 }
}

describe('Charger chase (T-M2-04)', () => {
  it('closes distance to the player', () => {
    let m = motion(0, 0)
    const player = { x: 200, y: 0 }
    const before = Math.abs(player.x - m.position.x)
    for (let step = 0; step < 30; step += 1) m = stepCharger(charger, m, player, 1 / 60)
    const after = Math.abs(player.x - m.position.x)
    expect(after).toBeLessThan(before)
  })

  it('runs in the player direction', () => {
    const m = stepCharger(charger, motion(0, 0), { x: 200, y: 0 }, 1 / 60)
    expect(m.position.x).toBeGreaterThan(0)
    expect(m.state).toBe('chase')
  })

  it('moves faster than its base speed while charging', () => {
    const m = stepCharger(charger, motion(0, 0), { x: 200, y: 0 }, 1)
    expect(m.position.x).toBeCloseTo(charger.speed * CHARGER_CHARGE_BOOST, 6)
  })

  it('idles when the player is out of sight', () => {
    const m = stepCharger(charger, motion(0, 0), { x: 10000, y: 0 }, 1 / 60)
    expect(m.state).toBe('idle')
    expect(m.position.x).toBe(0)
  })

  it('slides away while knocked back, then resumes', () => {
    const player = { x: 200, y: 0 }
    let m = knockBack(motion(100, 0))
    expect(m.state).toBe('hurt')

    const start = m.position.x
    m = stepCharger(charger, m, player, 1 / 60)
    // Knockback pushes away from the player, i.e. leftward here.
    expect(m.position.x).toBeLessThan(start)

    // After the window the charger hunts again.
    for (let step = 0; step < 60; step += 1) m = stepCharger(charger, m, player, 1 / 60)
    expect(m.state).toBe('chase')
    expect(m.knockedSeconds).toBe(0)
  })

  it('reports sight range correctly', () => {
    expect(inSight({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(true)
    expect(inSight({ x: 0, y: 0 }, { x: 5000, y: 0 })).toBe(false)
  })
})

describe('Flyer (T-M2-05)', () => {
  it('drifts toward the player and weaves vertically', () => {
    let m = motion(0, 100)
    const player = { x: 300, y: 100 }
    let minY = m.position.y
    let maxY = m.position.y
    let phase = 0
    for (let step = 0; step < 120; step += 1) {
      phase += 2 / 60
      m = stepFlyer(flyer, m, player, phase, 1 / 60)
      minY = Math.min(minY, m.position.y)
      maxY = Math.max(maxY, m.position.y)
    }
    expect(m.position.x).toBeGreaterThan(0)
    expect(maxY - minY).toBeGreaterThan(0)
  })

  it('ignores platforms by construction: no platform argument exists', () => {
    // The signature is the guarantee - stepFlyer cannot consult platforms.
    expect(stepFlyer.length).toBe(5)
  })

  it('cannot be hit by a level shot from far below', () => {
    expect(canReachFlyer(400, 200)).toBe(false)
  })

  it('can be hit when the aim is raised', () => {
    expect(canReachFlyer(400, 400 - FLYER_MIN_AIM_OFFSET_PX + 1)).toBe(true)
  })

  it('flies with its state set to chase', () => {
    const m = stepFlyer(flyer, motion(0, 100), { x: 300, y: 100 }, 0, 1 / 60)
    expect(m.state).toBe('chase')
  })
})

describe('Armoured enemy (T-M2-06)', () => {
  it('absorbs a frontal hit', () => {
    expect(damageAgainst(armored, 'front', 25, false)).toBe(0)
  })

  it('takes full damage from behind', () => {
    expect(damageAgainst(armored, 'back', 25, false)).toBe(25)
  })

  it('is pierced by a piercing round regardless of side', () => {
    expect(damageAgainst(armored, 'front', 25, true)).toBe(25)
  })

  it('lets unarmoured enemies take damage from any side', () => {
    expect(damageAgainst(patrol, 'front', 25, false)).toBe(25)
    expect(damageAgainst(patrol, 'back', 25, false)).toBe(25)
  })

  it('classifies attack sides against facing', () => {
    // Facing right, shot from the right: frontal.
    expect(attackSide(200, 100, 1)).toBe('front')
    // Facing right, shot from the left: behind.
    expect(attackSide(0, 100, 1)).toBe('back')
    // Facing left, shot from the left: frontal.
    expect(attackSide(0, 100, -1)).toBe('front')
  })
})
