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
import { enemyWeapon, maxConcurrentShooters } from './data/enemyWeapons.js'
import type {
  BossId,
  CharacterId,
  EntityId,
  InputState,
  Rect,
  Vec2,
  WeaponId,
} from './data/types.js'
import { BEAM_RANGE, explosionRadius, HOMING_LOCK_LIMIT, WEAPONS } from './data/weapons.js'
import { type Bullet, createBullet, stepBullet } from './entities/Bullet.js'
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
import {
  allEchoesCleared,
  bodyUntargetable,
  createEchoState,
  damageEcho,
  type EchoState,
  echoesRemaining,
  maybeSplit,
} from './systems/Echoes.js'
import {
  type AttackState,
  createAttackState,
  enemyCentre,
  stepAttack,
  volleyDirections,
} from './systems/EnemyAttack.js'
import {
  type MotionBounds,
  motionBounds,
  motionDefinition,
  stepMotion,
} from './systems/EnemyBehaviour.js'
import {
  armourDamage,
  bulletBox,
  facingFromMotion,
  platformCarry,
  reflectBulletsOffWalls,
  solidPlatforms,
} from './systems/MechanicEffects.js'
import { updateMovement } from './systems/Movement.js'
import { createPassiveState, type PassiveState, registerRhythmKill } from './systems/Passives.js'
import {
  applyBlast,
  createTerrainState,
  reachedExit,
  type ScrollMode,
  type TerrainPlatform,
  type TerrainState,
} from './systems/Terrain.js'
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

/** An enemy began winding up an attack. */
export interface EnemyTelegraphEvent {
  readonly type: 'enemyTelegraph'
  readonly enemyId: EntityId
  readonly weaponId: string
  /** Seconds of warning, so the UI can animate to that length. */
  readonly seconds: number
  readonly position: Vec2
}

/** An enemy fired. */
export interface EnemyShotEvent {
  readonly type: 'enemyShot'
  readonly enemyId: EntityId
  readonly weaponId: string
  readonly position: Vec2
  readonly direction: Vec2
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
  | EnemyTelegraphEvent
  | EnemyShotEvent
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
  /**
   * Solid platforms the player collides with.
   *
   * Typed as terrain rather than as a bare rectangle so a stage can say that a
   * plank moves or breaks; a plain Rect still satisfies it, which is what keeps
   * every existing caller and test unchanged.
   */
  readonly platforms?: readonly TerrainPlatform[]
  /** Gray-box targets that absorb bullets (T-M0-07). */
  readonly targets?: readonly TargetDefinition[]
  /** Stage exit box; reaching it emits one stageCleared event. */
  readonly exit?: Rect | null
  /** Source stage, when the world was built from a StageDefinition (T-M2-01). */
  readonly stage?: {
    readonly id: string
    readonly exit: Rect
    readonly bounceWalls?: readonly Rect[]
    readonly scrollMode?: ScrollMode
  }
  /**
   * Campaign act, 1 to 3.
   *
   * Sets how many enemies may be mid-attack at once. Defaults to act 1, which is
   * the strictest cap: a world built without stage data should be the safe case,
   * not the bullet-wall case.
   */
  readonly act?: 1 | 2 | 3
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
  /** The platforms as authored, motion and breakable state included. */
  readonly platforms: readonly TerrainPlatform[]
  /**
   * Live targets, including the echoes that appear mid-fight.
   *
   * Writable rather than readonly because stage 12 spawns three of them after
   * the boss reaches its split threshold - they are not in the stage data.
   */
  targets: TargetState[]
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
  /**
   * Per-target attack timers, keyed by target id.
   *
   * A target with no entry never fires - which is the right default for a
   * graybox box in a test that only checks collision.
   */
  private readonly attackStates = new Map<EntityId, AttackState>()
  /** Separate counter from the player's shotsFired, so ids cannot collide. */
  private enemyShotsFired = 0
  /** Campaign act, deciding how many enemies may fire at once. */
  private readonly act: 1 | 2 | 3
  /**
   * Left and right limits of the playable area.
   *
   * Derived from the union of platforms plus the exit, because WorldOptions
   * carries no stage width. The player used to walk straight off the right edge
   * and keep going - there is no terrain out there, so the character fell through
   * the floor and out of the world.
   */
  private readonly movementBounds: { minX: number; maxX: number }
  /** Bounce walls: bullets reflect off these, the player does not. */
  private readonly bounceWalls: readonly Rect[]
  /** Which way the stage advances; a vertical one is cleared by a downward exit. */
  private readonly scrollMode: ScrollMode
  /** Broken platforms, remaining HP, loot; empty when the stage authored none. */
  private readonly terrain: TerrainState = createTerrainState()
  /**
   * The GPT fight's echo interlude.
   *
   * systems/Echoes.ts modelled the split properly and nothing called it: the
   * director advanced on HP alone, so stage 12 reached phase 3 at 40% and stopped
   * there. Phase 3 carries no moves - the echoes are supposed to be the fight -
   * so the boss simply stopped attacking and the last phase could never open.
   */
  private readonly echoes: EchoState = createEchoState()
  /** Where each echo stands, keyed by echo id, in world space. */
  private readonly echoBoxes = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >()
  /** Where each enemy is looking, so armour can tell a frontal hit from a rear one. */
  private readonly facings = new Map<EntityId, 1 | -1>()

  constructor(options: WorldOptions) {
    this.player = createPlayer(
      options.spawn,
      options.hearts === undefined ? {} : { hearts: options.hearts },
    )
    this.characterId = options.characterId ?? 'glm'
    this.startingHearts = this.player.hearts
    this.platforms = options.platforms ?? []
    this.bounceWalls = options.stage?.bounceWalls ?? []
    this.scrollMode = options.stage?.scrollMode ?? 'horizontal'
    this.targets = (options.targets ?? []).map(createTarget)
    this.exit = options.exit ?? null
    this.fixedStepSeconds = options.fixedStepSeconds ?? FIXED_STEP_SECONDS
    this.act = options.act ?? 1
    {
      let minX = 0
      let maxX = 0
      for (const platform of this.platforms) {
        minX = Math.min(minX, platform.x)
        maxX = Math.max(maxX, platform.x + platform.width)
      }
      const box = options.exit
      if (box !== null && box !== undefined) {
        maxX = Math.max(maxX, box.x + box.width)
      }
      this.movementBounds = { minX, maxX }
    }
    // Only targets that name a known archetype get a timer. Everything else is
    // a plain box and stays inert.
    for (const target of this.targets) {
      if (target.alive) this.attackStates.set(target.id, createAttackState())
      // Facing right until proven otherwise: it is the direction a patrol starts
      // in, and the mirror of it is the one a player can always walk around.
      this.facings.set(target.id, 1)
    }
    this.homingLockLimit = HOMING_LOCK_LIMIT
    equipWeapon(this.player, INITIAL_WEAPON[this.characterId])

    // A stage that names a boss but has no definition is a bug, not a state to
    // paper over: it would render an empty arena that never clears.
    if (options.bossId !== undefined) {
      const definition = bossDefinition(options.bossId)
      if (definition === undefined) {
        throw new Error(`unknown boss: ${options.bossId}`)
      }
      // The boss stands at the arena: a boss stage's exit zone is the only place
      // in the data that says where it is, and its hit box is placed there.
      const arena = options.exit
      const origin =
        arena === null || arena === undefined
          ? { x: 0, y: 0 }
          : { x: arena.x + arena.width / 2, y: arena.y + arena.height }
      this.boss = createBossState(definition, origin)
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
   * Advances every enemy's attack timer and fires the ones that finish winding up.
   *
   * The shooter budget is the point of this method. An act's cap is not a
   * performance guard, it is a fairness rule: eight drones that all fire aimed
   * shots produce a wall with no gap, and a wall cannot be dodged. Only the
   * enemies already winding up count against the budget, so a shut-out enemy
   * retries on a later step rather than losing its turn permanently.
   */
  private stepEnemyAttacks(): void {
    if (this.targets.length === 0) return

    const budget = maxConcurrentShooters(this.act)
    // Count the enemies that are winding up right now, before anyone is given a
    // turn. Counting inside the loop let a second enemy start on the same step
    // as the first, because the first's slot had not been booked yet.
    let _winding = 0
    for (const state of this.attackStates.values()) {
      if (state.windingUp) _winding += 1
    }
    /**
     * A slot is held from the start of the wind-up until the shot's cooldown
     * ends, not just until the bullet leaves.
     *
     * Releasing it on fire let a second enemy start on the very next step, so an
     * act-1 stage reached two shooters inside one second: enemy A finished its
     * 0.5s warning, fired, and enemy B began winding up immediately. The cap is
     * meant to bound how much incoming fire exists over time, so a slot has to
     * outlast the shot that spent it.
     */
    const holding = new Set<EntityId>()
    for (const [id, state] of this.attackStates) {
      if (state.windingUp || state.cooldownUntil > this.elapsedSeconds) holding.add(id)
    }

    const player = {
      x: this.player.position.x + PLAYER_WIDTH / 2,
      y: this.player.position.y + PLAYER_HEIGHT / 2,
    }

    for (const target of this.targets) {
      const state = this.attackStates.get(target.id)
      if (state === undefined || !target.alive) continue

      const weapon = enemyWeapon(target.archetype)
      if (weapon === undefined) {
        // A target without a known archetype has no weapon, so it never fires,
        // and its timer must not be left counting down forever.
        continue
      }

      // Idle enemies compete for a free slot; one already in flight keeps its own.
      //
      // `winding` is incremented inside this loop, so an enemy that starts a
      // wind-up early in the iteration consumes the budget for the rest of it.
      // That is the whole point: without it, six drones decide simultaneously
      // that a slot is free and all six take it.
      // The budget counts enemies that hold a slot, not enemies that are
      // currently winding up. Counting only wind-ups released the slot the
      // instant a shot left, so the next drone took it on the following step and
      // the act-1 cap produced a volley every 0.5s - which is exactly the
      // undodgeable wall the cap exists to prevent.
      const occupies = holding.has(target.id)
      const mayStart = occupies || holding.size < budget
      const step = stepAttack(
        state,
        weapon,
        target,
        player,
        this.player.onGround,
        this.elapsedSeconds,
        mayStart,
      )

      if (step.startedTelegraph) {
        const centre = enemyCentre(target)
        this.eventQueue.push({
          type: 'enemyTelegraph',
          enemyId: target.id,
          weaponId: weapon.id,
          seconds: weapon.telegraphSeconds,
          position: centre,
        })
        _winding += 1
        holding.add(target.id)
      }
      if (step.fired && step.origin !== null && step.aim !== null) {
        this.fireEnemyVolley(target, weapon, step.origin, step.aim)
        // Keep the slot booked for the rest of this step and until the cooldown
        // ends. Releasing it on fire let the next enemy in the same iteration
        // start winding up immediately, which is how an act-1 stage produced two
        // shooters one step apart.
        holding.add(target.id)
      }
    }
  }

  /**
   * Walks every enemy whose behaviour moves (T-M1-05).
   *
   * The rule layer described ten archetypes with distinct behaviours and then
   * never called systems/EnemyBehaviour: an enemy was a box that could shoot and
   * could be walked into, but never came for the player. This is the call site
   * that was missing, and it runs before stepEnemyAttacks so a shot is fired from
   * where the enemy now stands rather than from where it stood last step.
   *
   * Movement only ever rewrites the box. Damage stays entirely on the existing
   * channels: a charger that reaches the player overlaps them, and the contact
   * rule in damagePlayer charges the heart. Nothing here can invent a hit.
   */
  private stepEnemyMotion(): void {
    if (this.targets.length === 0) return

    const player = {
      x: this.player.position.x + PLAYER_WIDTH / 2,
      y: this.player.position.y + PLAYER_HEIGHT / 2,
    }
    // Broken planks no longer hold an enemy up either.
    const solid = solidPlatforms(this.platforms, this.terrain, this.elapsedSeconds)
    // Derived once per step: the bounds are pure geometry of the static level.
    const bounds: MotionBounds | null = motionBounds(solid)

    for (const target of this.targets) {
      if (!target.alive) continue
      const definition = motionDefinition(target.archetype)
      if (definition === undefined) continue

      const next = stepMotion(definition, target.box, {
        player,
        dt: this.fixedStepSeconds,
        platforms: solid,
        bounds,
      })
      if (next === null) continue

      this.facings.set(
        target.id,
        facingFromMotion(next.x - target.box.x, this.facings.get(target.id) ?? 1),
      )
      target.box.x = next.x
      target.box.y = next.y
    }
  }

  /** Emits one enemy volley as bullets owned by the enemy faction. */
  private fireEnemyVolley(
    target: TargetState,
    weapon: {
      bulletCount: number
      spreadDeg: number
      bulletSpeed: number
      damage: number
      homing: boolean
      gravity: number
      id: string
    },
    origin: Vec2,
    aim: Vec2,
  ): void {
    if (!canDamage('enemy', 'player')) return

    const directions = volleyDirections(aim, weapon.bulletCount, weapon.spreadDeg)
    for (const direction of directions) {
      this.enemyShotsFired += 1
      this.bullets.push(
        createBullet(
          `enemy-shot-${this.enemyShotsFired}`,
          'enemy',
          origin,
          { x: direction.x * weapon.bulletSpeed, y: direction.y * weapon.bulletSpeed },
          weapon.damage,
          {
            // The player-side id is only used for pool and blast lookups that
            // never run for an enemy round; the real identity travels in
            // enemyWeaponId so the renderer can pick the enemy art.
            weaponId: 'pulse',
            enemyWeaponId: weapon.id,
            lockedTargetId: null,
            gravity: weapon.gravity,
          },
        ),
      )
    }

    this.eventQueue.push({
      type: 'enemyShot',
      enemyId: target.id,
      weaponId: weapon.id,
      position: { x: origin.x, y: origin.y },
      direction: { x: aim.x, y: aim.y },
    })
  }

  /**
   * Places the three echoes around the arena.
   *
   * They are ordinary targets as far as the player is concerned - a bullet hits
   * one, it takes damage, it dies - so they go in the same targets array the
   * enemy attacks and the blast code already walk. The echo bookkeeping is what
   * decides when the body comes back.
   */
  private spawnEchoes(): void {
    const arena = this.exit
    const baseX = arena === null ? 0 : arena.x
    const width = 56
    const height = 72
    // Stand the echoes on the floor in front of the arena. Anchoring them to the
    // exit's own y put them 72px above the floor, where a level shot passes
    // underneath and the interlude cannot be finished at all.
    const floorY = this.groundTop() - height
    const offsets = [0, 140, 280]

    for (let index = 0; index < this.echoes.echoes.length; index += 1) {
      const echo = this.echoes.echoes[index]
      if (echo === undefined) continue
      // Spread behind the arena, not across it. Placing one on the exit zone
      // meant the player cleared the stage while trying to line up a shot on the
      // last echo.
      const x = baseX - 620 + (offsets[index] ?? 0)
      const y = floorY
      this.echoBoxes.set(echo.id, { x, y, width, height })
      this.targets.push(
        createTarget({
          id: echo.id,
          x,
          y,
          width,
          height,
          hp: echo.hp,
          score: 150,
          // No archetype: an echo is an obstacle the player must clear, not a
          // second enemy. Giving it one gave it a weapon, and three echoes firing
          // at once killed the player before the interlude could be finished -
          // the fight became unwinnable in the phase that is supposed to be a
          // breather.
        }),
      )
    }
  }

  /** Top of the lowest floor slab, which is where ground-standing things sit. */
  private groundTop(): number {
    let top = Number.POSITIVE_INFINITY
    for (const platform of this.platforms) {
      if (platform.width >= 400) top = Math.min(top, platform.y)
    }
    return Number.isFinite(top) ? top : 400
  }

  /** How many echoes are still standing; the body stays hidden while any are. */
  get echoesLeft(): number {
    return echoesRemaining(this.echoes)
  }

  /** True once every echo is down, which opens the final phase. */
  get echoesCleared(): boolean {
    return allEchoesCleared(this.echoes)
  }

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

    // The GPT fight does not advance on HP alone. Between phase 2 and the final
    // form sits an interlude where the body splits and stops being reachable;
    // the director's own hp table would enter it at 40% and then never leave,
    // because its phase 3 has no moves and its phase 4 shares the same
    // threshold. Holding the phase at 3 until the echoes are down is what makes
    // the last phase reachable at all.
    const isGpt = boss.definition.id === 'gpt-emergent' || boss.definition.id === 'gpt-corpus'
    const result = stepBoss(boss, this.fixedStepSeconds)

    // The director recomputes the phase from HP on every step, so an override
    // has to come after it, not before. Setting it before was silently reverted
    // on the same step and the fight skipped straight to phase 4.
    if (isGpt) {
      const want = this.echoesCleared ? 4 : this.echoes.split ? 3 : boss.phase
      if (want !== boss.phase) {
        boss.phase = want
        this.eventQueue.push({
          type: 'bossPhaseChanged',
          bossId: boss.definition.id as BossId,
          phase: want,
          healthFraction: hpFraction(boss),
        })
      }
    }

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
  /**
   * The platforms as they stand this instant.
   *
   * A motion platform's x/y in the stage data is its resting position, and
   * platformAt() is a pure function of elapsed time rather than a mutation. That
   * is the right shape for determinism, but it left the presentation layer and
   * every external check with no way to ask where a plank actually is - the only
   * public view was the authored data, which never moves.
   */
  platformStates(): readonly TerrainPlatform[] {
    return solidPlatforms(this.platforms, this.terrain, this.elapsedSeconds)
  }

  /** True when this platform id is still solid; a broken plank is not. */
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
  private damageBossBy(amount: number, at?: Vec2): void {
    const boss = this.boss
    if (boss === null || boss.defeated) return

    // While the echoes are alive the body cannot be reached. Without this the
    // split would be cosmetic: the player could keep hitting the boss and skip
    // the interlude entirely.
    if (bodyUntargetable(this.echoes)) return

    const phaseBefore = boss.phase
    const hpBefore = boss.hp
    const died = damageBoss(boss, amount)

    // A hit has to be reported or the boss looks invulnerable even while it is
    // losing hp: every damage number in this game is read off the hit event, and
    // the boss was the one thing that never emitted one.
    if (boss.hp !== hpBefore) {
      // The split happens the moment the last hit takes the body to the
      // threshold, so the player never lands a shot on a boss that is already
      // meant to be out of reach.
      if (boss.definition.id === 'gpt-emergent' || boss.definition.id === 'gpt-corpus') {
        const split = maybeSplit(this.echoes, boss.hp, boss.definition.maxHp, 120)
        if (split) this.spawnEchoes()
      }
      this.eventQueue.push({
        type: 'hit',
        targetId: boss.definition.id,
        damage: hpBefore - boss.hp,
        position: at ?? { x: boss.box.x + boss.box.width / 2, y: boss.box.y + boss.box.height / 2 },
      })
    }

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
      position: { x: boss.box.x, y: boss.box.y },
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
    const previousSeconds = this.elapsedSeconds
    this.elapsedSeconds += this.fixedStepSeconds

    // A moving plank carries whoever stands on it. Applied before the movement
    // step so the player's own input is resolved against where the terrain is
    // now, not where it was when the step began.
    const carry = platformCarry(
      this.platforms,
      this.terrain,
      previousSeconds,
      this.elapsedSeconds,
      {
        x: this.player.position.x,
        width: PLAYER_WIDTH,
        bottom: this.player.position.y + PLAYER_HEIGHT,
      },
    )
    this.player.position.x += carry.x
    this.player.position.y += carry.y

    const solid = solidPlatforms(this.platforms, this.terrain, this.elapsedSeconds)
    updateMovement(this.player, input, this.fixedStepSeconds, solid, this.movementBounds)

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

    // A step first, then the cull: a bullet that leaves the world this step
    // still travels the full step before it is dropped.
    for (const bullet of this.bullets) stepBullet(bullet, this.fixedStepSeconds)
    reflectBulletsOffWalls(this.bullets, this.bounceWalls)
    this.cullBullets()
    this.steerHomingRounds()
    this.resolveBulletHits()
    this.resolveBlasts()
    this.stepEnemyMotion()
    this.stepEnemyAttacks()
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

  /**
   * Drops bullets that have left the world.
   *
   * Nothing culled bullets before this. A player round usually ends on an enemy
   * or a platform, so the omission hid - but an enemy round fired to the left over
   * an empty stretch of stage kept flying forever: one was found at x = -8839
   * still moving at -300px/s after thirty seconds of simulation. Every one of
   * those is walked by the hit pass, the blast pass and the player-damage check
   * on every step, so a long stage accumulated them without bound.
   *
   * The margin is generous on purpose: a thrown round can arc a long way below
   * the floor and still be on its way somewhere, and culling it early would make
   * lobbed weapons vanish mid-flight.
   */
  private cullBullets(): void {
    const margin = 200
    let minX = 0
    let maxX = 0
    let maxY = 0
    for (const platform of this.platforms) {
      minX = Math.min(minX, platform.x)
      maxX = Math.max(maxX, platform.x + platform.width)
      maxY = Math.max(maxY, platform.y + platform.height)
    }
    if (this.exit !== null) {
      maxX = Math.max(maxX, this.exit.x + this.exit.width)
      maxY = Math.max(maxY, this.exit.y + this.exit.height)
    }

    this.bullets = this.bullets.filter(
      (bullet) =>
        bullet.position.x > minX - margin &&
        bullet.position.x < maxX + margin &&
        bullet.position.y < maxY + margin &&
        bullet.position.y > -margin * 4,
    )
  }

  /** Bullet-vs-target resolution, honouring pierce and the faction rules. */
  private resolveBulletHits(): void {
    // The early return used to be "no targets, nothing to resolve". That was true
    // while an enemy was the only thing a bullet could hit; a boss stage declares
    // no targets and the boss is hit by the same pass, so returning here skipped
    // the boss as well and the whole fight became one-directional.
    if (this.targets.length === 0 && this.boss === null) return

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
        this.applyDamageToTarget(target, this.damageAfterArmour(bullet, target), bullet.position)
        if (bullet.remainingPierces > 0) {
          bullet.remainingPierces -= 1
        } else {
          spent = true
        }
      }

      // The boss is tested on its own, not inside the target loop. It used to be
      // checked there, which meant a boss stage - whose targets list is empty -
      // never ran the check at all, so the boss could not be shot.
      if (!spent && this.bulletHitsBoss(box)) {
        this.damageBossBy(bullet.damage, bullet.position)
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

  /** True when a bullet box overlaps the boss's hit area. */
  private bulletHitsBoss(box: Rect): boolean {
    const boss = this.boss
    if (boss === null || boss.defeated) return false
    return overlaps(box, boss.box)
  }

  /**
   * Damage one round really deals once an armoured front is taken into account.
   *
   * A round that pierces asks for no special treatment: damageAgainst already
   * answers "armour does not apply" for it, which is what makes the piercing
   * weapon the answer to a shield the player cannot walk around.
   */
  private damageAfterArmour(bullet: Bullet, target: TargetState): number {
    const definition = motionDefinition(target.archetype)
    if (definition === undefined) return bullet.damage
    const facing = this.facings.get(target.id) ?? -1
    return armourDamage(
      definition,
      bulletBox(bullet),
      target.box,
      facing,
      bullet.damage,
      bullet.remainingPierces > 0,
    )
  }

  /**
   * Applies damage to one target and reports it; scoring lives here and nowhere else.
   *
   * A hit absorbed by armour still emits its hit event with zero damage, so the
   * presentation layer can ring the same impact sound the player already reads as
   * "that did nothing".
   */
  /**
   * Mirrors a hit on an echo back into the echo bookkeeping.
   *
   * The target and the echo are two views of one thing: the target is what
   * bullets and blasts collide with, the echo is what decides whether the body is
   * reachable. Applying damage to only one of them would leave the body hidden
   * forever after the last echo dies.
   */
  private syncEchoDamage(target: TargetState): void {
    if (!target.id.startsWith('echo-')) return
    if (target.hp > 0) return
    damageEcho(this.echoes, target.id, Number.MAX_SAFE_INTEGER)
  }

  private applyDamageToTarget(target: TargetState, damage: number, at: Vec2): void {
    if (damage <= 0) {
      this.eventQueue.push({
        type: 'hit',
        targetId: target.id,
        damage: 0,
        position: { x: at.x, y: at.y },
      })
      return
    }
    this.eventQueue.push({
      type: 'hit',
      targetId: target.id,
      damage,
      position: { x: at.x, y: at.y },
    })
    // damageTarget returns true when this hit destroyed the target.
    const killed = damageTarget(target, damage)
    this.syncEchoDamage(target)
    if (!killed) return

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
        solidPlatforms(this.platforms, this.terrain, this.elapsedSeconds).some((platform) =>
          overlaps(box, platform),
        ) ||
        this.targets.some((target) => target.alive && overlaps(box, target.box)) ||
        this.bulletHitsBoss(box)
      if (!contact) {
        survivors.push(bullet)
        continue
      }

      this.eventQueue.push({
        type: 'explosion',
        position: { x: bullet.position.x, y: bullet.position.y },
        radius,
      })
      if (this.boss !== null && !this.boss.defeated) {
        const centre = {
          x: this.boss.box.x + this.boss.box.width / 2,
          y: this.boss.box.y + this.boss.box.height / 2,
        }
        const dx = centre.x - bullet.position.x
        const dy = centre.y - bullet.position.y
        if (Math.hypot(dx, dy) <= radius) this.damageBossBy(bullet.damage, bullet.position)
      }
      // A blast is what breaks terrain: chips of a platform take the damage the
      // bomb was already spending, so the player's own gun is the key.
      applyBlast(this.platforms, this.terrain, bullet.position, radius)
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
    // Echoes are obstacles, not bodies. They are solid so a bullet can hit them,
    // and that same solidity made walking into one cost a heart - three echoes in
    // a line means three hearts, which ended the interlude before the player
    // could clear it.
    const touching = this.targets.some(
      (target) => target.alive && !target.id.startsWith('echo-') && overlaps(box, target.box),
    )
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
    // A vertical stage's exit sits at the bottom and is cleared on the way down;
    // a horizontal one is a door the player has to walk into.
    if (!reachedExit(playerRect(this.player), this.exit, this.scrollMode)) return
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
