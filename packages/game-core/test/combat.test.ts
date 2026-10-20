import { describe, expect, it } from 'vitest'
import type { CoreEvent } from '../src/core.js'
import { World } from '../src/core.js'
import { INVULNERABLE_SECONDS, PLAYER_HEARTS } from '../src/data/constants.js'
import type { TargetDefinition } from '../src/entities/Target.js'
import { applyHit, canDamage, isHostile, isInvulnerable } from '../src/systems/Combat.js'
import { input } from './support.js'

const GROUND = { x: -4000, y: 200, width: 20000, height: 40 }

/** A contact hazard standing exactly where the player spawns. */
function contactTarget(): TargetDefinition {
  return { id: 'hazard', x: 0, y: 160, width: 24, height: 40, hp: 1000, score: 10 }
}

/** Steps the world and collects every event it emits. */
function run(world: World, steps: number): CoreEvent[] {
  const events: CoreEvent[] = []
  for (let step = 0; step < steps; step += 1) events.push(...world.update(1 / 60, input()))
  return events
}

describe('Combat damage rules (T-M1-06)', () => {
  it('costs exactly one heart per hit, whatever the incoming damage', () => {
    const target = { hearts: 3, invulnerableUntil: 0 }

    const result = applyHit(target, 0)

    expect(result).toEqual({ applied: true, died: false, heartsLeft: 2 })
    expect(target.hearts).toBe(2)
  })

  it('opens a 1.5s window on the hit that lands', () => {
    const target = { hearts: 3, invulnerableUntil: 0 }

    applyHit(target, 10)

    expect(target.invulnerableUntil).toBe(10 + INVULNERABLE_SECONDS)
    expect(INVULNERABLE_SECONDS).toBe(1.5)
    expect(isInvulnerable(target, 11)).toBe(true)
    expect(isInvulnerable(target, 11.49)).toBe(true)
    expect(isInvulnerable(target, 11.5)).toBe(false)
  })

  it('drops every hit inside the window, including same-frame ones', () => {
    const target = { hearts: 3, invulnerableUntil: 0 }

    const first = applyHit(target, 0)
    const second = applyHit(target, 0)
    const third = applyHit(target, 0.5)

    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)
    expect(third.applied).toBe(false)
    expect(target.hearts).toBe(2)
  })

  it('reports death and stops spending hearts at zero', () => {
    const target = { hearts: 1, invulnerableUntil: 0 }

    const fatal = applyHit(target, 0)
    const after = applyHit(target, 10)

    expect(fatal).toEqual({ applied: true, died: true, heartsLeft: 0 })
    expect(after.applied).toBe(false)
    expect(after.died).toBe(true)
    expect(target.hearts).toBe(0)
  })

  it('resolves factions so only the enemy side hurts the player', () => {
    expect(isHostile('player', 'enemy')).toBe(true)
    expect(isHostile('enemy', 'player')).toBe(true)
    expect(isHostile('player', 'player')).toBe(false)
    expect(isHostile('enemy', 'enemy')).toBe(false)

    expect(canDamage('enemy', 'player')).toBe(true)
    expect(canDamage('player', 'enemy')).toBe(true)
    expect(canDamage('player', 'player')).toBe(false)
    expect(canDamage('enemy', 'enemy')).toBe(false)
  })
})

describe('Player invulnerability in the world (T-M1-06)', () => {
  it('starts with three hearts and no window', () => {
    const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })

    expect(PLAYER_HEARTS).toBe(3)
    expect(world.player.hearts).toBe(3)
    expect(world.player.invulnerableUntil).toBe(0)
  })

  it('costs one heart on contact and starts the window', () => {
    const world = new World({
      spawn: { x: 0, y: 160 },
      platforms: [GROUND],
      targets: [contactTarget()],
    })

    const hurt = run(world, 1).filter((event) => event.type === 'playerHurt')

    expect(hurt).toHaveLength(1)
    expect(world.player.hearts).toBe(2)
    // The hit lands at the end of the step, so the window opens from world.now.
    expect(world.player.invulnerableUntil - world.now).toBeCloseTo(INVULNERABLE_SECONDS, 10)
  })

  it('charges a single heart no matter how many hits land in one frame', () => {
    const stack: TargetDefinition[] = [
      { id: 'a', x: 0, y: 160, width: 24, height: 40, hp: 1000, score: 10 },
      { id: 'b', x: 0, y: 160, width: 24, height: 40, hp: 1000, score: 10 },
      { id: 'c', x: 0, y: 160, width: 24, height: 40, hp: 1000, score: 10 },
    ]
    const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND], targets: stack })

    const events = run(world, 1)

    expect(events.filter((event) => event.type === 'playerHurt')).toHaveLength(1)
    expect(world.player.hearts).toBe(2)
  })

  it('ignores contact for the whole 1.5s window and resumes after it', () => {
    const world = new World({
      spawn: { x: 0, y: 160 },
      platforms: [GROUND],
      targets: [contactTarget()],
    })

    // 1.4s of unbroken contact must still cost exactly one heart.
    const during = run(world, 84)
    expect(during.filter((event) => event.type === 'playerHurt')).toHaveLength(1)
    expect(world.player.hearts).toBe(2)

    // Cross the window while still touching: the next hit lands.
    const after = run(world, 12)
    expect(after.filter((event) => event.type === 'playerHurt')).toHaveLength(1)
    expect(world.player.hearts).toBe(1)
  })

  it('reaches zero hearts and reports playerDied once', () => {
    const world = new World({
      spawn: { x: 0, y: 160 },
      platforms: [GROUND],
      targets: [contactTarget()],
      hearts: 1,
    })

    const events = run(world, 2)

    expect(world.player.hearts).toBe(0)
    expect(events.filter((event) => event.type === 'playerHurt')).toHaveLength(1)
    expect(events.filter((event) => event.type === 'playerDied')).toHaveLength(1)
  })

  it('leaves the player untouched when nothing is in contact', () => {
    const world = new World({ spawn: { x: 0, y: 160 }, platforms: [GROUND] })
    const events = run(world, 120)

    expect(world.player.hearts).toBe(3)
    expect(events.some((event) => event.type === 'playerHurt')).toBe(false)
  })
})
