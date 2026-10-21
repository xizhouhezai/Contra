/**
 * Object pool for short-lived entities.
 *
 * Source of truth: docs/game/requirements/nonfunctional.md - REQ-NFR-007.
 *
 * The point is not speed but stability: a run that allocates a bullet every shot
 * hands the collector a new object 360 times a second, and a long stage pays for
 * that in frame spikes. Reusing instances keeps the steady state flat.
 */

export interface Poolable {
  /** True while the instance is handed out. */
  active: boolean
}

export interface PoolOptions<T> {
  /** Allocates a fresh instance; called only when the free list is empty. */
  readonly create: () => T
  /** Resets an instance before it is reused. */
  readonly reset?: (item: T) => void
  /** Instances allocated up front. */
  readonly initialSize?: number
}

/**
 * A fixed-growth pool.
 *
 * The pool never shrinks, and it only grows when a caller asks for an instance
 * while the free list is empty - so a stage whose peak load has been reached
 * performs no allocation at all afterwards.
 */
export class ObjectPool<T extends Poolable> {
  private readonly free: T[] = []
  private readonly options: PoolOptions<T>
  private created = 0
  private peak = 0
  private activeCount = 0

  constructor(options: PoolOptions<T>) {
    this.options = options
    const initial = options.initialSize ?? 0
    for (let i = 0; i < initial; i += 1) {
      this.free.push(this.allocate())
    }
  }

  /** Total instances ever allocated. Flat is the goal. */
  get createdCount(): number {
    return this.created
  }

  /** High-water mark of simultaneously active instances. */
  get peakActive(): number {
    return this.peak
  }

  /** Instances currently available for reuse. */
  get freeCount(): number {
    return this.free.length
  }

  private allocate(): T {
    this.created += 1
    const item = this.options.create()
    item.active = false
    return item
  }

  /** Takes an instance, growing the pool only when nothing is free. */
  acquire(): T {
    let item = this.free.pop()
    if (item === undefined) item = this.allocate()

    item.active = true
    // Count handed-out instances directly; deriving it from created minus free
    // drifts as soon as one instance is released twice.
    this.activeCount += 1
    if (this.activeCount > this.peak) this.peak = this.activeCount
    return item
  }

  /** Returns an instance for reuse. Returns false if it was already free. */
  release(item: T): boolean {
    // An instance already in the free list must not be released again, or it
    // would be handed out twice and two callers would share one object.
    if (this.free.includes(item)) return false
    item.active = false
    this.activeCount = Math.max(0, this.activeCount - 1)
    this.options.reset?.(item)
    this.free.push(item)
    return true
  }

  /** Releases everything, for a stage change. */
  releaseAll(items: readonly T[]): void {
    for (const item of items) this.release(item)
  }
}
