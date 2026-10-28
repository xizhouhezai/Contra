/**
 * Enemy behaviour: chase, flight and armour.
 *
 * Source of truth: docs/game/requirements/stages.md - 机制 and
 * docs/game/design/modules.md - 敌人行为.
 *
 * Each function is a pure step: given an enemy, the player position and a time
 * delta, it returns the new position and state. The World owns the list; these
 * own the rules. That split is what lets behaviour be unit-tested without
 * building a stage.
 */
import { ENEMIES, type EnemyDefinition, type EnemyState } from '../data/enemies.js'
import type { EnemyId, PlatformDefinition, Vec2 } from '../data/types.js'
import { overlaps } from './Collision.js'

/** Distance at which a charger starts its run, px. */
export const CHARGER_SIGHT_PX = 320

/** Speed multiplier while a charger is winding up. */
export const CHARGER_CHARGE_BOOST = 1.6

/** Seconds a charger stays knocked back after being hit, s. */
export const KNOCKBACK_SECONDS = 0.35

/** Amplitude of a flyer's vertical weave, px. */
export const FLYER_AMPLITUDE_PX = 48

/** Angular speed of a flyer's weave, rad/s. */
export const FLYER_WEAVE_RATE = 2

/**
 * How high above a flyer a shot must be aimed to connect, px.
 *
 * The player's horizontal shot travels level; a flyer bobbing above the muzzle
 * line is out of reach unless the aim is raised. Keeping the number here means
 * the stage spec and the enemy spec cannot drift apart.
 */
export const FLYER_MIN_AIM_OFFSET_PX = 24

export interface EnemyMotion {
  readonly position: Vec2
  readonly state: EnemyState
  /** Seconds of knockback still to run. */
  readonly knockedSeconds: number
}

/** True when the player is within the charger's sight range. */
export function inSight(enemy: Vec2, player: Vec2, sightPx = CHARGER_SIGHT_PX): boolean {
  return Math.abs(player.x - enemy.x) <= sightPx
}

/**
 * Steps a charger toward the player.
 *
 * Knockback takes precedence: while it runs the enemy slides away and does not
 * close distance, which is what makes a hit feel like it bought the player room.
 */
export function stepCharger(
  definition: EnemyDefinition,
  motion: EnemyMotion,
  player: Vec2,
  dt: number,
): EnemyMotion {
  if (motion.knockedSeconds > 0) {
    const remaining = Math.max(0, motion.knockedSeconds - dt)
    const direction = Math.sign(motion.position.x - player.x) || 1
    const slide = definition.speed * 0.5 * dt * direction
    return {
      position: { x: motion.position.x + slide, y: motion.position.y },
      state: remaining > 0 ? 'hurt' : 'chase',
      knockedSeconds: remaining,
    }
  }

  if (!inSight(motion.position, player)) {
    return { ...motion, state: 'idle' }
  }

  const direction = Math.sign(player.x - motion.position.x)
  if (direction === 0) return { ...motion, state: 'attack' }

  const speed = definition.speed * CHARGER_CHARGE_BOOST
  return {
    position: { x: motion.position.x + direction * speed * dt, y: motion.position.y },
    state: 'chase',
    knockedSeconds: 0,
  }
}

/** Applies a knockback to a charger. */
export function knockBack(motion: EnemyMotion): EnemyMotion {
  return { ...motion, state: 'hurt', knockedSeconds: KNOCKBACK_SECONDS }
}

/**
 * Steps a flyer along its weave.
 *
 * Flight ignores platforms entirely - that is the mechanic: the player has to
 * look up rather than follow the ground. `phase` advances with time so the
 * weave is deterministic given the same step count.
 */
export function stepFlyer(
  definition: EnemyDefinition,
  motion: EnemyMotion,
  player: Vec2,
  phase: number,
  dt: number,
): EnemyMotion {
  const direction = Math.sign(player.x - motion.position.x) || 1
  const nextPhase = phase + FLYER_WEAVE_RATE * dt
  const x = motion.position.x + direction * definition.speed * dt
  const y = motion.position.y + Math.cos(nextPhase) * FLYER_AMPLITUDE_PX * dt
  return { position: { x, y }, state: 'chase', knockedSeconds: 0 }
}

/**
 * Whether a level shot from `muzzleY` can reach a flyer at `flyerY`.
 *
 * Used by the rule layer to decide whether a bullet passes under the target, and
 * by the tests to prove that a flat shot misses.
 */
export function canReachFlyer(muzzleY: number, flyerY: number): boolean {
  return Math.abs(flyerY - muzzleY) <= FLYER_MIN_AIM_OFFSET_PX
}

/** Which side of an enemy a shot came from. */
export type AttackSide = 'front' | 'back'

/**
 * Where a shot landed relative to an armoured enemy's facing.
 *
 * Facing is the direction the enemy looks: a shot arriving from the same side is
 * a frontal hit and is absorbed. `facing` is +1 for right, -1 for left.
 */
export function attackSide(shooterX: number, enemyX: number, facing: 1 | -1): AttackSide {
  const fromRight = shooterX > enemyX
  const lookingRight = facing === 1
  return fromRight === lookingRight ? 'front' : 'back'
}

/** How far above the player's centre a flyer holds its hover line, px. */
export const FLYER_HOVER_PX = FLYER_MIN_AIM_OFFSET_PX * 2

/**
 * Fraction of its own speed a flyer closes vertically.
 *
 * A flyer that dives as fast as it strafes reads as a missile that snaps onto
 * the player. Climbing slower than it runs keeps it a hovering hunter, and it is
 * also what leaves the player a window to line the raised shot up.
 */
export const FLYER_CLIMB_RATIO = 0.6

/**
 * Centre distance at which a ground enemy stops pressing, px.
 *
 * Stopping short of the player's centre rather than driving through it is what
 * turns the approach into a contact attack: the two boxes end up overlapping, so
 * the world's existing contact rule charges the heart and no second damage
 * channel has to exist.
 */
export const MELEE_RANGE_PX = 16

/** Distance at which a patrol notices the player and walks at them, px. */
export const PATROL_SIGHT_PX = 260

/** Distance at which the act I swarm notices the player, px. */
export const SWARM_SIGHT_PX = 420

/** How far above the player's centre the act I sniper holds its line, px. */
export const SNIPER_HOVER_PX = 130

/**
 * Fraction of its speed the sniper closes vertically.
 *
 * Slower than its strafe for the same reason a flyer climbs slowly: an enemy that
 * snaps onto the player's exact height removes the aiming decision it exists to
 * create.
 */
export const SNIPER_CLIMB_RATIO = 0.45

/** The rect enemies may not leave, in world pixels. */
export interface MotionBounds {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

/**
 * The bounds a level's platforms imply.
 *
 * The rule layer is never given a stage size - WorldOptions carries platforms
 * and an exit, never widthPx/heightPx - so the level's extent has to be read off
 * the solid geometry: a level is as wide as the union of its platforms, and
 * nothing may fall below the lowest one. There is deliberately no derived
 * ceiling. Stages place flyers far above the only floor they have (stage 6
 * hovers 140px above it), so a ceiling taken from platform tops would bury them
 * the moment they spawned.
 *
 * Null when there are no platforms at all: a world with no level data has no
 * edge to be pushed back from, and everything about bounds would be invented.
 */
export function motionBounds(platforms: readonly PlatformDefinition[]): MotionBounds | null {
  if (platforms.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const platform of platforms) {
    minX = Math.min(minX, platform.x)
    maxX = Math.max(maxX, platform.x + platform.width)
    maxY = Math.max(maxY, platform.y + platform.height)
  }
  return { minX, maxX, minY: 0, maxY }
}

/**
 * The movement definition behind an archetype string from stage data.
 *
 * Stage targets carry their archetype as a plain string, so the lookup has to be
 * guarded: an id no enemy owns must leave the box stationary rather than throw,
 * for the same reason a target with no archetype is inert.
 */
export function motionDefinition(archetype: string | undefined): EnemyDefinition | undefined {
  if (archetype === undefined) return undefined
  if (!Object.hasOwn(ENEMIES, archetype)) return undefined
  return ENEMIES[archetype as EnemyId]
}

/** A body's box as the motion step sees it: where it is and how big it is. */
export interface MotionBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** What one motion step needs to know about the world it moves through. */
export interface MotionContext {
  /** Player centre; enemies aim their approach at the middle of the body. */
  readonly player: Vec2
  readonly dt: number
  readonly platforms: readonly PlatformDefinition[]
  /** Level bounds, or null when there is no platform geometry to derive them from. */
  readonly bounds: MotionBounds | null
}

/**
 * Horizontal sweep against platform faces.
 *
 * Same resolution the player's movement uses, and for the same reason: testing
 * only the destination lets a fast body tunnel through a wall it should have
 * stopped at.
 */
function sweepX(box: MotionBox, deltaX: number, platforms: readonly PlatformDefinition[]): number {
  if (deltaX === 0) return box.x

  const targetX = box.x + deltaX
  let resolved = targetX
  for (const platform of platforms) {
    if (!overlaps({ x: targetX, y: box.y, width: box.width, height: box.height }, platform)) {
      continue
    }
    resolved = deltaX > 0 ? platform.x - box.width : platform.x + platform.width
  }
  return resolved
}

/** Pushes a position back inside the level, when it left. */
function clampToBounds(position: Vec2, box: MotionBox, bounds: MotionBounds | null): Vec2 {
  if (bounds === null) return position
  return {
    x: Math.min(Math.max(position.x, bounds.minX), Math.max(bounds.minX, bounds.maxX - box.width)),
    y: Math.min(Math.max(position.y, bounds.minY), Math.max(bounds.minY, bounds.maxY - box.height)),
  }
}

/**
 * A walker's step: close the horizontal gap to the player, then stop pressing.
 *
 * Ground movement is horizontal only and never integrates gravity. A ground
 * enemy is authored standing on a floor and walks along it, so the sweep against
 * the platform faces is the whole of its collision handling.
 */
function stepGroundApproach(
  box: MotionBox,
  context: MotionContext,
  speed: number,
  sightPx: number,
): Vec2 {
  const centreX = box.x + box.width / 2
  const gap = Math.abs(context.player.x - centreX)

  // Out of sight means standing still. A charger crossing the stage to reach a
  // player who has not arrived yet is not a charge, it is a magnet.
  if (gap === 0 || gap > sightPx) return clampToBounds({ x: box.x, y: box.y }, box, context.bounds)

  const travel = Math.min(speed * context.dt, gap - MELEE_RANGE_PX)
  if (travel <= 0) return clampToBounds({ x: box.x, y: box.y }, box, context.bounds)

  const direction = Math.sign(context.player.x - centreX)
  const x = sweepX(box, direction * travel, context.platforms)
  return clampToBounds({ x, y: box.y }, box, context.bounds)
}

/**
 * A flyer's step: seek the hover line above the player, ignoring platforms.
 *
 * Flight is the mechanic - the player has to look up rather than follow the
 * ground - so this step is handed no platforms at all; the signature is the
 * guarantee. The hover line sits a fixed distance above the player's centre so
 * the enemy stays out of a level shot: a flyer that settled onto the player's
 * height would delete the aiming decision the archetype exists to teach.
 */
function stepAirApproach(
  definition: EnemyDefinition,
  box: MotionBox,
  context: MotionContext,
): Vec2 {
  const hoverY = context.player.y - FLYER_HOVER_PX
  const dx = context.player.x - (box.x + box.width / 2)
  const dy = hoverY - (box.y + box.height / 2)

  const stepX = Math.sign(dx) * Math.min(Math.abs(dx), definition.speed * context.dt)
  const stepY =
    Math.sign(dy) * Math.min(Math.abs(dy), definition.speed * FLYER_CLIMB_RATIO * context.dt)

  return clampToBounds({ x: box.x + stepX, y: box.y + stepY }, box, context.bounds)
}

/**
 * A swarm walker's step: close distance faster than a patrol and from further.
 *
 * Mechanically a ground approach with different constants. It is a separate
 * behaviour rather than a patrol with a speed override because the *sight range*
 * is the thing that defines the archetype: a scrapper notices the player from
 * 420px, so a group of them converges instead of standing still until they are
 * walked into - which is exactly the "the enemy never noticed me" problem the
 * first version of stage 2 had.
 */
function stepSwarm(box: MotionBox, context: MotionContext, definition: EnemyDefinition): Vec2 {
  return stepGroundApproach(box, context, definition.speed, SWARM_SIGHT_PX)
}

/**
 * A sniper's step: hold a line above the player and drift toward them.
 *
 * Differs from a flyer in what it does when it arrives: a flyer keeps orbiting on
 * its weave, whereas this settles onto the hover line and stays there, which is
 * what lets it be a turret with a lock-on rather than an orbiting nuisance.
 */
function stepSniper(definition: EnemyDefinition, box: MotionBox, context: MotionContext): Vec2 {
  const hoverY = context.player.y - SNIPER_HOVER_PX
  const centreX = box.x + box.width / 2
  const dx = context.player.x - centreX
  const dy = hoverY - (box.y + box.height / 2)

  const stepX = Math.sign(dx) * Math.min(Math.abs(dx), definition.speed * context.dt)
  const stepY =
    Math.sign(dy) * Math.min(Math.abs(dy), definition.speed * SNIPER_CLIMB_RATIO * context.dt)

  return clampToBounds({ x: box.x + stepX, y: box.y + stepY }, box, context.bounds)
}

/**
 * Moves one enemy for a single fixed step, or returns null when its archetype
 * does not walk at all.
 *
 * The behaviour decides, not the archetype id: charger and patrol close distance
 * on the ground, flyer closes it through the air. Everything else keeps its
 * authored position, which is what a turret, a forge and the armoured wall are
 * supposed to do - and what a steam vent and a crane hook are, since those two
 * are pieces of the stage rather than bodies that walk.
 */
export function stepMotion(
  definition: EnemyDefinition,
  box: MotionBox,
  context: MotionContext,
): Vec2 | null {
  switch (definition.behaviour) {
    case 'charger':
      return stepGroundApproach(
        box,
        context,
        definition.speed * CHARGER_CHARGE_BOOST,
        CHARGER_SIGHT_PX,
      )
    case 'patrol':
      return stepGroundApproach(box, context, definition.speed, PATROL_SIGHT_PX)
    case 'flyer':
      return stepAirApproach(definition, box, context)
    case 'swarm-walker':
      return stepSwarm(box, context, definition)
    case 'hover-sniper':
      return stepSniper(definition, box, context)
    // Stationary archetypes: a trap is part of the floor and a hook is bolted to
    // the ceiling, so neither is moved by anything the player does.
    case 'floor-trap':
    case 'overhead-hook':
      return null
    default:
      return null
  }
}

/**
 * Damage one hit deals to an enemy, after armour.
 *
 * Piercing rounds ignore armour: that is the second answer the spec gives to an
 * armoured enemy, alongside walking around it.
 */
export function damageAgainst(
  definition: EnemyDefinition,
  side: AttackSide,
  incomingDamage: number,
  piercing: boolean,
): number {
  if (!definition.armoredFront) return incomingDamage
  if (piercing) return incomingDamage
  return side === 'front' ? 0 : incomingDamage
}
