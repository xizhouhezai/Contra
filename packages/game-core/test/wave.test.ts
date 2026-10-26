import { describe, expect, it } from 'vitest'
import {
  createWaveState,
  dueSpawns,
  routeOpen,
  triggersOn,
  type Wave,
  type WaveState,
  waveCleared,
  waveSeconds,
} from '../src/systems/Wave.js'

/**
 * Waves are how a stage spreads enemies across time instead of placing them all
 * on frame one. The behaviour that matters is that a gating wave actually gates:
 * if routeOpen returns true while enemies are alive, the player walks past the
 * fight and the stage is fifteen seconds long again.
 */

const TRIGGER = { x: 1000, y: 0, width: 400, height: 540 }
const PLAYER_IN = { x: 1100, y: 300, width: 24, height: 40 }
const PLAYER_OUT = { x: 200, y: 300, width: 24, height: 40 }

function wave(overrides: Partial<Wave> = {}): Wave {
  return {
    id: 'w1',
    trigger: TRIGGER,
    gates: true,
    spawns: [
      {
        x: 0,
        y: 0,
        delaySeconds: 0,
        target: { id: 'e1', width: 32, height: 40, hp: 30, score: 50 },
      },
      {
        x: 60,
        y: 0,
        delaySeconds: 1.5,
        target: { id: 'e2', width: 32, height: 40, hp: 30, score: 50 },
      },
    ],
    ...overrides,
  }
}

function firedState(): WaveState {
  const state = createWaveState()
  state.fired = true
  return state
}

describe('enemy waves (stage-expansion-plan §4.3)', () => {
  it('triggers when the player enters the region, not before', () => {
    expect(triggersOn(wave(), PLAYER_IN)).toBe(true)
    expect(triggersOn(wave(), PLAYER_OUT)).toBe(false)
  })

  it('places nothing until it has fired', () => {
    const state = createWaveState()
    expect(dueSpawns(wave(), state)).toEqual([])
  })

  it('places the first spawn immediately after firing', () => {
    const state = firedState()
    const due = dueSpawns(wave(), state)
    expect(due.map((s) => s.target.id)).toEqual(['e1'])
  })

  it('holds the delayed spawn until its delay passes', () => {
    const state = firedState()
    state.elapsed = 1.0
    expect(dueSpawns(wave(), state).map((s) => s.target.id)).toEqual(['e1'])
    state.elapsed = 1.5
    expect(dueSpawns(wave(), state).map((s) => s.target.id)).toEqual(['e1', 'e2'])
  })

  it('does not re-place a spawn already on the field', () => {
    // Otherwise a wave held open for ten seconds would spawn enemies every step.
    const state = firedState()
    state.spawned.add('e1')
    expect(dueSpawns(wave(), state).map((s) => s.target.id)).toEqual([])
  })

  it('is not cleared while any of its enemies live', () => {
    const state = firedState()
    state.spawned.add('e1')
    state.spawned.add('e2')
    expect(waveCleared(wave(), state, new Set(['e1', 'e2']))).toBe(false)
    expect(waveCleared(wave(), state, new Set(['e1']))).toBe(false)
    expect(waveCleared(wave(), state, new Set())).toBe(true)
  })

  it('is not cleared before it has fired', () => {
    // A wave the player has not reached must not count as passed.
    expect(waveCleared(wave(), createWaveState(), new Set())).toBe(false)
  })

  it('closes the route while a gating wave is unfinished', () => {
    const w = wave()
    const unfinished = firedState()
    unfinished.spawned.add('e1')
    expect(routeOpen([w], new Map([['w1', unfinished]]), new Set())).toBe(false)

    // Only once every spawn is placed and dead does the way open.
    const finished = firedState()
    finished.spawned.add('e1')
    finished.spawned.add('e2')
    expect(routeOpen([w], new Map([['w1', finished]]), new Set())).toBe(true)
  })

  it('does not open the route on a wave that has not released its spawns', () => {
    // The defect this guards: a gating wave fired on frame one opened the route
    // immediately, because the id set it had placed was empty and therefore dead.
    const w = wave()
    const state = firedState()
    state.spawned.add('e1')
    expect(routeOpen([w], new Map([['w1', state]]), new Set())).toBe(false)
  })

  it('lets the player through a non-gating wave', () => {
    const w = wave({ gates: false })
    const states = new Map([['w1', firedState()]])
    expect(routeOpen([w], states, new Set(['e1']))).toBe(true)
  })

  it('treats a gating wave with no state as closed', () => {
    // The player has not reached it yet, so the way is not open.
    expect(routeOpen([wave()], new Map(), new Set())).toBe(false)
  })

  it('estimates a wave length for pacing checks', () => {
    // Longest delay 1.5 plus two enemies at 6 seconds each.
    expect(waveSeconds(wave(), 6)).toBeCloseTo(13.5, 5)
  })
})
