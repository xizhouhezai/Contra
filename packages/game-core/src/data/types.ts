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

/**
 * The mid-stage bosses.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.4 and
 * docs/game/design/stage-art-prompts-batch1.md §6.
 *
 * A stage used to have at most one fight, at the door, so a ten minute stage had
 * nothing to hold the middle of it: the player walked from one end to the other
 * and the only body that could stop them was the one guarding the exit. A
 * miniboss is the same phase machine as a stage boss placed at a point along the
 * route instead, and it gates the way forward until it is down.
 *
 * The ids match the art filenames one for one (`miniboss-dock-foreman-q-01.webp`
 * and so on), so the presentation layer resolves them with the same lookup the
 * stage bosses use. Acts II and III are drawn placeholders for now - see
 * scripts/generate-acts23-minibosses.py - but the shape and the naming are what
 * the real art will reuse, so swapping it in is a texture change.
 */
export type MinibossId =
  // Act I - the yard, the corridor, the scaffolding, the audit hall.
  | 'miniboss-dock-foreman'
  | 'miniboss-pipe-warden'
  | 'miniboss-scaffold-crane'
  | 'miniboss-audit-clerk'
  // Act II - the coolant gallery, the server hall, the forge, the rewriting room.
  | 'miniboss-coolant-overseer'
  | 'miniboss-array-warden'
  | 'miniboss-forge-master'
  | 'miniboss-redline-clerk'
  // Act III - the collapsing archive, the mirror gallery, the shaft, emergence.
  | 'miniboss-archive-keeper'
  | 'miniboss-mirror-lieutenant'
  | 'miniboss-shaft-gaoler'
  | 'miniboss-emergence-herald'

/**
 * Anything the boss director can run.
 *
 * Named separately from BossId because the two are placed differently - a stage
 * boss stands at the exit arena, a miniboss stands where its trigger is - but
 * they share one definition shape, one phase machine and one set of events. The
 * distinction that matters to the rest of the code is "is this the fight that
 * guards the door", which is BossId, not "is this a director fight", which is
 * this.
 */
export type FightId = BossId | MinibossId

/** Enemy archetypes, one per behaviour in data/enemies.ts. */
export type EnemyId =
  | 'patrol'
  | 'turret'
  | 'carrier'
  | 'charger'
  | 'flyer'
  | 'warden'
  | 'armored'
  | 'forge'
  | 'mirror'
  | 'elite-charger'
  /**
   * Act I's four expansion enemies, from
   * docs/game/design/stage-art-prompts-batch1.md §3.
   *
   * They exist as archetypes rather than as anonymous boxes because an archetype
   * is what decides whether an enemy moves, what it fires and how long it warns
   * first - a target with an id nothing knows is an inert rectangle, which is
   * exactly what stage 2's first draft of these four would have been.
   */
  | 'scrapper'
  | 'crane-hook'
  | 'steam-vent'
  | 'audit-drone'

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
  /**
   * Free aim vector (REQ-GUN-002).
   *
   * Optional so every existing caller keeps working: when absent the aim is
   * derived from moveX/moveY exactly as before, which is the eight-direction
   * behaviour the twelve stages were balanced against. When present it wins,
   * and its components may be any value in -1..1 - that is what lets a mouse or
   * a right stick point between the eight directions.
   */
  readonly aim?: { readonly x: number; readonly y: number }
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

/** How a weapon delivers its damage (docs/game/design/data-model.md §武器数据). */
export type WeaponKind = 'projectile' | 'beam' | 'throwable'

/**
 * One weapon in the shared four-slot pool (docs/game/design/data-model.md §武器数据).
 *
 * Values come from GDD §3.2 武器数值 and are never re-derived in the systems: a
 * balance pass edits data/weapons.ts alone.
 */
export interface WeaponDefinition {
  readonly id: WeaponId
  readonly name: string
  readonly kind: WeaponKind
  /** Damage per projectile, or per beam tick for `beam`. */
  readonly damage: number
  readonly shotsPerSecond: number
  /** Muzzle speed in px/s. Thrown weapons carry their horizontal launch speed. */
  readonly projectileSpeed: number
  /** Projectiles per trigger pull; `0` for beam weapons, which fire no projectile. */
  readonly projectileCount: number
  /** Shots before the slot empties; `Number.POSITIVE_INFINITY` for the fallback weapon. */
  readonly ammo: number
  /** Total cone in degrees at full spread accumulation; `0` for weapons that never fan. */
  readonly spreadDeg: number
  /**
   * Extra targets a projectile passes through. Prism spends this as "hits 3 targets
   * at once", pierce as "穿透 1 个" — both are the same pass-through rule.
   */
  readonly pierceCount: number
  readonly homing: boolean
  /** Steering rate in rad/s; `0` for weapons that never steer. */
  readonly homingTurnRate: number
  readonly rarity: 'basic' | 'common' | 'rare' | 'epic'
}
