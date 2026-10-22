import type { EntityId, Rect } from '../data/types.js'

/** A gray-box target definition: a static box that absorbs bullets (T-M0-07). */
export interface TargetDefinition extends Rect {
  readonly id: EntityId
  readonly hp: number
  readonly score: number
  /**
   * Which enemy archetype to draw, if any.
   *
   * Optional and explicit rather than parsed out of the id. The ids in the
   * stage data are not reliably archetype-prefixed - stage 1 calls its targets
   * t1, t2, t3 while stage 10 calls them mirror-1, mirror-2 - so a renderer
   * that split on '-' drew the wrong enemy, or the placeholder, for most
   * stages. The rule layer does not care which archetype a box is; only the
   * presentation layer does, which is why this is a hint and not behaviour.
   */
  readonly archetype?: string
}

/** Mutable rule-layer state of one target. */
export interface TargetState {
  readonly id: EntityId
  readonly box: Rect
  readonly score: number
  hp: number
  alive: boolean
}

export function createTarget(definition: TargetDefinition): TargetState {
  return {
    id: definition.id,
    box: {
      x: definition.x,
      y: definition.y,
      width: definition.width,
      height: definition.height,
    },
    score: definition.score,
    hp: definition.hp,
    alive: true,
  }
}

/** Applies damage; returns true when this hit destroyed the target. */
export function damageTarget(target: TargetState, damage: number): boolean {
  if (!target.alive) return false
  target.hp = Math.max(0, target.hp - damage)
  if (target.hp > 0) return false
  target.alive = false
  return true
}
