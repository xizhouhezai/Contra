/**
 * Dynamic terrain: breakable platforms, moving platforms and scroll modes.
 *
 * Source of truth: docs/game/requirements/stages.md - 幕 III 机制
 * (T-M3-01, T-M3-02, T-M3-03).
 *
 * Moving platforms are pure functions of time. That is deliberate: an
 * accumulating position drifts under a fixed step, and two runs of the same
 * input would then disagree - the one property the whole rule layer rests on.
 */
import type { PlatformDefinition, Rect, Vec2 } from '../data/types.js'

/** How a platform moves, if at all. */
export interface PlatformMotion {
  readonly axis: 'horizontal' | 'vertical'
  /** Peak displacement from the resting position, px. */
  readonly amplitudePx: number
  /** Seconds for one full there-and-back cycle. */
  readonly periodSeconds: number
  /** Offset into the cycle, in seconds, so two platforms can be out of phase. */
  readonly phaseSeconds: number
}

/** A platform that may move and may be destroyed. */
export interface TerrainPlatform extends Rect {
  /** Present when the platform oscillates. */
  readonly motion?: PlatformMotion
  /** Damage needed to break it; absent means indestructible. */
  readonly breakableHp?: number
  /** Loot revealed once it breaks. */
  readonly reveals?: { readonly id: string; readonly x: number; readonly y: number }
}

/** Which way a stage scrolls as the player advances. */
export type ScrollMode = 'horizontal' | 'vertical'

/**
 * Where a motion platform sits at a given time.
 *
 * Pure: the same `seconds` always yields the same offset. Uses a cosine so the
 * platform eases at both ends instead of snapping at the turnaround.
 */
export function motionOffset(motion: PlatformMotion, seconds: number): number {
  const cycle = (seconds + motion.phaseSeconds) / motion.periodSeconds
  return Math.cos(cycle * Math.PI * 2) * motion.amplitudePx
}

/** The platform's rectangle at a given time, with motion applied. */
export function platformAt(platform: TerrainPlatform, seconds: number): Rect {
  if (platform.motion === undefined) {
    return { x: platform.x, y: platform.y, width: platform.width, height: platform.height }
  }
  const offset = motionOffset(platform.motion, seconds)
  const dx = platform.motion.axis === 'horizontal' ? offset : 0
  const dy = platform.motion.axis === 'vertical' ? offset : 0
  return {
    x: platform.x + dx,
    y: platform.y + dy,
    width: platform.width,
    height: platform.height,
  }
}

/** A platform's destroyed/revealed state, kept outside the definition. */
export interface TerrainState {
  /** Remaining HP per breakable platform id. */
  readonly hp: Map<string, number>
  /** Platform ids already destroyed. */
  readonly destroyed: Set<string>
  /** Loot ids already collected. */
  readonly collected: Set<string>
}

export function createTerrainState(): TerrainState {
  return { hp: new Map(), destroyed: new Set(), collected: new Set() }
}

/** Stable id for a platform, since Rect carries none. */
export function platformId(_platform: TerrainPlatform, index: number): string {
  return `platform-${index}`
}

/**
 * Applies blast damage to every breakable platform in range.
 *
 * Returns the ids that broke on this hit, so the caller can spawn their loot and
 * emit effects without re-deriving which platform changed.
 */
export function applyBlast(
  platforms: readonly TerrainPlatform[],
  state: TerrainState,
  centre: Vec2,
  radius: number,
): readonly string[] {
  const broken: string[] = []

  platforms.forEach((platform, index) => {
    if (platform.breakableHp === undefined) return
    const id = platformId(platform, index)
    if (state.destroyed.has(id)) return

    const rect = platformAt(platform, 0)
    const nearestX = Math.max(rect.x, Math.min(centre.x, rect.x + rect.width))
    const nearestY = Math.max(rect.y, Math.min(centre.y, rect.y + rect.height))
    const distance = Math.hypot(centre.x - nearestX, centre.y - nearestY)
    if (distance > radius) return

    const remaining = (state.hp.get(id) ?? platform.breakableHp) - 1
    state.hp.set(id, remaining)
    if (remaining <= 0) {
      state.destroyed.add(id)
      broken.push(id)
    }
  })

  return broken
}

/** True when the platform still blocks movement. */
export function blocksMovement(
  platform: TerrainPlatform,
  state: TerrainState,
  index: number,
): boolean {
  return !state.destroyed.has(platformId(platform, index))
}

/**
 * How far a platform carried a rider this step.
 *
 * The delta between two sample times, so a rider moves exactly with the terrain
 * rather than being teleported to its surface each frame.
 */
export function platformDelta(
  platform: TerrainPlatform,
  fromSeconds: number,
  toSeconds: number,
): Vec2 {
  const before = platformAt(platform, fromSeconds)
  const after = platformAt(platform, toSeconds)
  return { x: after.x - before.x, y: after.y - before.y }
}

/**
 * Whether a shot aimed horizontally can enter a vertical stage.
 *
 * Vertical stages place the exit below the player, so progress is downward and
 * the camera follows y. Kept as a predicate so the World does not scatter the
 * comparison.
 */
export function isVerticalScroll(mode: ScrollMode): boolean {
  return mode === 'vertical'
}

/** Exit test for either scroll mode: the box the player must reach. */
export function reachedExit(player: Rect, exit: Rect, mode: ScrollMode): boolean {
  const overlapX = player.x < exit.x + exit.width && player.x + player.width > exit.x
  // A vertical stage's exit sits at the bottom, so only the downward edge matters.
  if (isVerticalScroll(mode)) {
    return overlapX && player.y + player.height >= exit.y
  }
  const overlapY = player.y < exit.y + exit.height && player.y + player.height > exit.y
  return overlapX && overlapY
}

/** Unused-platform guard so PlatformDefinition stays imported for readers. */
export type TerrainAsPlatformDefinition = PlatformDefinition
