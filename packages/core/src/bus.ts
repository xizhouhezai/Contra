import { err, ok, type Result } from './result.js'

/** A listener invoked for every emitted event of its type. */
export type Listener<T> = (payload: T) => void

/**
 * A tiny strongly-typed event bus. Listener failures are captured rather than
 * thrown so one broken subscriber cannot break the publisher.
 */
export class EventBus<Events extends object> {
  readonly #listeners = new Map<keyof Events, Set<Listener<never>>>()

  /** Registers a listener for an event. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let bucket = this.#listeners.get(event)
    if (!bucket) {
      bucket = new Set()
      this.#listeners.set(event, bucket)
    }
    bucket.add(listener as Listener<never>)

    return () => {
      this.off(event, listener)
    }
  }

  /** Removes a previously registered listener. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.#listeners.get(event)?.delete(listener as Listener<never>)
  }

  /** Emits an event, returning the number of listeners that were invoked. */
  emit<K extends keyof Events>(event: K, payload: Events[K]): number {
    const bucket = this.#listeners.get(event)
    if (!bucket || bucket.size === 0) return 0

    let delivered = 0
    for (const listener of bucket) {
      try {
        ;(listener as Listener<Events[K]>)(payload)
        delivered += 1
      } catch {
        // A failing subscriber must not break the publisher.
      }
    }
    return delivered
  }

  /** Emits an event and reports whether every listener succeeded. */
  emitChecked<K extends keyof Events>(event: K, payload: Events[K]): Result<number, Error> {
    try {
      return ok(this.emit(event, payload))
    } catch (cause) {
      return err(cause instanceof Error ? cause : new Error(String(cause)))
    }
  }
}
