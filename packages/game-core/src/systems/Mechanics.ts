/**
 * Stage mechanics.
 *
 * Source of truth: docs/game/requirements/stages.md - 机制.
 *
 * Reflection is pure arithmetic on a velocity vector, so it lives here rather
 * than in the World: the World asks "does this bullet hit a wall" and "where does
 * it go", and never carries the maths itself.
 */
import type { Rect, Vec2 } from '../data/types.js'

/**
 * Which side of a wall a moving box met first.
 *
 * Chosen by comparing how far the box travelled into each axis: the axis with
 * the smaller penetration is the one that was crossed last, and is therefore the
 * face that was hit.
 */
export type WallFace = 'left' | 'right' | 'top' | 'bottom'

/** True when the two rectangles overlap. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * The face of `wall` that `box` most likely struck.
 *
 * Used to decide which velocity component to flip: a near-horizontal approach
 * reflects on x, a near-vertical one on y.
 */
export function struckFace(box: Rect, wall: Rect): WallFace {
  const overlapLeft = box.x + box.width - wall.x
  const overlapRight = wall.x + wall.width - box.x
  const overlapTop = box.y + box.height - wall.y
  const overlapBottom = wall.y + wall.height - box.y
  const smallest = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

  if (smallest === overlapLeft) return 'left'
  if (smallest === overlapRight) return 'right'
  if (smallest === overlapTop) return 'top'
  return 'bottom'
}

/**
 * Reflects a velocity off a wall face.
 *
 * A side face flips x, a cap face flips y - the specular rule for an
 * axis-aligned mirror. The magnitude is preserved, so a bullet keeps its speed
 * across the bounce.
 */
export function reflectVelocity(velocity: Vec2, face: WallFace): Vec2 {
  return face === 'left' || face === 'right'
    ? { x: -velocity.x, y: velocity.y }
    : { x: velocity.x, y: -velocity.y }
}

/**
 * Bounces a box off any wall it overlaps, returning the new velocity.
 *
 * Only the first wall in the list is applied: a bullet wedged between two walls
 * would otherwise flip twice and continue as if nothing happened.
 */
export function bounceOffWalls(
  box: Rect,
  velocity: Vec2,
  walls: readonly Rect[],
): { readonly velocity: Vec2; readonly bounced: boolean } {
  for (const wall of walls) {
    if (!overlaps(box, wall)) continue
    return { velocity: reflectVelocity(velocity, struckFace(box, wall)), bounced: true }
  }
  return { velocity, bounced: false }
}

/**
 * Whether a platform is one-way (can be jumped through from below).
 *
 * A one-way platform is a thin plank: the player passes upward through it and
 * lands on it when falling.
 */
export function isOneWay(platform: Rect): boolean {
  return platform.height <= 20
}

/**
 * Whether a falling body at `previousBottom` should land on `platform`.
 *
 * Landing requires three things: the body is above the platform's top before the
 * step, it is not above it after, and the horizontal ranges overlap. Checking the
 * previous position is what stops a fast faller from tunnelling through a thin
 * plank.
 */
export function shouldLand(
  previousBottom: number,
  currentBottom: number,
  bodyX: number,
  bodyWidth: number,
  platform: Rect,
): boolean {
  if (previousBottom > platform.y) return false
  if (currentBottom < platform.y) return false
  return bodyX < platform.x + platform.width && bodyX + bodyWidth > platform.x
}
