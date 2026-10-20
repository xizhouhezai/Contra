/**
 * App lifecycle (docs/game/design/modules.md §适配层接口).
 *
 * The native build freezes the rule layer when it goes to the background; the
 * browser build maps this to visibility changes.
 */
export interface Lifecycle {
  onPause(cb: () => void): void
  onResume(cb: () => void): void
}
