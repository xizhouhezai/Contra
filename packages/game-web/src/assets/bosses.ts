import type { BossId } from '@contra/game-core'

/**
 * Boss portraits.
 *
 * The rules layer already names each form distinctly - claude-auditor,
 * claude-rewriter, gpt-corpus, gpt-emergent - so the portrait maps straight to
 * the id. No phase arithmetic is needed here, which means the picture cannot
 * disagree with which form the fight is actually in.
 *
 * The generated originals were RGB on flat white; scripts/cutout-bosses.py
 * flood-fills the background away from the border, which is what keeps Claude's
 * white outfit and pale hair intact - a plain threshold ate them.
 */

/** Size of the source art; portraits are drawn scaled down from this. */
export const BOSS_ART_HEIGHT = 1008

const modules = import.meta.glob('../../../../docs/game/requirements/assets/bosses/cutout/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byName.set(name, url)
}

/** Texture key for one boss form. */
export function bossArtKey(bossId: BossId): string {
  return `bossArt-${bossId}`
}

/** The url for one boss form, or undefined when it is absent. */
export function bossArtUrl(bossId: BossId): string | undefined {
  return byName.get(bossId)
}

/** True when a form has a portrait. */
export function hasBossArt(bossId: BossId): boolean {
  return byName.has(bossId)
}

/** Every boss id that has art, sorted. */
export function bossFormsWithArt(): BossId[] {
  return [...byName.keys()].sort() as BossId[]
}
