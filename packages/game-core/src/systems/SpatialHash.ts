/**
 * Spatial hash for broad-phase collision.
 *
 * Source of truth: docs/game/design/modules.md - collision. Buckets are 64x64,
 * matching the tile size the stage spec uses, so a query touches at most four
 * buckets for a player-sized box.
 */
import type { Rect } from '../data/types.js'

/** Bucket edge length in pixels. */
export const CELL_SIZE = 64

/** Anything the hash can index; the caller keeps the payload. */
export interface SpatialEntry<T> {
  readonly id: string
  readonly rect: Rect
  readonly value: T
}

/** Returns the bucket coordinates covering a rect's top-left and bottom-right. */
export function cellRange(rect: Rect): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.floor(rect.x / CELL_SIZE),
    minY: Math.floor(rect.y / CELL_SIZE),
    maxX: Math.floor((rect.x + rect.width) / CELL_SIZE),
    maxY: Math.floor((rect.y + rect.height) / CELL_SIZE),
  }
}

function cellKey(cx: number, cy: number): string {
  return `${cx}:${cy}`
}

/**
 * A grid of buckets keyed by cell coordinate.
 *
 * Insert cost is proportional to how many cells an entry spans, which for
 * game-sized entities is one or two. Query cost is proportional to how many
 * entries the overlapping cells hold, never to the total entity count.
 */
export class SpatialHash<T> {
  private readonly cells = new Map<string, SpatialEntry<T>[]>()

  get size(): number {
    let total = 0
    for (const bucket of this.cells.values()) total += bucket.length
    return total
  }

  clear(): void {
    this.cells.clear()
  }

  insert(entry: SpatialEntry<T>): void {
    const range = cellRange(entry.rect)
    for (let cy = range.minY; cy <= range.maxY; cy += 1) {
      for (let cx = range.minX; cx <= range.maxX; cx += 1) {
        const key = cellKey(cx, cy)
        const bucket = this.cells.get(key)
        if (bucket === undefined) this.cells.set(key, [entry])
        else bucket.push(entry)
      }
    }
  }

  /**
   * Every entry in the cells the rect overlaps.
   *
   * The result may contain the same entry twice when it spans several cells, so
   * callers dedupe by id; that is cheaper than deduping on every insert.
   */
  query(rect: Rect): SpatialEntry<T>[] {
    const range = cellRange(rect)
    const out: SpatialEntry<T>[] = []
    for (let cy = range.minY; cy <= range.maxY; cy += 1) {
      for (let cx = range.minX; cx <= range.maxX; cx += 1) {
        const bucket = this.cells.get(cellKey(cx, cy))
        if (bucket !== undefined) out.push(...bucket)
      }
    }
    return out
  }

  /** Query with duplicates removed, preserving first-seen order. */
  queryUnique(rect: Rect): SpatialEntry<T>[] {
    const seen = new Set<string>()
    const out: SpatialEntry<T>[] = []
    for (const entry of this.query(rect)) {
      if (seen.has(entry.id)) continue
      seen.add(entry.id)
      out.push(entry)
    }
    return out
  }
}
