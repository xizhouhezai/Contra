import type { ProgressStorage } from '@contra/game-core'
import type { AccessibilityOptions } from '../accessibility/options'
import { DEFAULT_ACCESSIBILITY } from '../accessibility/options'
import type { QualityTier } from '../performance/Quality'

/**
 * Player settings (T-M5-03).
 *
 * Persisted through the same storage port progress uses, so settings travel
 * with a save rather than living in a second place that can drift from it.
 */

const KEY = 'contra.settings.v1'

export interface GameSettings {
  readonly masterVolume: number
  readonly sfxVolume: number
  readonly difficulty: 'casual' | 'standard' | 'hardcore'
  /** null means "decide from the device", which is the default. */
  readonly quality: QualityTier | null
  readonly accessibility: AccessibilityOptions
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.7,
  difficulty: 'standard',
  quality: null,
  accessibility: DEFAULT_ACCESSIBILITY,
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Reads settings, falling back to defaults when absent or unreadable.
 *
 * A corrupted settings blob must not stop the game starting - the same rule
 * progress follows, for the same reason.
 */
export function loadSettings(storage: ProgressStorage): GameSettings {
  const raw = storage.get(KEY)
  if (raw === null) return DEFAULT_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return {
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
      difficulty: parsed.difficulty ?? DEFAULT_SETTINGS.difficulty,
      quality: parsed.quality ?? null,
      accessibility: { ...DEFAULT_ACCESSIBILITY, ...parsed.accessibility },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(storage: ProgressStorage, settings: GameSettings): void {
  storage.set(
    KEY,
    JSON.stringify({
      ...settings,
      masterVolume: clamp01(settings.masterVolume),
      sfxVolume: clamp01(settings.sfxVolume),
    }),
  )
}

export function resetSettings(storage: ProgressStorage): GameSettings {
  storage.remove(KEY)
  return DEFAULT_SETTINGS
}
