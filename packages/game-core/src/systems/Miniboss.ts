/**
 * Staging for act I's mid-stage bosses.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.4.
 *
 * A stage used to have at most one fight, at the door. The expansion turns a
 * stage into ten minutes, and ten minutes with a single body at the end is a
 * corridor: the only thing that can stop the player is the exit guard, so
 * everything between the spawn and the door is scenery with enemies standing in
 * it.
 *
 * A miniboss fixes that by placing a second fight at a point along the route.
 * It is not a new kind of thing - it runs the same BossDirector machine, emits
 * the same three events and draws from the same portrait lookup - so this module
 * only owns the two questions the director does not answer: *where* the fight
 * starts, and *whether the way onward is open yet*.
 *
 * The module is pure. World owns the runtime state and does the spawning.
 */
import type { MinibossId, Rect } from '../data/types.js'
import { overlaps } from './Mechanics.js'

/** One fight, placed on the route. */
export interface MinibossPlacement {
  /** Identifies this placement within the stage; unique per stage. */
  readonly id: string
  readonly minibossId: MinibossId
  /** Player box overlapping this region starts the fight. */
  readonly trigger: Rect
  /** World x of the boss's centre. */
  readonly x: number
  /** World y of the boss's feet. */
  readonly y: number
  /**
   * Whether finishing this fight is required to leave the stage.
   *
   * True for every act I miniboss: a fight the player can walk around is a fight
   * the stage did not need to author, and the whole point of placing one mid-stage
   * is that it holds the middle of the stage rather than decorating it.
   */
  readonly gates: boolean
}

/** How far one placement has got. */
export interface MinibossStaging {
  /** True once the trigger has been touched and the fight exists. */
  fired: boolean
  /** True once the fight is over. */
  cleared: boolean
}

export function createMinibossStaging(): MinibossStaging {
  return { fired: false, cleared: false }
}

/** Whether this placement's trigger contains the player. */
export function minibossTriggered(placement: MinibossPlacement, player: Rect): boolean {
  return overlaps(placement.trigger, player)
}

/**
 * Whether a set of minibosses lets the player through.
 *
 * A gating fight blocks until it is cleared - including before it has started.
 * That is not an oversight: the trigger spans the corridor, so "not fired yet"
 * means "the player has not reached this point", and a player who has not reached
 * this point cannot be standing at the exit either. Requiring it up front also
 * removes the one hole this could otherwise have, which is a route that is open
 * until the moment a fight starts and closed again afterwards.
 */
export function minibossRouteOpen(
  placements: readonly MinibossPlacement[],
  states: ReadonlyMap<string, MinibossStaging>,
): boolean {
  for (const placement of placements) {
    if (!placement.gates) continue
    const state = states.get(placement.id)
    if (state === undefined) return false
    if (!state.cleared) return false
  }
  return true
}

/**
 * Total time a stage's minibosses are expected to take, for pacing checks.
 *
 * Same shape as waveSeconds and for the same reason: the expansion's ten minute
 * budget is a claim, and a stage whose fights do not add up to it cannot be said
 * to meet it.
 */
export function minibossSeconds(
  placements: readonly MinibossPlacement[],
  secondsToKill: number,
): number {
  return placements.filter((placement) => placement.gates).length * secondsToKill
}
