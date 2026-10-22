/**
 * Clear stamps - the rank badge pressed onto the result screen.
 *
 * Four images, one per outcome. The rule layer grades a run with a letter; this
 * maps that letter to the stamp that represents it. C has no stamp of its own
 * and falls back to the plain CLEAR mark, because a run that merely finished
 * should not be dressed up as an achievement.
 */

/** Grades the rule layer can produce. */
export type StampGrade = 'S' | 'A' | 'B' | 'C'

const STAMP_FILES: Record<StampGrade, string> = {
  S: 's-rank',
  A: 'a-rank',
  B: 'b-rank',
  C: 'clear',
}

const modules = import.meta.glob('../../../../docs/game/requirements/assets/stamps/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byName.set(name, url)
}

/** Texture key for one grade's stamp. */
export function stampKey(grade: StampGrade): string {
  return `stamp-${grade}`
}

/** The url for one grade's stamp, or undefined when it is absent. */
export function stampUrl(grade: StampGrade): string | undefined {
  const file = STAMP_FILES[grade]
  return byName.get(file)
}

/** True when a grade has a stamp image. */
export function hasStamp(grade: StampGrade): boolean {
  return stampUrl(grade) !== undefined
}

/** Which stamp a raw grade string maps to. */
export function stampFor(grade: string): StampGrade {
  const upper = grade.trim().toUpperCase()
  if (upper.startsWith('S')) return 'S'
  if (upper.startsWith('A')) return 'A'
  if (upper.startsWith('B')) return 'B'
  return 'C'
}

/** Every grade, for preloading. */
export const STAMP_GRADES: readonly StampGrade[] = ['S', 'A', 'B', 'C']
