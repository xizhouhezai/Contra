import type { BossId } from '@contra/game-core'

/**
 * Boss portraits.
 *
 * The rules layer already names each form distinctly - claude-auditor,
 * claude-rewriter, gpt-corpus, gpt-emergent - so for three of the four fights
 * the portrait maps straight to the id. The exception is the GPT fight, whose
 * four phases share one definition id and therefore need the phase table below
 * to tell 语料 from 涌现.
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

/**
 * Portraits a fight shows per phase, for the forms its id cannot express.
 *
 * The GPT fight runs four phases off one definition id (gpt-emergent), so the id
 * alone would show 涌现 from the first frame and never change. These are the
 * phase-to-form crossings from characters.md: 语料 holds until the body splits
 * at 40%, and 涌现 takes over once the echoes are gone.
 *
 * Neither Claude boss appears here, and that is the documented behaviour rather
 * than an omission: stages.md gives stage 4 a single form whose moves only speed
 * up below half HP, and stage 8 the actual form change. Mapping stage 4's second
 * phase to 改写者 would show stage 8's boss during stage 4.
 */
const PHASE_FORMS: Readonly<Record<string, readonly BossId[] | undefined>> = {
  'gpt-emergent': ['gpt-corpus', 'gpt-corpus', 'gpt-emergent', 'gpt-emergent'],
}

/**
 * Portrait ids to try for one fight state, most specific first.
 *
 * A phase that has no portrait of its own falls back to the fight's own form
 * and then to any form that has art. That order is the requirement, not a
 * convenience: an unillustrated phase has to show a different form rather than
 * a white hole where the boss stands.
 */
export function bossArtPreference(bossId: BossId, phase: number): BossId[] {
  const order: BossId[] = []
  const add = (id: BossId | undefined): void => {
    if (id !== undefined && byName.has(id) && !order.includes(id)) order.push(id)
  }

  const forms = PHASE_FORMS[bossId]
  if (forms !== undefined) add(forms[Math.max(0, Math.floor(phase) - 1)])
  add(bossId)
  for (const id of bossFormsWithArt()) add(id)
  return order
}
