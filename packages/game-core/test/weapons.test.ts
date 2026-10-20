import { describe, expect, it } from 'vitest'
import type { CoreEvent } from '../src/core.js'
import { World } from '../src/core.js'
import { PULSE_DAMAGE, PULSE_PROJECTILE_SPEED } from '../src/data/constants.js'
import type { InputState, PlatformDefinition } from '../src/data/types.js'
import { AIM_DIRECTIONS, aimVector } from '../src/systems/Weapons.js'
import { input } from './support.js'

const GROUND: PlatformDefinition = { x: -4000, y: 200, width: 20000, height: 40 }

function world(): World {
  return new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
}

/** The single shot event a fresh world produces within the first step. */
function firstShot(state: InputState): { world: World; events: readonly CoreEvent[] } {
  const w = world()
  const events = w.update(1 / 60, state)
  return { world: w, events }
}

describe('Weapons system (T-M0-05)', () => {
  it('exposes exactly eight aim directions', () => {
    expect(AIM_DIRECTIONS).toHaveLength(8)
  })

  it('resolves every input combination to one of the eight directions', () => {
    const moves: (-1 | 0 | 1)[] = [-1, 0, 1]
    const seen = new Set<string>()

    for (const moveX of moves) {
      for (const moveY of moves) {
        for (const facing of [1, -1] as const) {
          const aim = aimVector(input({ moveX, moveY }), facing)
          if (aim === null) continue
          expect(Math.hypot(aim.x, aim.y)).toBeCloseTo(1, 10)
          const match = AIM_DIRECTIONS.some(
            (d) => Math.sign(d.x) === Math.sign(aim.x) && Math.sign(d.y) === Math.sign(aim.y),
          )
          expect(match).toBe(true)
          seen.add(`${Math.sign(aim.x)},${Math.sign(aim.y)}`)
        }
      }
    }

    expect(seen.size).toBe(8)
  })

  it('can fire all eight directions', () => {
    const combos: InputState[] = [
      input({ moveX: 0, moveY: -1 }),
      input({ moveX: 1, moveY: -1 }),
      input({ moveX: 1, moveY: 0 }),
      input({ moveX: 1, moveY: 1 }),
      input({ moveX: 0, moveY: 1 }),
      input({ moveX: -1, moveY: 1 }),
      input({ moveX: -1, moveY: 0 }),
      input({ moveX: -1, moveY: -1 }),
    ]

    const directions = combos.map((state) => {
      const { world: w, events } = firstShot({ ...state, fire: true })
      expect(w.bullets).toHaveLength(1)
      const shot = events.find((event) => event.type === 'shot')
      expect(shot).toBeDefined()
      const bullet = w.bullets[0]
      if (bullet === undefined) throw new Error('expected a bullet')
      expect(Math.hypot(bullet.velocity.x, bullet.velocity.y)).toBeCloseTo(
        PULSE_PROJECTILE_SPEED,
        6,
      )
      expect(bullet.damage).toBe(PULSE_DAMAGE)
      return `${Math.sign(bullet.velocity.x)},${Math.sign(bullet.velocity.y)}`
    })

    expect(new Set(directions).size).toBe(8)
  })

  it('fires backward while running forward', () => {
    const w = world()
    // Run right for half a second so the player is genuinely travelling +x.
    for (let step = 0; step < 30; step += 1) w.update(1 / 60, input({ moveX: 1 }))
    expect(w.player.velocity.x).toBe(180)
    expect(w.player.facing).toBe(1)

    // Press the back key and fire: the shot leaves the muzzle opposite to the
    // direction the player was running.
    const events = w.update(1 / 60, input({ moveX: -1, fire: true }))
    const bullet = w.bullets[0]
    if (bullet === undefined) throw new Error('expected a bullet')

    expect(bullet.velocity.x).toBeLessThan(0)
    expect(bullet.velocity.y).toBeCloseTo(0, 10)
    expect(events.some((event) => event.type === 'shot')).toBe(true)
  })

  it('derives the aim from input only, never from player velocity', () => {
    const w = world()
    for (let step = 0; step < 30; step += 1) w.update(1 / 60, input({ moveX: 1 }))

    // Player is travelling +x, but the input says aim up: no horizontal component.
    w.update(1 / 60, input({ moveX: 0, moveY: -1, fire: true }))
    const bullet = w.bullets[0]
    if (bullet === undefined) throw new Error('expected a bullet')

    expect(w.player.velocity.x).toBe(0)
    expect(bullet.velocity.x).toBeCloseTo(0, 10)
    expect(bullet.velocity.y).toBeCloseTo(-PULSE_PROJECTILE_SPEED, 6)
  })

  it('fires straight ahead when the stick is neutral', () => {
    const worldRight = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
    for (let step = 0; step < 10; step += 1) worldRight.update(1 / 60, input({ moveX: 1 }))
    worldRight.update(1 / 60, input({ fire: true }))
    expect(worldRight.bullets[0]?.velocity.x).toBeCloseTo(PULSE_PROJECTILE_SPEED, 6)

    const worldLeft = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
    for (let step = 0; step < 10; step += 1) worldLeft.update(1 / 60, input({ moveX: -1 }))
    worldLeft.update(1 / 60, input({ fire: true }))
    expect(worldLeft.bullets[0]?.velocity.x).toBeCloseTo(-PULSE_PROJECTILE_SPEED, 6)
  })

  it('holds the fire cadence at 6 shots per second', () => {
    const w = world()
    for (let step = 0; step < 60; step += 1) w.update(1 / 60, input({ fire: true, moveX: 0 }))

    expect(w.bullets).toHaveLength(6)
  })

  it('does not fire when the fire button is not held', () => {
    const w = world()
    for (let step = 0; step < 60; step += 1) w.update(1 / 60, input())

    expect(w.bullets).toHaveLength(0)
  })

  it('advances bullets at the GDD projectile speed', () => {
    const w = world()
    w.update(1 / 60, input({ fire: true, moveX: 1, moveY: 0 }))
    const before = w.bullets[0]?.position.x ?? 0

    w.update(1 / 60, input())
    const after = w.bullets[0]?.position.x ?? 0

    expect(after - before).toBeCloseTo(PULSE_PROJECTILE_SPEED / 60, 6)
  })
})
