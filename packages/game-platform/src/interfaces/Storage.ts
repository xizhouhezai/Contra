/** Key/value persistence (docs/game/design/modules.md §适配层接口). */
export interface Storage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
  clear(): void
}
