export type {
  BossPhaseChangedEvent,
  CoreEvent,
  CoreEventType,
  EnemyDiedEvent,
  ExplosionEvent,
  HitEvent,
  InputProvider,
  PlayerDiedEvent,
  PlayerHurtEvent,
  ShotEvent,
  StageClearedEvent,
  WeaponPickedEvent,
  WorldOptions,
  WorldSnapshot,
} from './core.js'
export { World } from './core.js'
export { CHARACTER_IDS, INITIAL_WEAPON } from './data/characters.js'
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
export type { GrayboxStageDefinition } from './data/stages.js'
export { GRAYBOX_STAGE } from './data/stages.js'
export type {
  BossId,
  CharacterId,
  Difficulty,
  EntityId,
  InputState,
  MechanicId,
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
export {
  consumeShot,
  createWeaponSlot,
  ensureFallbackWeapon,
  equipWeapon,
  hasAmmo,
  hasUsableWeapon,
  resolveActiveSlot,
} from './systems/Arsenal.js'
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
export { updateMovement } from './systems/Movement.js'
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
