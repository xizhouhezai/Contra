export type {
  BossPhaseChangedEvent,
  CoreEvent,
  CoreEventType,
  EnemyDiedEvent,
  ExplosionEvent,
  HitEvent,
  InputProvider,
  MinibossClearedEvent,
  MinibossStartedEvent,
  PlayerDiedEvent,
  PlayerHurtEvent,
  ShotEvent,
  StageClearedEvent,
  WaveStartedEvent,
  WeaponPickedEvent,
  WorldOptions,
  WorldSnapshot,
} from './core.js'
export { World } from './core.js'
export {
  ACT_III_STAGES,
  INTERLUDES,
  STAGE_09,
  STAGE_10,
  STAGE_11,
  STAGE_12,
  totalCampaignSeconds,
} from './data/act3.js'
export {
  BOSSES,
  bossDefinition,
  CLAUDE_AUDITOR,
  CLAUDE_REWRITER,
  stageBossDefinition,
} from './data/bosses.js'
export {
  CAMPAIGN_STAGES,
  STAGE_01,
  STAGE_02,
  STAGE_03,
  STAGE_04,
  STAGE_05,
  STAGE_06,
  STAGE_07,
  STAGE_08,
} from './data/campaign.js'
export type {
  BombId,
  CharacterDefinition,
  PassiveId,
} from './data/characters.js'
export {
  CHARACTER_IDS,
  CHARACTERS,
  characterDefinition,
  INITIAL_WEAPON,
  PASSIVE_TUNING,
} from './data/characters.js'
export {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  FIXED_STEP_SECONDS,
  GRAVITY,
  INVULNERABLE_SECONDS,
  JUMP_SPEED,
  MAX_QUEUED_EVENTS,
  MAX_STEPS_PER_FRAME,
  MOVE_SPEED,
  PLAYER_HEARTS,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PULSE_DAMAGE,
  PULSE_FIRE_INTERVAL_SECONDS,
  PULSE_PROJECTILE_SPEED,
  PULSE_SHOTS_PER_SECOND,
  TIME_EPSILON,
} from './data/constants.js'
export type { CoopLifeMode, CoopSettings } from './data/coop.js'
export { COOP, coopEnabled, playerSlotCount } from './data/coop.js'
export type { DifficultySettings } from './data/difficulty.js'
export {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  difficultySettings,
  scaledDamage,
  scaledScore,
} from './data/difficulty.js'
export type { EnemyBehaviour, EnemyDefinition, EnemyState } from './data/enemies.js'
export {
  absorbsHit,
  canTransition,
  ENEMIES,
  ENEMY_IDS,
  enemyDefinition,
  TRANSITIONS,
  transition as transitionEnemyState,
} from './data/enemies.js'
export type { EnemyAttackKind, EnemyWeapon } from './data/enemyWeapons.js'
export { ENEMY_WEAPONS, enemyWeapon, maxConcurrentShooters } from './data/enemyWeapons.js'
export { GPT_PETER_PAN, GPT_PHASE_LABELS, gptPhaseFor } from './data/gptBoss.js'
export type { LookChoices } from './data/looks.js'
export { loadLookChoices, resolveLookId, saveLookChoice } from './data/looks.js'
export {
  isMinibossId,
  MINIBOSS_AUDIT_CLERK,
  MINIBOSS_DOCK_FOREMAN,
  MINIBOSS_HIT_HEIGHT,
  MINIBOSS_HIT_WIDTH,
  MINIBOSS_IDS,
  MINIBOSS_PIPE_WARDEN,
  MINIBOSS_SCAFFOLD_CRANE,
  MINIBOSSES,
  minibossDefinition,
} from './data/minibosses.js'
export type { GrayboxStageDefinition } from './data/stages.js'
export { GRAYBOX_STAGE } from './data/stages.js'
export type { StageDefinition } from './data/stageTypes.js'
export type {
  BossId,
  CharacterId,
  Difficulty,
  EntityId,
  FightId,
  InputState,
  MechanicId,
  MinibossId,
  MutableVec2,
  PlatformDefinition,
  Rect,
  Vec2,
  WeaponDefinition,
  WeaponId,
  WeaponKind,
} from './data/types.js'
export {
  BEAM_RANGE,
  explosionRadius,
  FALLBACK_WEAPON_ID,
  HOMING_LOCK_LIMIT,
  THROW_GRAVITY,
  THROW_LAUNCH_SPEED_Y,
  THROWABLE_WEAPONS,
  WEAPON_IDS,
  WEAPONS,
  weaponDefinition,
} from './data/weapons.js'
export type { Bullet, BulletOptions, BulletOwner } from './entities/Bullet.js'
export { createBullet, stepBullet } from './entities/Bullet.js'
export type { PlayerOptions, PlayerState, WeaponSlot } from './entities/Player.js'
export {
  activeWeaponSlot,
  createPlayer,
  playerRect,
  WEAPON_SLOT_COUNT,
} from './entities/Player.js'
export type { MutableRect, TargetDefinition, TargetState } from './entities/Target.js'
export { createTarget, damageTarget } from './entities/Target.js'
export type {
  BossDefinition,
  BossMove,
  BossPhase,
  BossRuntimeState,
  BossStepResult,
} from './stages/BossDirector.js'
export {
  createBossState,
  damageBoss,
  hpFraction,
  isTelegraphing,
  phaseForHp,
  stepBoss,
} from './stages/BossDirector.js'
export type {
  CampaignProgress,
  Grade,
  ProgressStorage,
  RunResult,
  StageRecord,
} from './stages/Progress.js'
export {
  clearProgress,
  emptyProgress,
  gradeRun,
  isUnlocked,
  loadProgress,
  recordClear,
  saveProgress,
} from './stages/Progress.js'
export type { StageProgress } from './stages/StageRunner.js'
export { findStage, StageRunner } from './stages/StageRunner.js'
export {
  consumeShot,
  createWeaponSlot,
  ensureFallbackWeapon,
  equipWeapon,
  hasAmmo,
  hasUsableWeapon,
  resolveActiveSlot,
} from './systems/Arsenal.js'
export type { BombEffect, BombState } from './systems/Bombs.js'
export {
  bombActive,
  bombEffect,
  canDetonate,
  createBombState,
  detonate,
  INITIAL_BOMBS,
  updateBomb,
} from './systems/Bombs.js'
export { overlaps, rayBoxDistance } from './systems/Collision.js'
export type { Damageable, DamageResult, Faction } from './systems/Combat.js'
export {
  accumulateSpread,
  applyHit,
  canDamage,
  isHostile,
  isInvulnerable,
  recoverSpread,
  SPREAD_GAIN_PER_SHOT,
  SPREAD_RECOVERY_PER_SECOND,
  spreadOffsetRadians,
} from './systems/Combat.js'
export type { Echo, EchoState } from './systems/Echoes.js'
export {
  allEchoesCleared,
  bodyUntargetable,
  createEchoState,
  damageEcho,
  ECHO_COUNT,
  echoesRemaining,
  maybeSplit,
  SPLIT_THRESHOLD,
} from './systems/Echoes.js'
export type { AttackState, AttackStep } from './systems/EnemyAttack.js'
export {
  createAttackState,
  enemyCentre,
  stepAttack,
  volleyDirections,
} from './systems/EnemyAttack.js'
export type {
  AttackSide,
  EnemyMotion,
  MotionBounds,
  MotionBox,
  MotionContext,
} from './systems/EnemyBehaviour.js'
export {
  attackSide,
  CHARGER_CHARGE_BOOST,
  CHARGER_SIGHT_PX,
  canReachFlyer,
  damageAgainst,
  FLYER_AMPLITUDE_PX,
  FLYER_CLIMB_RATIO,
  FLYER_HOVER_PX,
  FLYER_MIN_AIM_OFFSET_PX,
  FLYER_WEAVE_RATE,
  inSight,
  KNOCKBACK_SECONDS,
  knockBack,
  MELEE_RANGE_PX,
  motionBounds,
  motionDefinition,
  PATROL_SIGHT_PX,
  stepCharger,
  stepFlyer,
  stepMotion,
} from './systems/EnemyBehaviour.js'
export type { RiderFeet } from './systems/MechanicEffects.js'
export {
  armourDamage,
  bulletBox,
  facingFromMotion,
  platformCarry,
  reflectBulletsOffWalls,
  solidPlatforms,
} from './systems/MechanicEffects.js'
export {
  bounceOffWalls,
  isOneWay,
  reflectVelocity,
  shouldLand,
  struckFace,
  type WallFace,
} from './systems/Mechanics.js'
export type {
  MinibossPlacement,
  MinibossStaging,
} from './systems/Miniboss.js'
export {
  createMinibossStaging,
  minibossRouteOpen,
  minibossSeconds,
  minibossTriggered,
} from './systems/Miniboss.js'
export type { MirrorState } from './systems/Mirror.js'
export {
  createMirrorState,
  MIRROR_BASE_WEAPON,
  MIRROR_COPY_SECONDS,
  mirrorWeapon,
  observePlayerWeapon,
  updateMirror,
} from './systems/Mirror.js'
export { updateMovement } from './systems/Movement.js'
export type { Poolable, PoolOptions } from './systems/ObjectPool.js'
export { ObjectPool } from './systems/ObjectPool.js'
export type { PassiveState } from './systems/Passives.js'
export {
  addMemoryMark,
  createPassiveState,
  extraHomingLocks,
  extraPrismTargets,
  foresightLeadSeconds,
  homingDamageMultiplier,
  registerRhythmKill,
  spreadGainFor,
} from './systems/Passives.js'
export type { ScoreState } from './systems/Score.js'
export {
  accuracy,
  COMBO_BONUS_CAP,
  COMBO_BONUS_PER_STEP,
  COMBO_WINDOW_SECONDS,
  comboMultiplier,
  createScoreState,
  registerHit,
  registerKill,
  registerShot,
  updateScore,
} from './systems/Score.js'
export type { SpatialEntry } from './systems/SpatialHash.js'
export { CELL_SIZE, cellRange, SpatialHash } from './systems/SpatialHash.js'
export type {
  PlatformMotion,
  ScrollMode,
  TerrainPlatform,
  TerrainState,
} from './systems/Terrain.js'
export {
  applyBlast,
  blocksMovement,
  createTerrainState,
  isVerticalScroll,
  motionOffset,
  platformAt,
  platformDelta,
  platformId,
  reachedExit,
} from './systems/Terrain.js'
export type { Wave, WaveSpawn, WaveState } from './systems/Wave.js'
export {
  createWaveState,
  dueSpawns,
  routeOpen,
  triggersOn,
  waveCleared,
  waveSeconds,
} from './systems/Wave.js'
export type { FireOutcome, LockCandidate, WeaponState } from './systems/Weapons.js'
export {
  AIM_DIRECTIONS,
  aimVector,
  createWeaponState,
  fireInterval,
  nearestTarget,
  releaseExpiredLocks,
  requestLock,
  updateWeapons,
} from './systems/Weapons.js'
