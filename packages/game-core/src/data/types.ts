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

/** A vector whose components the simulation mutates in place. */
export interface MutableVec2 {
  x: number
  y: number
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

/**
 * The only input shape the rule layer sees (docs/game/design/modules.md §适配层接口).
 *
 * moveX/moveY do double duty: they drive movement on X and the eight aim
 * directions. Aim is therefore derived from the input alone and never from the
 * player velocity, which is what keeps aiming decoupled from running.
 */
export interface InputState {
  readonly moveX: -1 | 0 | 1
  readonly moveY: -1 | 0 | 1
  readonly jump: boolean
  readonly fire: boolean
  readonly bomb: boolean
}

/** Axis-aligned box in world space, top-left origin, y pointing down. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** A collision platform (docs/game/design/data-model.md §关卡数据). */
export type PlatformDefinition = Rect
