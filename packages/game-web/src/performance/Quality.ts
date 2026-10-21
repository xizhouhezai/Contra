/**
 * Render quality tiers (T-M5-02).
 *
 * Source of truth: docs/game/requirements/nonfunctional.md REQ-NFR-001.
 *
 * The rule that makes this safe: quality only ever changes the presentation
 * layer. The simulation runs at a fixed 1/60 step regardless of tier, so a
 * player on the low setting sees fewer particles but plays exactly the same
 * game - the same leaps, the same hit windows, the same outcome.
 */

export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  readonly tier: QualityTier
  /** Maximum simultaneous particles. */
  readonly maxParticles: number
  /** How many parallax layers to draw (of the four that exist). */
  readonly parallaxLayers: number
  /** Whether to draw soft shadows under actors. */
  readonly shadows: boolean
  /** Whether screen shake and flash effects run. */
  readonly screenEffects: boolean
  /** Cap on device pixel ratio; above 2 costs a lot for little gain. */
  readonly maxPixelRatio: number
}

export const QUALITY: Readonly<Record<QualityTier, QualitySettings>> = {
  high: {
    tier: 'high',
    maxParticles: 400,
    parallaxLayers: 4,
    shadows: true,
    screenEffects: true,
    maxPixelRatio: 2,
  },
  medium: {
    tier: 'medium',
    maxParticles: 150,
    parallaxLayers: 3,
    shadows: false,
    screenEffects: true,
    maxPixelRatio: 1.5,
  },
  low: {
    tier: 'low',
    maxParticles: 50,
    parallaxLayers: 2,
    shadows: false,
    screenEffects: false,
    maxPixelRatio: 1,
  },
}

/**
 * Picks a starting tier from what the device reports.
 *
 * Deliberately conservative: a phone reporting a high pixel ratio is exactly the
 * device most likely to stutter, so ratio alone cannot earn the high tier - the
 * core count has to agree.
 */
export function detectTier(devicePixelRatio: number, hardwareConcurrency: number): QualityTier {
  if (devicePixelRatio >= 3 || hardwareConcurrency <= 2) return 'low'
  if (hardwareConcurrency <= 4) return 'medium'
  return 'high'
}

export interface FpsSample {
  readonly averageFps: number
}

/**
 * Whether measured performance justifies dropping a tier.
 *
 * One bad frame is not a reason to degrade - a stage transition produces one.
 * The threshold is sustained sub-45fps, which is where a player starts feeling
 * the stutter rather than merely being able to measure it.
 */
export function shouldDowngrade(sample: FpsSample): boolean {
  return sample.averageFps < 45
}

export function nextTierDown(tier: QualityTier): QualityTier {
  if (tier === 'high') return 'medium'
  return 'low'
}

/**
 * Resolves the settings to use.
 *
 * A manual choice always wins over detection: a player who set low because the
 * game felt choppy should not be overruled by a benchmark on the next launch.
 */
export function resolveQuality(auto: QualityTier, manual: QualityTier | null): QualitySettings {
  return QUALITY[manual ?? auto]
}
