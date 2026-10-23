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

/**
 * A rect a live entity carries around.
 *
 * A target used to be a static box, so a plain Rect said exactly that. Once an
 * enemy walks, its position has to change in place: rebuilding the box every step
 * would break every holder of a reference to it, and the size never changes
 * anyway. The shape therefore stays a Rect - readers are unaffected - and only
 * the two coordinates become writable.
 */
export interface MutableRect {
  x: number
  y: number
  readonly width: number
  readonly height: number
}

/** Mutable rule-layer state of one target. */
export interface TargetState {
  readonly id: EntityId
  /**
   * The body, in world pixels.
   *
   * Written by the World's motion step and read by everything else: collision,
   * homing, blasts and the renderer all resolve against wherever the enemy is
   * standing now.
   */
  readonly box: MutableRect
  readonly score: number
  /**
   * Which archetype this box is.
   *
   * The comment above says the rule layer does not care, and that was true while
   * an enemy was a static box that could only hurt by being touched. It stopped
   * being true when enemies learned to shoot: the archetype now decides which
   * weapon fires and when. It stays optional, so a graybox target with no
   * archetype is inert rather than an error.
   */
  readonly archetype?: string
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
    ...(definition.archetype === undefined ? {} : { archetype: definition.archetype }),
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
