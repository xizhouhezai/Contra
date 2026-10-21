import { describe, expect, it } from 'vitest'
import { World } from '../src/core.js'
import { HOMING_LOCK_LIMIT, WEAPONS } from '../src/data/weapons.js'
import type { Bullet } from '../src/entities/Bullet.js'
import type { TargetDefinition } from '../src/entities/Target.js'
import { createWeaponSlot } from '../src/systems/Arsenal.js'
import { SPREAD_GAIN_PER_SHOT, SPREAD_RECOVERY_PER_SECOND } from '../src/systems/Combat.js'
import { input } from './support.js'

const GROUND = { x: -4000, y: 200, width: 20000, height: 40 }

/** A world holding one weapon in slot 0, full on ammo and tight on cone. */
function armedWorld(
  weaponId: 'scatter' | 'homing' | 'pulse',
  targets: TargetDefinition[] = [],
): World {
  const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND], targets })
  world.player.weaponSlots = [createWeaponSlot(weaponId)]
  world.player.activeSlot = 0
  return world
}

/** Angle of a bullet's velocity, in degrees. */
function headingDeg(bullet: Bullet): number {
  return (Math.atan2(bullet.velocity.y, bullet.velocity.x) * 180) / Math.PI
}

/** Widest angular gap between the pellets of one pull, in degrees. */
function coneDeg(bullets: readonly Bullet[]): number {
  const headings = bullets.map(headingDeg)
  return Math.abs(Math.max(...headings) - Math.min(...headings))
}

/** Advances the world without firing. */
function rest(world: World, steps: number): void {
  for (let step = 0; step < steps; step += 1) world.update(1 / 60, input({ moveX: 1 }))
}

/** Fires one pull in place and returns only the pellets it produced. */
function pull(world: World): readonly Bullet[] {
  const before = new Set(world.bullets.map((bullet) => bullet.id))
  world.update(1 / 60, input({ moveX: 1, fire: true }))
  return world.bullets.filter((bullet) => !before.has(bullet.id))
}

/** Holds the trigger for the given number of steps, returning each pull's cone. */
function holdFire(world: World, steps: number): number[] {
  const cones: number[] = []
  for (let step = 0; step < steps; step += 1) {
    const pellets = pull(world)
    if (pellets.length > 0) cones.push(coneDeg(pellets))
  }
  return cones
}

describe('Scatter spread accumulation (T-M1-02)', () => {
  it('fires a tight cone on the first pull', () => {
    const world = armedWorld('scatter')
    const pellets = pull(world)

    expect(pellets).toHaveLength(WEAPONS.scatter.projectileCount)
    expect(coneDeg(pellets)).toBe(0)
    expect(world.player.weaponSlots[0]?.spreadAccum).toBeCloseTo(SPREAD_GAIN_PER_SHOT, 10)
  })

  it('widens the cone shot by shot until it is clearly scattered', () => {
    const world = armedWorld('scatter')

    // Scatter fires at 3/s, so 1.5s of held fire is four pulls.
    const cones = holdFire(world, 90)

    expect(cones.length).toBeGreaterThanOrEqual(4)
    expect(cones[0]).toBe(0)
    expect(cones[1]).toBeCloseTo(WEAPONS.scatter.spreadDeg / 3, 6)
    expect(cones[2]).toBeCloseTo((WEAPONS.scatter.spreadDeg * 2) / 3, 6)
    expect(cones[3]).toBeCloseTo(WEAPONS.scatter.spreadDeg, 6)
    const [first, second, third] = cones
    expect(third).toBeGreaterThan(second ?? 0)
    expect(second).toBeGreaterThan(first ?? 0)
  })

  it('never widens past the weapon cone', () => {
    const world = armedWorld('scatter')
    holdFire(world, 240)

    expect(world.player.weaponSlots[0]?.spreadAccum).toBe(1)
    rest(world, 20)
    expect(coneDeg(pull(world))).toBeLessThanOrEqual(WEAPONS.scatter.spreadDeg)
  })

  it('recovers within a second of ceasing fire', () => {
    const world = armedWorld('scatter')
    holdFire(world, 90)
    const toppedOut = world.player.weaponSlots[0]?.spreadAccum ?? 0
    expect(toppedOut).toBe(1)

    // Recovery must finish inside the one second T-M1-02 calls for.
    expect(toppedOut / SPREAD_RECOVERY_PER_SECOND).toBeLessThan(1)

    rest(world, 60)

    expect(world.player.weaponSlots[0]?.spreadAccum ?? 1).toBe(0)
    expect(coneDeg(pull(world))).toBe(0)
  })

  it('does not recover between two shots of a held trigger', () => {
    const world = armedWorld('scatter')
    pull(world)

    // Exactly one cadence gap, trigger still down: no charge may leak away.
    for (let step = 0; step < 20; step += 1) {
      world.update(1 / 60, input({ moveX: 1, fire: true }))
    }

    expect(world.player.weaponSlots[0]?.spreadAccum ?? 0).toBeGreaterThanOrEqual(
      SPREAD_GAIN_PER_SHOT * 2 - 1e-9,
    )
  })

  it('keeps weapons that never fan at a zero cone and a zero charge', () => {
    const world = armedWorld('pulse')
    const cones = holdFire(world, 120)

    expect(cones.length).toBeGreaterThan(0)
    expect(cones.every((cone) => cone === 0)).toBe(true)
    expect(world.player.weaponSlots[0]?.spreadAccum).toBe(0)
  })

  it('tops the cone out after exactly three pulls', () => {
    expect(SPREAD_GAIN_PER_SHOT * 3).toBeCloseTo(1, 10)
  })
})

describe('Homing lock cap (T-M1-02)', () => {
  /** Six live targets spread far apart, so the nearest one can be chosen. */
  const TARGETS: TargetDefinition[] = Array.from({ length: 6 }, (_, index) => ({
    id: `target-${index}`,
    x: 120 + index * 400,
    y: 140,
    width: 32,
    height: 40,
    hp: 1000,
    score: 10,
  }))

  it('locks the nearest target', () => {
    const world = armedWorld('homing', TARGETS)
    const pellets = pull(world)

    expect(pellets).toHaveLength(1)
    expect(pellets[0]?.lockedTargetId).toBe('target-0')
  })

  it('refuses a lock once the screen-wide cap is met', () => {
    const world = armedWorld('homing', TARGETS)
    const locks: (string | null)[] = []

    for (let index = 0; index < TARGETS.length; index += 1) {
      // Stand beside a different target each volley, all of them still alive, so
      // only the cap - never a death - can refuse a lock.
      world.player.position.x = (TARGETS[index]?.x ?? 0) - 60
      locks.push(pull(world)[0]?.lockedTargetId ?? null)
      rest(world, 20)
    }

    expect(locks.slice(0, HOMING_LOCK_LIMIT).every((id) => id !== null)).toBe(true)
    expect(new Set(locks.filter((id) => id !== null)).size).toBe(HOMING_LOCK_LIMIT)
    // Beyond the cap the round is a plain straight shot.
    expect(locks.slice(HOMING_LOCK_LIMIT).every((id) => id === null)).toBe(true)
  })

  it('steers a locked round toward its target, while an unlocked one flies straight', () => {
    const offAxis: TargetDefinition[] = [
      { id: 'high', x: 300, y: 20, width: 32, height: 40, hp: 1000, score: 10 },
    ]
    const world = armedWorld('homing', offAxis)
    const locked = pull(world)[0]
    if (locked === undefined) throw new Error('expected a homing round')

    const before = headingDeg(locked)
    rest(world, 10)

    expect(locked.lockedTargetId).toBe('high')
    expect(Math.abs(headingDeg(locked) - before)).toBeGreaterThan(1)

    const plainWorld = armedWorld('pulse')
    const straight = pull(plainWorld)[0]
    if (straight === undefined) throw new Error('expected a pulse round')
    const straightBefore = headingDeg(straight)
    rest(plainWorld, 10)

    expect(straight.lockedTargetId).toBeNull()
    expect(headingDeg(straight)).toBeCloseTo(straightBefore, 10)
  })

  it('frees a lock when its target dies', () => {
    const world = armedWorld('homing', TARGETS)
    pull(world)
    rest(world, 20)

    const first = world.targets[0]
    if (first === undefined) throw new Error('expected a target')
    first.alive = false

    const relocked = pull(world)

    expect(relocked[0]?.lockedTargetId).toBe('target-1')
  })
})
