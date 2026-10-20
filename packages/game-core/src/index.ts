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
export {
  FIXED_STEP_SECONDS,
  GRAVITY,
  JUMP_SPEED,
  MAX_STEPS_PER_FRAME,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PULSE_DAMAGE,
  PULSE_FIRE_INTERVAL_SECONDS,
  PULSE_PROJECTILE_SPEED,
  PULSE_SHOTS_PER_SECOND,
  TIME_EPSILON,
} from './data/constants.js'
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
  WeaponId,
} from './data/types.js'
export type { Bullet, BulletOwner } from './entities/Bullet.js'
export { stepBullet } from './entities/Bullet.js'
export type { PlayerState } from './entities/Player.js'
export { createPlayer, playerRect } from './entities/Player.js'
export { updateMovement } from './systems/Movement.js'
export type { WeaponState } from './systems/Weapons.js'
export { AIM_DIRECTIONS, aimVector, createWeaponState, updateWeapons } from './systems/Weapons.js'
