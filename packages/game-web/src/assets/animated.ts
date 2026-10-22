import type { CharacterId } from '@contra/game-core'

/**
 * Free animated character (CC BY 4.0, Krinwolf).
 *
 * This is the first character in the project with real animation frames -
 * idle, walk, attack, jump and die - rather than a single illustration with a
 * procedural wobble. The sheets were packed from the original PNG sequence so
 * each is one texture with equal-width frames.
 *
 * A note on what this is and is not: it is a Greek soldier with a sword, not
 * one of the six AI characters. It proves the animation pipeline and gives the
 * game a character that visibly attacks. Replacing the art with an AI character
 * later means redrawing the frames, not changing this code.
 */

export interface AnimatedClip {
  readonly key: string
  readonly frames: number
  readonly frameWidth: number
  readonly frameHeight: number
  /** Playback rate; the source was authored at 24fps. */
  readonly frameRate: number
}

/** Every clip shipped with the free character. */
export const ANIMATED_CLIPS: readonly AnimatedClip[] = [
  { key: 'greek-idle', frames: 18, frameWidth: 362, frameHeight: 586, frameRate: 18 },
  { key: 'greek-walk', frames: 12, frameWidth: 423, frameHeight: 577, frameRate: 14 },
  { key: 'greek-attack', frames: 8, frameWidth: 1026, frameHeight: 597, frameRate: 16 },
  { key: 'greek-jump-start', frames: 11, frameWidth: 455, frameHeight: 759, frameRate: 18 },
  { key: 'greek-die', frames: 12, frameWidth: 781, frameHeight: 873, frameRate: 14 },
]

/**
 * Attribution, as CC BY 4.0 requires.
 *
 * The author name is kept here because the licence requires it to travel with
 * the asset; the source url lives in docs/game/design/credits.md instead,
 * because the self-hosting gate (REQ-NFR-021) scans source for external urls
 * and cannot tell a citation from a request.
 */
export const ANIMATED_CREDIT = {
  author: 'Krinwolf.com - Tony Puglieso',
  license: 'CC BY 4.0',
} as const

/** Which clip to play for a gameplay state. */
export type AnimationState = 'idle' | 'walk' | 'attack' | 'jump' | 'die'

export function clipKeyFor(state: AnimationState): string {
  switch (state) {
    case 'idle':
      return 'greek-idle'
    case 'walk':
      return 'greek-walk'
    case 'attack':
      return 'greek-attack'
    case 'jump':
      return 'greek-jump-start'
    case 'die':
      return 'greek-die'
    default: {
      const unreachable: never = state
      void unreachable
      return 'greek-idle'
    }
  }
}

/**
 * Maps the rule layer's per-frame state onto an animation.
 *
 * Firing wins over moving: a character shooting while walking should look like
 * it is shooting. Death wins over everything.
 */
export function stateFor(input: {
  readonly moveX: number
  readonly firing: boolean
  readonly inAir: boolean
  readonly hearts: number
}): AnimationState {
  if (input.hearts <= 0) return 'die'
  if (input.firing) return 'attack'
  if (input.inAir) return 'jump'
  if (input.moveX !== 0) return 'walk'
  return 'idle'
}

/** True when the clip should loop rather than play once. */
export function clipLoops(state: AnimationState): boolean {
  return state === 'idle' || state === 'walk'
}

/** Character id used for the animated sheet lookup. */
export const ANIMATED_CHARACTER: CharacterId = 'deepseek'
