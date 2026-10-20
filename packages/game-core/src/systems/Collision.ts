import type { Rect } from '../data/types.js'

/** Axis-aligned overlap test; half-open, so touching edges never count as overlap. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
