/**
 * Rule-layer event model.
 *
 * The rule layer never calls the presentation layer: it emits these events and the
 * presentation layer subscribes to them (docs/game/design/architecture.md §事件驱动).
 */
import type { BossId, EntityId, Vec2, WeaponId } from './data/types.js'

/** A weapon fired; the presentation layer spawns the muzzle flash and the sound. */
export interface ShotEvent {
  readonly type: 'shot'
  readonly weaponId: WeaponId
  readonly position: Vec2
  readonly direction: Vec2
}

/** Damage was applied to any entity. */
export interface HitEvent {
  readonly type: 'hit'
  readonly targetId: EntityId
  readonly damage: number
  readonly position: Vec2
}

/** An enemy died; the score delta is already resolved by the rule layer. */
export interface EnemyDiedEvent {
  readonly type: 'enemyDied'
  readonly enemyId: EntityId
  readonly position: Vec2
  readonly score: number
}

/** The player lost one heart and entered invulnerability. */
export interface PlayerHurtEvent {
  readonly type: 'playerHurt'
  readonly heartsLeft: number
  readonly position: Vec2
}

/** The player's hearts reached zero. */
export interface PlayerDiedEvent {
  readonly type: 'playerDied'
  readonly position: Vec2
}

/** A weapon replaced the weapon in the given slot. */
export interface WeaponPickedEvent {
  readonly type: 'weaponPicked'
  readonly weaponId: WeaponId
  readonly slot: number
}

/** A blast with the given radius was spawned. */
export interface ExplosionEvent {
  readonly type: 'explosion'
  readonly position: Vec2
  readonly radius: number
}

/** A boss crossed an HP threshold and entered the next phase. */
export interface BossPhaseChangedEvent {
  readonly type: 'bossPhaseChanged'
  readonly bossId: BossId
  readonly phase: number
}

/** The stage exit was reached; carries the final score of the run. */
export interface StageClearedEvent {
  readonly type: 'stageCleared'
  readonly score: number
}

/** Everything the rule layer reports to the presentation layer. */
export type CoreEvent =
  | ShotEvent
  | HitEvent
  | EnemyDiedEvent
  | PlayerHurtEvent
  | PlayerDiedEvent
  | WeaponPickedEvent
  | ExplosionEvent
  | BossPhaseChangedEvent
  | StageClearedEvent

/** Discriminant values of {@link CoreEvent}. */
export type CoreEventType = CoreEvent['type']
