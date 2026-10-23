/**
 * Rule-layer event model.
 *
 * The rule layer never calls the presentation layer: it emits these events and the
 * presentation layer subscribes to them (docs/game/design/architecture.md §事件驱动).
 */

import { bossDefinition } from './data/bosses.js'
import { reachFor } from './data/bossReach.js'
import { INITIAL_WEAPON } from './data/characters.js'
import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  FIXED_STEP_SECONDS,
  MAX_STEPS_PER_FRAME,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  TIME_EPSILON,
} from './data/constants.js'
import type {
  BossId,
  CharacterId,
  EntityId,
  InputState,
  PlatformDefinition,
  Rect,
  Vec2,
  WeaponId,
} from './data/types.js'
import { BEAM_RANGE, explosionRadius, HOMING_LOCK_LIMIT, WEAPONS } from './data/weapons.js'
import { type Bullet, stepBullet } from './entities/Bullet.js'
import { createPlayer, type PlayerState, playerRect } from './entities/Player.js'
import {
  createTarget,
  damageTarget,
  type TargetDefinition,
  type TargetState,
} from './entities/Target.js'
import {
  type BossMove,
  type BossRuntimeState,
  createBossState,
  damageBoss,
  hpFraction,
  stepBoss,
} from './stages/BossDirector.js'
import { equipWeapon } from './systems/Arsenal.js'
import { overlaps, rayBoxDistance } from './systems/Collision.js'
import { applyHit, canDamage } from './systems/Combat.js'
import { updateMovement } from './systems/Movement.js'
import { createPassiveState, type PassiveState, registerRhythmKill } from './systems/Passives.js'
import {
  createWeaponState,
  type FireOutcome,
  type LockCandidate,
  releaseExpiredLocks,
  updateWeapons,
  type WeaponState,
} from './systems/Weapons.js'
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

/** The player regained a heart (GLM's rhythm passive). */
export interface PlayerHealedEvent {
  readonly type: 'playerHealed'
  readonly heartsLeft: number
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

/**
 * The boss began winding up a move.
 *
 * The presentation layer needs this. A boss attack with no visible warning is
 * one the player cannot dodge, and the dodge window is the entire reason the
 * move data carries a telegraph duration.
 */
export interface BossTelegraphEvent {
  readonly type: 'bossTelegraph'
  readonly bossId: BossId
  readonly moveId: string
  /** Seconds the warning lasts, so the UI can animate to that length. */
  readonly seconds: number
}

/**
 * The boss landed a move.
 *
 * hit is false when the player was outside the move's reach; the presentation
 * layer plays a whiff rather than an impact.
 */
export interface BossAttackEvent {
  readonly type: 'bossAttack'
  readonly bossId: BossId
  readonly moveId: string
  readonly position: Vec2
  readonly hit: boolean
}

/** A boss crossed an HP threshold and entered the next phase. */
export interface BossPhaseChangedEvent {
  readonly type: 'bossPhaseChanged'
  readonly bossId: BossId
  readonly phase: number
  /** HP fraction at the moment of the change; drives the segmented bar (T3). */
  readonly healthFraction: number
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
  | PlayerHealedEvent
  | PlayerDiedEvent
  | WeaponPickedEvent
  | ExplosionEvent
  | BossTelegraphEvent
  | BossAttackEvent
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
  /** Source stage, when the world was built from a StageDefinition (T-M2-01). */
  readonly stage?: {
    readonly id: string
    readonly exit: Rect
    readonly bounceWalls?: readonly Rect[]
  }
  /** Boss to spawn when the stage has one (T3). */
  readonly bossId?: BossId
  /** Playable character; decides the initial weapon (T-M1-01). */
  readonly characterId?: CharacterId
  /** Starting hearts; defaults to the GDD §3.1 three hearts. */
  readonly hearts?: number
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
  readonly weapon: {
    readonly slots: readonly (WeaponId | null)[]
    readonly activeSlot: number
    readonly spreadAccum: readonly number[]
    readonly ammoLeft: readonly number[]
  }
  readonly combat: {
    readonly hearts: number
    readonly invulnerableUntil: number
  }
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
  readonly characterId: CharacterId
  private readonly weapon: WeaponState = createWeaponState()
  private readonly homingLockLimit: number
  private accumulator = 0
  private eventQueue: CoreEvent[] = []
  private stepCount = 0
  private score = 0
  /** Hearts at spawn, the ceiling a refund may restore to. */
  private readonly startingHearts: number
  /** GLM refunds one heart per stage, no more. */
  private rhythmRefunded = false
  private readonly passive: PassiveState = createPassiveState()
  /** The stage boss, when there is one; null on ordinary stages. */
  private boss: BossRuntimeState | null = null
  /** True while the boss has the player's gravity inverted. */
  private gravityFlipped = false

  /** Whether the current boss has gravity inverted; the renderer flips the view. */
  get gravityInverted(): boolean {
    return this.gravityFlipped
  }
  private cleared = false
  private elapsedSeconds = 0

  constructor(options: WorldOptions) {
    this.player = createPlayer(
      options.spawn,
      options.hearts === undefined ? {} : { hearts: options.hearts },
    )
    this.characterId = options.characterId ?? 'glm'
    this.startingHearts = this.player.hearts
    this.platforms = options.platforms ?? []
    this.targets = (options.targets ?? []).map(createTarget)
    this.exit = options.exit ?? null
    this.fixedStepSeconds = options.fixedStepSeconds ?? FIXED_STEP_SECONDS
    this.homingLockLimit = HOMING_LOCK_LIMIT
    equipWeapon(this.player, INITIAL_WEAPON[this.characterId])

    // A stage that names a boss but has no definition is a bug, not a state to
    // paper over: it would render an empty arena that never clears.
    if (options.bossId !== undefined) {
      const definition = bossDefinition(options.bossId)
      if (definition === undefined) {
        throw new Error(`unknown boss: ${options.bossId}`)
      }
      this.boss = createBossState(definition)
    }
  }

  /** Seconds of simulation elapsed; the clock the combat rules read. */
  get now(): number {
    return this.elapsedSeconds
  }

  /** The weapon slot the trigger currently drives. */
  get activeSlot(): number {
    return this.player.activeSlot
  }

  /** Replaces the active weapon slot with a picked-up weapon (T-M1-01). */
  pickUpWeapon(weaponId: WeaponId): void {
    const slot = equipWeapon(this.player, weaponId)
    this.eventQueue.push({ type: 'weaponPicked', weaponId, slot })
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

  /** One fixed step: movement, then weapons, then projectiles and damage. */
  /**
   * Advances the boss and reports what it did (T3).
   *
   * The director owns phases, telegraphs and the gravity flip; this only
   * translates its result into events and, on death, hands the player the
   * weapon the boss drops. Keeping that split means a new boss is data, not a
   * new branch in here.
   */
  private stepBossOnce(): void {
    const boss = this.boss
    if (boss === null || boss.defeated) return

    const result = stepBoss(boss, this.fixedStepSeconds)

    // The director has always produced these two values; until now this call
    // site read phaseChanged and gravityFlipped and dropped both of them. The
    // result was a boss that moved, telegraphed nothing, and could not damage
    // the player - the moves were authored, previewed and never applied.
    if (result.telegraphed !== null) {
      const move = this.findBossMove(boss, result.telegraphed)
      this.eventQueue.push({
        type: 'bossTelegraph',
        bossId: boss.definition.id as BossId,
        moveId: result.telegraphed,
        seconds: move?.telegraphSeconds ?? 0,
      })
    }

    if (result.resolved !== null) {
      this.applyBossMove(boss, result.resolved)
    }

    if (result.phaseChanged) {
      this.eventQueue.push({
        type: 'bossPhaseChanged',
        bossId: boss.definition.id as BossId,
        phase: result.newPhase,
        healthFraction: hpFraction(boss),
      })
    }
    if (result.gravityFlipped) {
      this.gravityFlipped = boss.gravityFlipped
    }
  }

  /** The move definition for an id, across every phase. */
  private findBossMove(boss: BossRuntimeState, moveId: string): BossMove | undefined {
    for (const phase of boss.definition.phases) {
      const move = phase.moves.find((candidate) => candidate.id === moveId)
      if (move !== undefined) return move
    }
    return undefined
  }

  /**
   * Applies one resolved boss move.
   *
   * A resolved move is a hit unless the player is somewhere it cannot reach.
   * The move data carries damage and timing but no geometry, so the reach is
   * derived here from the move's kind: a beam sweeps the whole arena, a chain
   * needs the player nearby, a ground attack misses a player who is airborne.
   * Without that distinction every boss would be an unavoidable timer, which is
   * neither fair nor interesting.
   */
  private applyBossMove(boss: BossRuntimeState, move: BossMove): void {
    if (this.player.hearts <= 0) return

    // The boss has no coordinates of its own - the runtime state is a phase
    // machine, not an entity. A boss stage's arena is its exit zone, so that is
    // the anchor: distance is measured from the arena centre, which is where
    // the boss stands.
    const arena = this.exit ?? { x: 0, y: 0, width: 0, height: 0 }
    const fromBoss = { x: arena.x + arena.width / 2, y: arena.y + arena.height / 2 }
    const distance = Math.abs(this.player.position.x - fromBoss.x)
    const reach = reachFor(move)
    const inReach = distance <= reach.maxDistance
    const grounded = reach.requiresGrounded ? this.player.onGround : true

    this.eventQueue.push({
      type: 'bossAttack',
      bossId: boss.definition.id as BossId,
      moveId: move.id,
      position: { x: fromBoss.x, y: fromBoss.y },
      hit: inReach && grounded,
    })

    if (!inReach || !grounded) return
    this.hurtPlayer(move.damage)
  }

  /** Boss state for the presentation layer; null on an ordinary stage. */
  get activeBoss(): BossRuntimeState | null {
    return this.boss
  }

  /**
   * Damages the boss (T3).
   *
   * Called by the bullet resolver. On death the boss drops the weapon its
   * definition names - the reward is part of the boss data, so a new boss with
   * a different drop needs no code change here.
   */
  private damageBossBy(amount: number): void {
    const boss = this.boss
    if (boss === null || boss.defeated) return

    const phaseBefore = boss.phase
    const died = damageBoss(boss, amount)

    if (boss.phase !== phaseBefore) {
      this.eventQueue.push({
        type: 'bossPhaseChanged',
        bossId: boss.definition.id as BossId,
        phase: boss.phase,
        healthFraction: hpFraction(boss),
      })
    }

    if (!died) return

    this.eventQueue.push({
      type: 'enemyDied',
      enemyId: boss.definition.id,
      position: { x: 0, y: 0 },
      score: 0,
    })

    const drop = boss.definition.dropsWeapon
    if (drop !== undefined) {
      const weaponId = drop as WeaponId
      this.pickUpWeapon(weaponId)
      this.eventQueue.push({ type: 'weaponPicked', weaponId, slot: this.player.activeSlot })
    }
  }

  private stepOnce(provider: InputProvider): void {
    const input = typeof provider === 'function' ? provider(this.stepCount) : provider
    this.elapsedSeconds += this.fixedStepSeconds
    updateMovement(this.player, input, this.fixedStepSeconds, this.platforms)

    releaseExpiredLocks(this.weapon, this.liveTargetIds())
    const fired = updateWeapons(
      this.player,
      input,
      this.fixedStepSeconds,
      this.weapon,
      this.lockCandidates(),
      this.homingLockLimit,
    )
    this.recordShot(fired)
    this.resolveBeam(fired)

    for (const bullet of this.bullets) stepBullet(bullet, this.fixedStepSeconds)
    this.steerHomingRounds()
    this.resolveBulletHits()
    this.resolveBlasts()
    this.stepBossOnce()
    this.damagePlayer()
    this.checkExit()

    this.stepCount += 1
  }

  /** Emits the shot event for a trigger pull that produced at least one round. */
  private recordShot(fired: FireOutcome): void {
    if (fired.weaponId === null) return
    if (fired.beam !== null) return
    this.bullets.push(...fired.bullets)
    const first = fired.bullets[0]
    this.eventQueue.push({
      type: 'shot',
      weaponId: fired.weaponId,
      position: first?.position ?? { x: this.player.position.x, y: this.player.position.y },
      direction:
        first === undefined
          ? { x: this.player.facing, y: 0 }
          : { x: Math.sign(first.velocity.x), y: Math.sign(first.velocity.y) },
    })
  }

  /**
   * Resolves a beam shot against every live target on the line of fire.
   *
   * A beam is instant, so it is a ray query rather than a projectile: the first
   * target on the ray takes one tick of damage (GDD §3.2 · 3/tick).
   */
  private resolveBeam(fired: FireOutcome): void {
    if (fired.beam === null) return
    if (!canDamage('player', 'enemy')) return

    let nearest: { target: TargetState; distance: number } | null = null
    for (const target of this.targets) {
      if (!target.alive) continue
      const distance = rayBoxDistance(fired.beam.origin, fired.beam.direction, target.box)
      if (distance === null || distance > BEAM_RANGE) continue
      if (nearest !== null && distance >= nearest.distance) continue
      nearest = { target, distance }
    }
    if (nearest === null) return

    this.eventQueue.push({
      type: 'shot',
      weaponId: 'laser',
      position: { x: fired.beam.origin.x, y: fired.beam.origin.y },
      direction: fired.beam.direction,
    })
    this.applyDamageToTarget(nearest.target, fired.beam.damage, fired.beam.origin)
  }

  private liveTargetIds(): EntityId[] {
    return this.targets.filter((target) => target.alive).map((target) => target.id)
  }

  private lockCandidates(): LockCandidate[] {
    return this.targets
      .filter((target) => target.alive)
      .map((target) => ({
        id: target.id,
        x: target.box.x + target.box.width / 2,
        y: target.box.y + target.box.height / 2,
      }))
  }

  /**
   * Steers every locked round toward its target (gameplay.md §追踪弹幕).
   *
   * The round turns at its weapon's rate and keeps its speed, so a lock changes
   * the heading without making the round faster or slower.
   */
  private steerHomingRounds(): void {
    const turnRate = WEAPONS.homing.homingTurnRate * this.fixedStepSeconds
    for (const bullet of this.bullets) {
      if (bullet.lockedTargetId === null) continue
      const target = this.targets.find((candidate) => candidate.id === bullet.lockedTargetId)
      if (target === undefined || !target.alive) {
        bullet.lockedTargetId = null
        continue
      }

      const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y)
      const desiredX = target.box.x + target.box.width / 2 - bullet.position.x
      const desiredY = target.box.y + target.box.height / 2 - bullet.position.y
      if (speed === 0 || (desiredX === 0 && desiredY === 0)) continue

      const current = Math.atan2(bullet.velocity.y, bullet.velocity.x)
      const wanted = Math.atan2(desiredY, desiredX)
      const delta = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current))
      const heading = current + Math.max(-turnRate, Math.min(turnRate, delta))
      bullet.velocity.x = Math.cos(heading) * speed
      bullet.velocity.y = Math.sin(heading) * speed
    }
  }

  /** Bullet-vs-target resolution, honouring pierce and the faction rules. */
  private resolveBulletHits(): void {
    if (this.targets.length === 0) return

    const survivors: Bullet[] = []
    for (const bullet of this.bullets) {
      // Thrown weapons never pierce: they detonate in resolveBlasts instead.
      if (bullet.gravity !== 0 || !canDamage(bullet.owner, 'enemy')) {
        survivors.push(bullet)
        continue
      }

      const box = {
        x: bullet.position.x,
        y: bullet.position.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
      }
      let spent = false
      for (const target of this.targets) {
        if (spent || bullet.hitTargets.has(target.id)) continue
        if (!target.alive || !overlaps(box, target.box)) continue

        bullet.hitTargets.add(target.id)
        this.applyDamageToTarget(target, bullet.damage, bullet.position)
        // A boss shares the bullet path with ordinary targets, so a round that
        // hits it just passes straight through instead of stopping.
        this.damageBossBy(bullet.damage)
        if (bullet.remainingPierces > 0) {
          bullet.remainingPierces -= 1
        } else {
          spent = true
        }
      }

      if (!spent) survivors.push(bullet)
    }
    this.bullets = survivors
  }

  /** Applies damage to one target and reports it; scoring lives here and nowhere else. */
  private applyDamageToTarget(target: TargetState, damage: number, at: Vec2): void {
    this.eventQueue.push({
      type: 'hit',
      targetId: target.id,
      damage,
      position: { x: at.x, y: at.y },
    })
    if (!damageTarget(target, damage)) return

    this.score += target.score
    this.eventQueue.push({
      type: 'enemyDied',
      enemyId: target.id,
      position: { x: target.box.x, y: target.box.y },
      score: target.score,
    })
    this.applyKillPassive()
  }

  /**
   * Character passives that fire on a kill (T2).
   *
   * Only GLM's rhythm does; the others are read where they matter - spread
   * accumulation, homing damage, prism targets - rather than being collected in
   * one place that would have to know about all six.
   *
   * The heart refund is once per stage and capped at the starting maximum:
   * an unbounded refund would make GLM unkillable in a long stage, which is a
   * different game.
   */
  private applyKillPassive(): void {
    if (this.characterId !== 'glm') return
    if (this.rhythmRefunded) return

    const earned = registerRhythmKill(this.passive, 'balanced-rhythm')
    if (!earned) return

    if (this.player.hearts < this.startingHearts) {
      this.player.hearts += 1
      this.rhythmRefunded = true
      this.eventQueue.push({
        type: 'playerHealed',
        heartsLeft: this.player.hearts,
      })
    }
  }

  /**
   * Thrown weapons detonate on contact (GDD §3.2 · 落地爆炸).
   *
   * A round explodes when it reaches a platform or touches a live target; the
   * blast is then a radius query over live targets from the impact point, so the
   * ground and a body follow one rule and there is no per-pixel hit test.
   */
  private resolveBlasts(): void {
    const survivors: Bullet[] = []
    for (const bullet of this.bullets) {
      const radius = explosionRadius(bullet.weaponId)
      if (bullet.gravity === 0 || radius === 0) {
        survivors.push(bullet)
        continue
      }

      const box = {
        x: bullet.position.x,
        y: bullet.position.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
      }
      const contact =
        this.platforms.some((platform) => overlaps(box, platform)) ||
        this.targets.some((target) => target.alive && overlaps(box, target.box))
      if (!contact) {
        survivors.push(bullet)
        continue
      }

      this.eventQueue.push({
        type: 'explosion',
        position: { x: bullet.position.x, y: bullet.position.y },
        radius,
      })
      for (const target of this.targets) {
        if (!target.alive) continue
        const dx = target.box.x + target.box.width / 2 - bullet.position.x
        const dy = target.box.y + target.box.height / 2 - bullet.position.y
        if (Math.hypot(dx, dy) > radius) continue
        this.applyDamageToTarget(target, bullet.damage, bullet.position)
      }
    }
    this.bullets = survivors
  }

  /**
   * Enemy contact and enemy fire damage the player (T-M1-06).
   *
   * A hit is always exactly one heart, and applyHit owns the 1.5s window, so
   * several contacts inside one step still cost a single heart.
   */
  /**
   * Applies a direct hit from a boss move.
   *
   * Shares applyHit's invulnerability window with contact damage, so a boss
   * move landing in the same step as an enemy touch still costs one heart.
   */
  private hurtPlayer(_damage: number): void {
    if (this.player.hearts <= 0) return
    if (!canDamage('enemy', 'player')) return

    const result = applyHit(this.player, this.elapsedSeconds)
    if (!result.applied) return

    this.eventQueue.push({
      type: 'playerHurt',
      heartsLeft: result.heartsLeft,
      position: { x: this.player.position.x, y: this.player.position.y },
    })
    if (!result.died) return
    this.eventQueue.push({
      type: 'playerDied',
      position: { x: this.player.position.x, y: this.player.position.y },
    })
  }

  private damagePlayer(): void {
    if (this.player.hearts <= 0) return
    if (!canDamage('enemy', 'player')) return

    const box = playerRect(this.player)
    const touching = this.targets.some((target) => target.alive && overlaps(box, target.box))
    const shot = this.bullets.some(
      (bullet) =>
        bullet.owner === 'enemy' &&
        overlaps(
          {
            x: bullet.position.x,
            y: bullet.position.y,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
          },
          box,
        ),
    )
    if (!touching && !shot) return

    const result = applyHit(this.player, this.elapsedSeconds)
    if (!result.applied) return

    this.eventQueue.push({
      type: 'playerHurt',
      heartsLeft: result.heartsLeft,
      position: { x: this.player.position.x, y: this.player.position.y },
    })
    if (!result.died) return
    this.eventQueue.push({
      type: 'playerDied',
      position: { x: this.player.position.x, y: this.player.position.y },
    })
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
      weapon: {
        slots: this.player.weaponSlots.map((slot) => slot?.weaponId ?? null),
        activeSlot: this.player.activeSlot,
        spreadAccum: this.player.weaponSlots.map((slot) => slot?.spreadAccum ?? 0),
        ammoLeft: this.player.weaponSlots.map((slot) => slot?.ammoLeft ?? 0),
      },
      combat: {
        hearts: this.player.hearts,
        invulnerableUntil: this.player.invulnerableUntil,
      },
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
