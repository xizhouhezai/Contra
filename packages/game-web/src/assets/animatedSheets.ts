import { ANIMATED_CLIPS } from './animated'

/**
 * Url lookup for the free animated sheets.
 *
 * Kept apart from animated.ts so the clip table stays plain data that a test
 * can import without pulling in Vite's import.meta.glob.
 *
 * Non-eager for the same reason as the chibi looks: 1.3MB of sheets that most
 * stages never draw should not be in the first load.
 */

const modules = import.meta.glob('../../../../docs/game/requirements/assets/free-animated/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byName.set(name, url)
}

/** The image url for a clip key, or undefined when the sheet is absent. */
export function animatedUrl(clipKey: string): string | undefined {
  return byName.get(clipKey)
}

/** Every clip that actually shipped. */
export function availableClips() {
  return ANIMATED_CLIPS.filter((clip) => byName.has(clip.key))
}
