/**
 * Enemy waves: how a stage spreads its enemies across time.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.3.
 *
 * A stage used to list all its targets up front, so every enemy in the level was
 * alive from the first frame and a player could outrun the whole set in fifteen
 * seconds. Waves change that: enemies appear when the player reaches a place, and
 * a wave that clears gates the way forward.
 *
 * The module is pure. It decides *when* a spawn happens and *whether* the way is
 * open; World owns the target list and does the spawning.
 */

import type { Rect } from '../data/types.js'
import type { TargetDefinition } from '../entities/Target.js'
import { overlaps } from './Mechanics.js'

/** One enemy to place when a wave fires. */
export interface WaveSpawn {
  /** Offset from the wave's trigger point, in world pixels. */
  readonly x: number
  readonly y: number
  /** Seconds after the wave fires before this enemy appears. */
  readonly delaySeconds: number
  readonly target: Omit<TargetDefinition, 'x' | 'y'>
}

export interface Wave {
  readonly id: string
  /** Player box overlapping this region fires the wave. */
  readonly trigger: Rect
  readonly spawns: readonly WaveSpawn[]
  /**
   * Whether clearing this wave opens the route onward.
   *
   * A gating wave is what turns a corridor into a fight: the player cannot run
   * past it, so the enemies get to exist for as long as they take to kill rather
   * than as long as it takes to walk by.
   */
  readonly gates: boolean
  /** Ids of the targets this wave has already put on the field. */
}

/** Wave state carried across steps. */
export interface WaveState {
  /** False until the trigger is first touched. */
  fired: boolean
  /** Seconds since the wave fired, for the delayed spawns. */
  elapsed: number
  /** Target ids this wave created, so clearing it can be judged. */
  readonly spawned: Set<string>
}

export function createWaveState(): WaveState {
  return { fired: false, elapsed: 0, spawned: new Set<string>() }
}

/** Whether this wave's trigger contains the player. */
export function triggersOn(wave: Wave, player: Rect): boolean {
  return overlaps(wave.trigger, player)
}

/**
 * How far a wave has got this step.
 *
 * Returns the spawns that are now due and not yet placed. The caller is expected
 * to have marked the wave fired; this only decides timing, so a wave can be
 * resumed after a retry without the caller having to track arithmetic.
 */
export function dueSpawns(wave: Wave, state: WaveState): readonly WaveSpawn[] {
  if (!state.fired) return []
  const due: WaveSpawn[] = []
  for (const spawn of wave.spawns) {
    // A spawn is due exactly on the step its delay passes. The tolerance keeps a
    // 1/60 step from stepping over a delay that is a multiple of 1/60.
    if (spawn.delaySeconds <= state.elapsed + 1e-9) {
      if (!state.spawned.has(spawn.target.id)) due.push(spawn)
    }
  }
  return due
}

/**
 * True once every enemy this wave will ever place has been placed and destroyed.
 *
 * Both halves matter. Checking only the live set said "cleared" for a wave that
 * had fired but had not yet released its delayed spawns - every id it had placed
 * so far was dead because it had placed none - so a gating wave opened the route
 * on the frame the player touched it and the fight behind it never happened.
 */
export function waveCleared(wave: Wave, state: WaveState, liveIds: ReadonlySet<string>): boolean {
  if (!state.fired) return false
  // Still waiting on a delayed spawn: the wave is not over, it has not started.
  if (state.spawned.size < wave.spawns.length) return false
  for (const id of state.spawned) {
    if (liveIds.has(id)) return false
  }
  return true
}

/**
 * Whether a set of waves lets the player through.
 *
 * Only gating waves block. A non-gating wave is paced by time, not by the
 * player's performance, so clearing it is optional - which is what makes an
 * optional room optional.
 */
export function routeOpen(
  waves: readonly Wave[],
  states: ReadonlyMap<string, WaveState>,
  liveIds: ReadonlySet<string>,
): boolean {
  for (const entry of waves) {
    if (!entry.gates) continue
    const state = states.get(entry.id)
    if (state === undefined) return false
    if (!waveCleared(entry, state, liveIds)) return false
  }
  return true
}

/**
 * Total time a wave is expected to take, for pacing checks.
 *
 * Sum of the delays plus a kill allowance per enemy. This is how the expansion's
 * time budget is verified: a stage whose waves add up to ninety seconds cannot
 * claim to be a ten minute stage.
 */
export function waveSeconds(wave: Wave, secondsToKill: number): number {
  let longest = 0
  for (const spawn of wave.spawns) longest = Math.max(longest, spawn.delaySeconds)
  return longest + secondsToKill * wave.spawns.length
}
