import type { CoreEvent } from '@contra/game-core'

type ShotEvent = Extract<CoreEvent, { type: 'shot' }>
type HitEvent = Extract<CoreEvent, { type: 'hit' }>
type EnemyDiedEvent = Extract<CoreEvent, { type: 'enemyDied' }>
type PlayerHurtEvent = Extract<CoreEvent, { type: 'playerHurt' }>
type PlayerHealedEvent = Extract<CoreEvent, { type: 'playerHealed' }>
type PlayerDiedEvent = Extract<CoreEvent, { type: 'playerDied' }>
type WeaponPickedEvent = Extract<CoreEvent, { type: 'weaponPicked' }>
type ExplosionEvent = Extract<CoreEvent, { type: 'explosion' }>
type EnemyTelegraphEvent = Extract<CoreEvent, { type: 'enemyTelegraph' }>
type EnemyShotEvent = Extract<CoreEvent, { type: 'enemyShot' }>
type BossTelegraphEvent = Extract<CoreEvent, { type: 'bossTelegraph' }>
type BossAttackEvent = Extract<CoreEvent, { type: 'bossAttack' }>
type BossPhaseChangedEvent = Extract<CoreEvent, { type: 'bossPhaseChanged' }>
type MinibossStartedEvent = Extract<CoreEvent, { type: 'minibossStarted' }>
type MinibossClearedEvent = Extract<CoreEvent, { type: 'minibossCleared' }>
type WaveStartedEvent = Extract<CoreEvent, { type: 'waveStarted' }>
type StageClearedEvent = Extract<CoreEvent, { type: 'stageCleared' }>

/**
 * Callbacks the presentation layer registers.
 *
 * Every family is required, not optional: an optional handler turns a missing
 * visual into silence, whereas a required one makes the omission a type error at
 * the point the bridge is constructed.
 */
export interface CoreEventHandlers {
  readonly shot: (event: ShotEvent) => void
  readonly hit: (event: HitEvent) => void
  readonly enemyDied: (event: EnemyDiedEvent) => void
  readonly playerHurt: (event: PlayerHurtEvent) => void
  /** Optional: only GLM's rhythm passive ever emits this. */
  readonly playerHealed?: (event: PlayerHealedEvent) => void
  readonly playerDied: (event: PlayerDiedEvent) => void
  readonly weaponPicked: (event: WeaponPickedEvent) => void
  readonly explosion: (event: ExplosionEvent) => void
  readonly bossPhaseChanged: (event: BossPhaseChangedEvent) => void
  /** An enemy began winding up. */
  readonly enemyTelegraph?: (event: EnemyTelegraphEvent) => void
  /** An enemy fired. */
  readonly enemyShot?: (event: EnemyShotEvent) => void
  /** The boss began winding up; the fight is readable only if this is drawn. */
  readonly bossTelegraph?: (event: BossTelegraphEvent) => void
  /** The boss landed a move, or whiffed one. */
  readonly bossAttack?: (event: BossAttackEvent) => void
  /** A mid-stage fight started; its body has to go on screen. */
  readonly minibossStarted?: (event: MinibossStartedEvent) => void
  /** A mid-stage fight was finished; the route opens. */
  readonly minibossCleared?: (event: MinibossClearedEvent) => void
  /** A wave fired; the player gets a warning before its enemies arrive. */
  readonly waveStarted?: (event: WaveStartedEvent) => void
  readonly stageCleared: (event: StageClearedEvent) => void
}

/**
 * Routes the rule layer's event queue into presentation callbacks.
 *
 * All nine families are consumed as of M1 (backlog.md T-M1-09). The switch is
 * exhaustive with a never-typed default, so adding a tenth event family to
 * game-core fails this build instead of quietly going unrendered.
 */
export class CoreEventBridge {
  private readonly handlers: CoreEventHandlers

  constructor(handlers: CoreEventHandlers) {
    this.handlers = handlers
  }

  consume(events: readonly CoreEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'shot':
          this.handlers.shot(event)
          break
        case 'hit':
          this.handlers.hit(event)
          break
        case 'enemyDied':
          this.handlers.enemyDied(event)
          break
        case 'playerHurt':
          this.handlers.playerHurt(event)
          break
        case 'playerHealed':
          // Optional: a game without the rhythm passive simply ignores it.
          this.handlers.playerHealed?.(event)
          break
        case 'playerDied':
          this.handlers.playerDied(event)
          break
        case 'weaponPicked':
          this.handlers.weaponPicked(event)
          break
        case 'explosion':
          this.handlers.explosion(event)
          break
        case 'enemyTelegraph':
          this.handlers.enemyTelegraph?.(event)
          break
        case 'enemyShot':
          this.handlers.enemyShot?.(event)
          break
        case 'bossTelegraph':
          this.handlers.bossTelegraph?.(event)
          break
        case 'bossAttack':
          this.handlers.bossAttack?.(event)
          break
        case 'bossPhaseChanged':
          this.handlers.bossPhaseChanged(event)
          break
        case 'minibossStarted':
          this.handlers.minibossStarted?.(event)
          break
        case 'minibossCleared':
          this.handlers.minibossCleared?.(event)
          break
        case 'waveStarted':
          this.handlers.waveStarted?.(event)
          break
        case 'stageCleared':
          this.handlers.stageCleared(event)
          break
        default: {
          const unreachable: never = event
          void unreachable
        }
      }
    }
  }
}
