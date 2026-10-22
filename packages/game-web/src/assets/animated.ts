import type { CharacterId } from '@contra/game-core'

/**
 * Action frames for the six playable characters.
 *
 * These replaced the borrowed Greek soldier. Each character has five clips,
 * packed from individually generated frames by scripts/pack-sprites.py: the
 * character is normalised to a common scale so the frames sit on one baseline,
 * and anchored at the bottom so a standing character's feet do not bob.
 *
 * Frame counts differ per clip because that is what was authored - idle needs
 * three to read as breathing, walk needs four to read as a stride.
 */

/** The five clips every character ships with. */
export const ANIMATION_CLIPS = ['idle', 'walk', 'attack', 'jump', 'hurt'] as const
export type AnimationClip = (typeof ANIMATION_CLIPS)[number]

/** Which clip to play for a gameplay state. */
export type AnimationState = AnimationClip | 'die'

/** Frame size of every packed sheet. */
export const FRAME_SIZE = 256

/** Playback rate per clip. Attack is the fastest so a shot reads as a shot. */
export const CLIP_FRAME_RATE: Record<AnimationClip, number> = {
  idle: 6,
  walk: 10,
  attack: 14,
  jump: 8,
  hurt: 10,
}

/** Clips that loop; the rest play once and hold. */
export function clipLoops(clip: AnimationClip): boolean {
  return clip === 'idle' || clip === 'walk'
}

/**
 * Maps the rule layer's state onto a clip.
 *
 * Firing wins over moving, because a character shooting while walking should
 * look like it is shooting. Being hurt wins over firing: a hit interrupts.
 */
export function stateFor(input: {
  readonly moveX: number
  readonly firing: boolean
  readonly inAir: boolean
  readonly hurt: boolean
  readonly hearts: number
}): AnimationState {
  if (input.hearts <= 0) return 'die'
  if (input.hurt) return 'hurt'
  if (input.firing) return 'attack'
  if (input.inAir) return 'jump'
  if (input.moveX !== 0) return 'walk'
  return 'idle'
}

/**
 * Texture key for one character's clip.
 *
 * The anim- prefix is load-bearing. manifest.ts already registers the old
 * placeholder sheets under `deepseek-idle` and friends, and a second texture
 * with the same key is silently dropped - which is how the generated frames
 * ended up drawing a 192x48 grey placeholder instead of the real sheet.
 */
export function sheetKey(character: CharacterId, clip: AnimationClip): string {
  return `anim-${character}-${clip}`
}

/**
 * Attribution.
 *
 * The frames were generated for this project from the ZipZipPipe character
 * designs, which are CC BY-NC-SA 4.0 - non-commercial, share-alike. That is
 * why the project stays non-commercial.
 */
export const FRAME_CREDIT = {
  basis: 'ZipZipPipe character designs (Bilibili UID 4168597)',
  license: 'CC BY-NC-SA 4.0',
} as const
