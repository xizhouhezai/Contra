import { describe, expect, it } from 'vitest'
import type { CoreEvent } from '../src/core.js'
import { World } from '../src/core.js'
import { BEAM_RANGE, explosionRadius, WEAPONS } from '../src/data/weapons.js'
import type { TargetDefinition } from '../src/entities/Target.js'
import { createWeaponSlot } from '../src/systems/Arsenal.js'
import { input } from './support.js'

const GROUND = { x: -4000, y: 200, width: 20000, height: 40 }

type Id = 'laser' | 'cluster' | 'grenade' | 'pierce' | 'prism' | 'pulse'

function armedWorld(weaponId: Id, targets: TargetDefinition[]): World {
  const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND], targets })
  world.player.weaponSlots = [createWeaponSlot(weaponId)]
  world.player.activeSlot = 0
  return world
}

function run(world: World, steps: number, fire = true): CoreEvent[] {
  const events: CoreEvent[] = []
  for (let step = 0; step < steps; step += 1) {
    events.push(...world.update(1 / 60, input({ fire })))
  }
  return events
}

function target(id: string, x: number, y: number): TargetDefinition {
  return { id, x, y, width: 32, height: 40, hp: 1000, score: 10 }
}

describe('Beam weapon (GDD §3.2 激光枪)', () => {
  it('spawns no projectile and damages instantly', () => {
    const world = armedWorld('laser', [target('a', 200, 160)])
    const events = run(world, 1)

    expect(world.bullets).toHaveLength(0)
    expect(events.filter((event) => event.type === 'shot')).toHaveLength(1)
    expect(world.targets[0]?.hp).toBe(1000 - WEAPONS.laser.damage)
  })

  it('ticks at its declared rate and spends one ammo per tick', () => {
    const world = armedWorld('laser', [target('a', 200, 160)])

    run(world, 60)

    // 20 ticks/s over one second, one ammo each.
    expect(world.player.weaponSlots[0]?.ammoLeft).toBe(WEAPONS.laser.ammo - 20)
    expect(world.targets[0]?.hp).toBe(1000 - WEAPONS.laser.damage * 20)
  })

  it('stops at the first target on the ray', () => {
    const world = armedWorld('laser', [target('near', 200, 160), target('far', 400, 160)])
    run(world, 1)

    expect(world.targets[0]?.hp).toBeLessThan(1000)
    expect(world.targets[1]?.hp).toBe(1000)
  })

  it('does not reach past its range', () => {
    const world = armedWorld('laser', [target('far', BEAM_RANGE + 80, 160)])
    run(world, 1)

    expect(world.targets[0]?.hp).toBe(1000)
  })
})

describe('Thrown weapons (GDD §3.2 落地爆炸)', () => {
  it('arcs under gravity instead of flying straight', () => {
    const world = armedWorld('cluster', [])
    run(world, 1)
    const shell = world.bullets[0]
    if (shell === undefined) throw new Error('expected a thrown round')

    expect(shell.gravity).toBeGreaterThan(0)
    const firstY = shell.position.y
    run(world, 30, false)

    expect(shell.position.y).toBeGreaterThan(firstY)
  })

  it('explodes on contact and damages everything inside the radius', () => {
    const world = armedWorld('grenade', [target('a', 160, 168), target('b', 200, 168)])
    // One volley only: the first step fires, the rest let the shell reach them.
    const events = run(world, 1)
    events.push(...run(world, 90, false))
    const blasts = events.filter((event) => event.type === 'explosion')

    expect(blasts.length).toBeGreaterThan(0)
    expect(world.bullets.some((bullet) => bullet.gravity > 0)).toBe(false)
    expect(world.targets[0]?.hp).toBe(1000 - WEAPONS.grenade.damage)
    expect(world.targets[1]?.hp).toBe(1000 - WEAPONS.grenade.damage)
  })

  it('leaves targets outside the blast untouched', () => {
    const world = armedWorld('grenade', [target('near', 160, 168), target('out', 900, 100)])
    run(world, 1)
    run(world, 90, false)

    expect(world.targets[0]?.hp).toBeLessThan(1000)
    expect(world.targets[1]?.hp).toBe(1000)
    expect(explosionRadius('grenade')).toBeGreaterThan(explosionRadius('cluster'))
  })
})

describe('Pierce and prism (GDD §3.2 特殊)', () => {
  it('lets a pierce round pass through exactly one extra target', () => {
    const world = armedWorld('pierce', [
      target('a', 200, 160),
      target('b', 260, 160),
      target('c', 320, 160),
    ])
    // Long enough for a round to travel past all three: 520 px/s over ~0.5s.
    run(world, 240)

    expect(world.targets[0]?.hp).toBeLessThan(1000)
    expect(world.targets[1]?.hp).toBeLessThan(1000)
    expect(world.targets[2]?.hp).toBe(1000)
  })

  it('lets a prism round pass through three targets at once', () => {
    const world = armedWorld('prism', [
      target('a', 200, 160),
      target('b', 260, 160),
      target('c', 320, 160),
      target('d', 380, 160),
    ])
    // Long enough for a round to travel past all four: 500 px/s over ~0.8s.
    run(world, 240)

    expect(world.targets.slice(0, 3).every((entry) => entry.hp < 1000)).toBe(true)
    expect(world.targets[3]?.hp).toBe(1000)
  })

  it('spends an ordinary round on the first target it meets', () => {
    const world = armedWorld('pulse', [target('a', 200, 160), target('b', 240, 160)])
    run(world, 60)

    expect(world.targets[0]?.hp).toBeLessThan(1000)
    expect(world.targets[1]?.hp).toBe(1000)
  })
})
