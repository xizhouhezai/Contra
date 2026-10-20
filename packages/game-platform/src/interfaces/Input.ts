import type { InputState } from '@contra/game-core'

/**
 * Where the rule layer gets its per-frame input (docs/game/design/modules.md §适配层接口).
 *
 * The rule layer only ever sees {@link InputState}; translating devices into it is
 * the platform layer's job, which is what keeps game-core free of DOM types.
 */
export interface InputSource {
  /** Snapshot of the input for the frame about to be simulated. */
  poll(): InputState
  dispose(): void
}
