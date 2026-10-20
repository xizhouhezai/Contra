/** Haptic intensities a device may support. */
export type HapticPattern = 'light' | 'medium' | 'heavy'

/** Touch feedback (docs/game/design/modules.md §适配层接口). Web may no-op. */
export interface Haptics {
  pulse(pattern: HapticPattern): void
}
