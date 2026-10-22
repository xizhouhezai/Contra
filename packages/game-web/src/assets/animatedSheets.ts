import type { CharacterId } from '@contra/game-core'
import { ANIMATION_CLIPS, type AnimationClip, FRAME_SIZE } from './animated'

/**
 * Sprite sheet lookup for the generated action frames.
 *
 * Eager, unlike the chibi looks: a stage always needs its player's frames, so
 * deferring the import would only add a fetch before the first frame. The whole
 * set is 1.4MB for six characters, well inside the first-load budget.
 */

const modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/animated-sheets/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byName.set(name, url)
}

/** The url for one character's clip, or undefined when that sheet is absent. */
export function sheetUrl(character: CharacterId, clip: AnimationClip): string | undefined {
  // byName is keyed by file name (deepseek-idle); sheetKey carries the anim-
  // prefix used for the Phaser texture, so the prefix is stripped here.
  return byName.get(`${character}-${clip}`)
}

/** True when a character has generated frames at all. */
export function hasFrames(character: CharacterId): boolean {
  return ANIMATION_CLIPS.some((clip) => byName.has(`${character}-${clip}`))
}

/** Every clip a character actually has, in play order. */
export function clipsFor(character: CharacterId): AnimationClip[] {
  return ANIMATION_CLIPS.filter((clip) => byName.has(`${character}-${clip}`))
}

/** Frame size, re-exported so callers do not import two modules. */
export { FRAME_SIZE }
