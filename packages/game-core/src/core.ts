/**
 * Rule-layer event model.
 *
 * The rule layer never calls the presentation layer: it emits these events and the
 * presentation layer subscribes to them (docs/game/design/architecture.md §事件驱动).
 */
import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  FIXED_STEP_SECONDS,
  MAX_STEPS_PER_FRAME,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PULSE_FIRE_INTERVAL_SECONDS,
  TIME_EPSILON,
} from './data/constants.js'
import type {
  BossId,
  EntityId,
  InputState,
  PlatformDefinition,
  Rect,
  Vec2,
  WeaponId,
} from './data/types.js'
import { type Bullet, stepBullet } from './entities/Bullet.js'
import { createPlayer, type PlayerState, playerRect } from './entities/Player.js'
import {
  createTarget,
  damageTarget,
  type TargetDefinition,
  type TargetState,
} from './entities/Target.js'
import { overlaps } from './systems/Collision.js'
import { updateMovement } from './systems/Movement.js'
import { createWeaponState, updateWeapons, type WeaponState } from './systems/Weapons.js'

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

/**
 * How the world learns its input.
 *
 * A plain {@link InputState} applies to every fixed step inside the frame. The
 * function form is resolved per step, which is what makes a scripted replay
 * independent of the frame rate the caller happens to be running at.
 */
export type InputProvider = InputState | ((stepIndex: number) => InputState)

/** Everything a caller needs to seed a {@link World}. */
export interface WorldOptions {
  /** Top-left corner of the player spawn, in world pixels. */
  readonly spawn: Vec2
  /** Solid platforms the player collides with. */
  readonly platforms?: readonly PlatformDefinition[]
  /** Gray-box targets that absorb bullets (T-M0-07). */
  readonly targets?: readonly TargetDefinition[]
  /** Stage exit box; reaching it emits one stageCleared event. */
  readonly exit?: Rect | null
  /** Overridable step length; defaults to the GDD 1/60s and is not for rendering. */
  readonly fixedStepSeconds?: number
}

/** A comparable snapshot of the whole rule-layer state. */
export interface WorldSnapshot {
  readonly player: {
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
    readonly onGround: boolean
    readonly facing: 1 | -1
  }
  readonly bullets: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
  }[]
  readonly targets: readonly {
    readonly id: string
    readonly hp: number
    readonly alive: boolean
  }[]
  readonly score: number
  readonly cleared: boolean
  readonly steps: number
}

/**
 * The rule-layer world: owns the entities, runs the fixed-step loop, and emits
 * events for the presentation layer (docs/game/design/architecture.md §运行时循环).
 *
 * `update` is the only entry point. It accumulates wall-clock time and advances
 * the simulation in whole fixed steps, capped at {@link MAX_STEPS_PER_FRAME} per
 * call so a stalled frame cannot spiral into an unbounded catch-up.
 */
export class World {
  readonly player: PlayerState
  readonly platforms: readonly PlatformDefinition[]
  readonly targets: readonly TargetState[]
  readonly exit: Rect | null
  readonly fixedStepSeconds: number
  bullets: Bullet[] = []
  private readonly weapon: WeaponState = createWeaponState()
  private accumulator = 0
  private eventQueue: CoreEvent[] = []
  private stepCount = 0
  private score = 0
  private cleared = false

  constructor(options: WorldOptions) {
    this.player = createPlayer(options.spawn)
    this.platforms = options.platforms ?? []
    this.targets = (options.targets ?? []).map(createTarget)
    this.exit = options.exit ?? null
    this.fixedStepSeconds = options.fixedStepSeconds ?? FIXED_STEP_SECONDS
  }

  /** Accumulated run score; every destroyed target adds its own score. */
  get currentScore(): number {
    return this.score
  }

  /** Whether the stage exit has already been reached in this run. */
  get clearedStage(): boolean {
    return this.cleared
  }

  /** Fixed steps advanced since construction; the determinism handle for tests. */
  get steps(): number {
    return this.stepCount
  }

  /** Frame time not yet consumed by a fixed step. */
  get pendingTime(): number {
    return this.accumulator
  }

  /**
   * Advances the world by `dt` seconds of wall-clock time and returns the events
   * produced during this call.
   *
   * The accumulator is clamped to the catch-up window, so the remainder of an
   * overlong frame is dropped rather than paid back on later frames.
   */
  update(dt: number, input: InputProvider): readonly CoreEvent[] {
    if (!Number.isFinite(dt) || dt <= 0) return this.drainEvents()

    const step = this.fixedStepSeconds
    const maxWindow = step * MAX_STEPS_PER_FRAME
    this.accumulator = Math.min(this.accumulator + dt, maxWindow + step)

    let advanced = 0
    while (this.accumulator + TIME_EPSILON >= step && advanced < MAX_STEPS_PER_FRAME) {
      this.accumulator -= step
      if (this.accumulator < TIME_EPSILON) this.accumulator = 0
      this.stepOnce(input)
      advanced += 1
    }

    if (advanced === MAX_STEPS_PER_FRAME) {
      this.accumulator = Math.min(this.accumulator, maxWindow - step * MAX_STEPS_PER_FRAME)
      if (this.accumulator < TIME_EPSILON) this.accumulator = 0
    }

    return this.drainEvents()
  }

  /** One fixed step: movement, then weapons, then projectiles. */
  private stepOnce(provider: InputProvider): void {
    const input = typeof provider === 'function' ? provider(this.stepCount) : provider
    updateMovement(this.player, input, this.fixedStepSeconds, this.platforms)

    const fired = updateWeapons(
      this.player,
      input,
      this.fixedStepSeconds,
      this.weapon,
      PULSE_FIRE_INTERVAL_SECONDS,
      this.bullets,
    )
    if (fired !== null) {
      this.eventQueue.push({
        type: 'shot',
        weaponId: 'pulse',
        position: { x: fired.position.x, y: fired.position.y },
        direction: {
          x: Math.sign(fired.velocity.x),
          y: Math.sign(fired.velocity.y),
        },
      })
    }

    for (const bullet of this.bullets) stepBullet(bullet, this.fixedStepSeconds)
    this.resolveBulletHits()
    this.checkExit()

    this.stepCount += 1
  }

  /** Gray-box target resolution: a bullet that leaves a live target is spent (T-M0-07). */
  private resolveBulletHits(): void {
    if (this.targets.length === 0) return

    const survivors: Bullet[] = []
    for (const bullet of this.bullets) {
      const box = {
        x: bullet.position.x,
        y: bullet.position.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
      }
      const target = this.targets.find(
        (candidate) => candidate.alive && overlaps(box, candidate.box),
      )
      if (target === undefined) {
        survivors.push(bullet)
        continue
      }

      this.eventQueue.push({
        type: 'hit',
        targetId: target.id,
        damage: bullet.damage,
        position: { x: bullet.position.x, y: bullet.position.y },
      })
      if (!damageTarget(target, bullet.damage)) continue

      this.score += target.score
      this.eventQueue.push({
        type: 'enemyDied',
        enemyId: target.id,
        position: { x: target.box.x, y: target.box.y },
        score: target.score,
      })
    }
    this.bullets = survivors
  }

  /** Fires exactly one stageCleared event the first time the player box meets the exit. */
  private checkExit(): void {
    if (this.cleared || this.exit === null) return
    if (!overlaps(playerRect(this.player), this.exit)) return
    this.cleared = true
    this.eventQueue.push({ type: 'stageCleared', score: this.score })
  }

  private drainEvents(): readonly CoreEvent[] {
    const events = this.eventQueue
    this.eventQueue = []
    return events
  }

  /** Deep, comparable copy of the simulation state. */
  snapshot(): WorldSnapshot {
    return {
      player: {
        x: this.player.position.x,
        y: this.player.position.y,
        vx: this.player.velocity.x,
        vy: this.player.velocity.y,
        onGround: this.player.onGround,
        facing: this.player.facing,
      },
      bullets: this.bullets.map((bullet) => ({
        id: bullet.id,
        x: bullet.position.x,
        y: bullet.position.y,
        vx: bullet.velocity.x,
        vy: bullet.velocity.y,
      })),
      targets: this.targets.map((target) => ({
        id: target.id,
        hp: target.hp,
        alive: target.alive,
      })),
      score: this.score,
      cleared: this.cleared,
      steps: this.stepCount,
    }
  }

  /** Exact player box, for tests and for the presentation layer to sync sprites. */
  playerBox(): { x: number; y: number; width: number; height: number } {
    const box = playerRect(this.player)
    return { x: box.x, y: box.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }
  }
}
