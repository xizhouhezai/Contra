import type { EntityId, Rect } from '../data/types.js'

/** A gray-box target definition: a static box that absorbs bullets (T-M0-07). */
export interface TargetDefinition extends Rect {
  readonly id: EntityId
  readonly hp: number
  readonly score: number
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
