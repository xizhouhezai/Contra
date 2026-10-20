import type { HapticPattern, Haptics } from '../interfaces/Haptics.js'

/** Duration in milliseconds per intensity. */
const PATTERN_MS: Record<HapticPattern, number> = { light: 10, medium: 25, heavy: 60 }

/** The `navigator.vibrate` surface the adapter needs. */
export type Vibrate = (durationMs: number) => boolean

/** {@link Haptics} over the Vibration API; silent when the platform lacks it. */
export class VibrationHaptics implements Haptics {
  private readonly vibrate: Vibrate | null

  constructor(vibrate: Vibrate | null) {
    this.vibrate = vibrate
  }

  /** Wraps `navigator.vibrate` when the browser exposes it. */
  static fromGlobal(): VibrationHaptics {
    const nav = (globalThis as { navigator?: { vibrate?: Vibrate } }).navigator
    const candidate = nav?.vibrate
    if (nav === undefined || typeof candidate !== 'function') return new VibrationHaptics(null)
    return new VibrationHaptics(candidate.bind(nav))
  }

  pulse(pattern: HapticPattern): void {
    this.vibrate?.(PATTERN_MS[pattern])
  }
}
