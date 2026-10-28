import type { FightId } from '@contra/game-core'
import type Phaser from 'phaser'

/**
 * Boss portraits.
 *
 * The rules layer already names each form distinctly - claude-auditor,
 * claude-rewriter, gpt-corpus, gpt-emergent - so for three of the four fights
 * the portrait maps straight to the id. The exception is the GPT fight, whose
 * four phases share one definition id and therefore need the phase table below
 * to tell 语料 from 涌现.
 *
 * Act I's mid-stage bosses are resolved from the same lookup, because their art
 * is in the same place under the same naming rule: `miniboss-dock-foreman-q-01`
 * is frame one of the 码头工头. Keeping them in one table means the renderer never
 * has to know which kind of fight it is drawing - which is the point of having
 * one FightId.
 *
 * The generated originals were RGB on flat white; scripts/cutout-bosses.py
 * flood-fills the background away from the border, which is what keeps Claude's
 * white outfit and pale hair intact - a plain threshold ate them.
 */

/** Size of the source art; portraits are drawn scaled down from this. */
export const BOSS_ART_HEIGHT = 1008

/**
 * Size of a miniboss frame.
 *
 * Smaller than a stage boss on purpose: stage-art-prompts-batch1.md §1.3 fixes it
 * at 360x360, a third of the 1008px stage portraits. Drawing one at the stage
 * boss's height would turn a mid-stage fight into the visual climax of the stage
 * and steal the ending.
 */
export const MINIBOSS_ART_HEIGHT = 360

const stageModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/bosses/cutout/*.webp',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>

/**
 * Mid-stage boss frames.
 *
 * Four frames each, in the rules layer's phase order. Frame 1 is the idle pose
 * and is the only one the fight strictly needs; the rest exist so the fight can
 * read as a fight rather than as one still image with a bar over it.
 */
const minibossModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/minibosses/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const byName = new Map<string, string>()
for (const [path, url] of Object.entries(stageModules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byName.set(name, url)
}

/** minibossId to frame list, in frame order. */
const minibossFrames = new Map<string, string[]>()
const MINIBOSS_PATH = /minibosses\/(miniboss-[a-z-]+)-q-(\d{2})\.webp$/

for (const [path, url] of Object.entries(minibossModules)) {
  const match = MINIBOSS_PATH.exec(path)
  const id = match?.[1]
  const frame = match?.[2]
  if (id === undefined || frame === undefined) continue
  const frames = minibossFrames.get(id) ?? []
  frames[Number(frame) - 1] = url
  minibossFrames.set(id, frames)
}

/** True when this id is a mid-stage fight rather than a stage boss. */
export function isMinibossArt(id: FightId): boolean {
  return minibossFrames.has(id)
}

/** Texture key for one boss form. */
export function bossArtKey(bossId: FightId): string {
  return `bossArt-${bossId}`
}

/** Texture key for one frame of a mid-stage fight. */
export function minibossFrameKey(bossId: FightId, frame: number): string {
  return `minibossArt-${bossId}-${frame}`
}

/** The url for one boss form, or undefined when it is absent. */
export function bossArtUrl(bossId: FightId): string | undefined {
  return byName.get(bossId)
}

/** True when a form has a portrait. */
export function hasBossArt(bossId: FightId): boolean {
  return byName.has(bossId) || minibossFrames.has(bossId)
}

/** Every boss id that has art, sorted. */
export function bossFormsWithArt(): FightId[] {
  return [...byName.keys()].sort() as FightId[]
}

/** Every mid-stage fight id that has art, sorted. */
export function minibossesWithArt(): FightId[] {
  return [...minibossFrames.keys()].sort() as FightId[]
}

/**
 * Queues one mid-stage fight's frames on a loader.
 *
 * Deliberately not loaded at boot with the stage bosses. Sixteen 360x360 frames
 * is about 1MB of art that a player looking at the title screen has not earned,
 * and there are four stages' worth of it; the same reason the stage backdrops are
 * per-stage. Only the frame the fight is standing in is needed to open it, but
 * loading all four keeps the phase change from being a texture that arrives after
 * the player has already crossed the threshold.
 */
export function preloadMiniboss(load: Phaser.Loader.LoaderPlugin, bossId: FightId): void {
  const frames = minibossFrames.get(bossId)
  if (frames === undefined) return
  for (let index = 0; index < frames.length; index += 1) {
    const url = frames[index]
    if (url === undefined) continue
    load.image(minibossFrameKey(bossId, index + 1), url)
  }
}

/** How many frames a mid-stage fight's art provides; 0 when it has none. */
export function minibossFrameCount(bossId: FightId): number {
  return minibossFrames.get(bossId)?.filter((url) => url !== undefined).length ?? 0
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
const PHASE_FORMS: Readonly<Record<string, readonly FightId[] | undefined>> = {
  'gpt-emergent': ['gpt-corpus', 'gpt-corpus', 'gpt-emergent', 'gpt-emergent'],
}

/**
 * Portrait ids to try for one fight state, most specific first.
 *
 * A phase that has no portrait of its own falls back to the fight's own form
 * and then to any form that has art. That order is the requirement, not a
 * convenience: an unillustrated phase has to show a different form rather than
 * a white hole where the boss stands.
 *
 * A mid-stage fight falls back only to itself. Picking one of the stage bosses as
 * a stand-in would put Claude's auditor behind a dock foreman's health bar, which
 * is a worse failure than the placeholder it was meant to prevent.
 */
export function bossArtPreference(bossId: FightId, phase: number): FightId[] {
  const order: FightId[] = []
  const add = (id: FightId | undefined): void => {
    if (id !== undefined && hasBossArt(id) && !order.includes(id)) order.push(id)
  }

  const forms = PHASE_FORMS[bossId]
  if (forms !== undefined) add(forms[Math.max(0, Math.floor(phase) - 1)])
  add(bossId)
  if (isMinibossArt(bossId)) return order
  for (const id of bossFormsWithArt()) add(id)
  return order
}
