import type { Storage } from '../interfaces/Storage.js'

/** The subset of the Web Storage API this adapter needs. */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

/**
 * {@link Storage} over `localStorage`.
 *
 * Access can throw (private mode, quota, disabled storage), so every call is
 * guarded and degrades to a memory fallback rather than breaking the game.
 */
export class LocalStorageAdapter implements Storage {
  private readonly backend: StorageBackend | null
  private readonly fallback = new Map<string, string>()

  constructor(backend: StorageBackend | null) {
    this.backend = backend
  }

  /** Builds an adapter over `globalThis.localStorage`, or memory-only if absent. */
  static fromGlobal(): LocalStorageAdapter {
    try {
      const candidate = (globalThis as { localStorage?: StorageBackend }).localStorage
      return new LocalStorageAdapter(candidate ?? null)
    } catch {
      return new LocalStorageAdapter(null)
    }
  }

  get(key: string): string | null {
    if (this.backend === null) return this.fallback.get(key) ?? null
    try {
      return this.backend.getItem(key)
    } catch {
      return this.fallback.get(key) ?? null
    }
  }

  set(key: string, value: string): void {
    this.fallback.set(key, value)
    if (this.backend === null) return
    try {
      this.backend.setItem(key, value)
    } catch {
      // Quota or disabled storage: the memory copy keeps the session playable.
    }
  }

  remove(key: string): void {
    this.fallback.delete(key)
    if (this.backend === null) return
    try {
      this.backend.removeItem(key)
    } catch {
      // Nothing to recover from: the key is already gone from the fallback.
    }
  }

  clear(): void {
    this.fallback.clear()
    if (this.backend === null) return
    try {
      this.backend.clear()
    } catch {
      // See remove().
    }
  }
}
