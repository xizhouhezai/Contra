import type { Rect } from '../data/types.js'

/** Axis-aligned overlap test; half-open, so touching edges never count as overlap. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * Distance along a ray to the first face of \`box\`, or null when it misses.
 *
 * Slab method: each axis narrows the interval of t for which the ray is inside
 * the box, and an empty interval means the ray never reaches it. Used by beam
 * weapons, which hit instantly and therefore cannot rely on a swept projectile.
 */
export function rayBoxDistance(
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  box: Rect,
): number | null {
  const inverseX = direction.x === 0 ? Number.POSITIVE_INFINITY : 1 / direction.x
  const inverseY = direction.y === 0 ? Number.POSITIVE_INFINITY : 1 / direction.y

  let near = 0
  let far = Number.POSITIVE_INFINITY

  for (const axis of ['x', 'y'] as const) {
    const inverse = axis === 'x' ? inverseX : inverseY
    const start = axis === 'x' ? origin.x : origin.y
    const low = axis === 'x' ? box.x : box.y
    const high = low + (axis === 'x' ? box.width : box.height)

    if (!Number.isFinite(inverse)) {
      if (start < low || start > high) return null
      continue
    }

    const first = (low - start) * inverse
    const second = (high - start) * inverse
    near = Math.max(near, Math.min(first, second))
    far = Math.min(far, Math.max(first, second))
    if (near > far) return null
  }

  return near
}
