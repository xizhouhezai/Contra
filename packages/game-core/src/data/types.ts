/**
 * Baseline data types for the gameplay rule layer.
 *
 * Source of truth: docs/game/design/data-model.md §基础类型.
 * This package is pure TypeScript: no DOM, no Phaser, no third-party imports (ADR-0003).
 */

/** A point or vector in world space, measured in pixels. */
export interface Vec2 {
  readonly x: number
  readonly y: number
}

/** Stable identifier for any runtime entity (player, enemy, bullet, pickup). */
export type EntityId = string

/** Player-selectable difficulty; it changes damage and density, never stage layout. */
export type Difficulty = 'casual' | 'standard' | 'hardcore'

/** The ten weapons in the shared four-slot pool. */
export type WeaponId =
  | 'pulse'
  | 'scatter'
  | 'rifle'
  | 'homing'
  | 'pierce'
  | 'cluster'
  | 'laser'
  | 'grenade'
  | 'replay'
  | 'prism'

/** The six playable characters. */
export type CharacterId = 'deepseek' | 'qwen' | 'doubao' | 'glm' | 'kimi' | 'gemini'

/** The four boss forms: Claude and GPT with two forms each. */
export type BossId = 'claude-auditor' | 'claude-rewriter' | 'gpt-corpus' | 'gpt-emergent'

/** Stage mechanics introduced across the campaign. */
export type MechanicId =
  | 'bounce-wall'
  | 'platforming'
  | 'tracking-enemy'
  | 'flying-enemy'
  | 'armored-enemy'
  | 'breakable-terrain'
  | 'moving-platform'
  | 'vertical-scroll'
