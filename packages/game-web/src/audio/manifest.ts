import type Phaser from 'phaser'

/**
 * Audio manifest.
 *
 * Source of truth: docs/game/requirements/gdd.md §音频 and T-M4-08/09.
 * All tracks and effects are CC0 (Kenney, OpenGameArt) - see
 * docs/game/design/art-style.md §6 for the licence table.
 *
 * Twelve stages share six tracks: writing twelve distinct loops would multiply
 * the download for a difference the player stops noticing after the first stage.
 */

const sfxModules = import.meta.glob('../../../../docs/game/requirements/assets/audio/sfx/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const bgmModules = import.meta.glob('../../../../docs/game/requirements/assets/audio/bgm/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function toMap(modules: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop()
    if (name === undefined) continue
    map.set(name.replace('.ogg', ''), url)
  }
  return map
}

const sfx = toMap(sfxModules)
const bgm = toMap(bgmModules)

/** The ten weapon ids, each with its own shot sound (T-M4-09). */
export const WEAPON_SFX_KEYS = [
  'pulse',
  'scatter',
  'rifle',
  'homing',
  'pierce',
  'cluster',
  'laser',
  'grenade',
  'replay',
  'prism',
] as const

/** Event sounds beyond the weapons. */
export const EVENT_SFX_KEYS = [
  'jump',
  'pickup',
  'hit',
  'explosion',
  'hurt',
  'die',
  'clear',
  'bossPhase',
  'select',
] as const

/** Every sfx key the game can play. */
export const SFX_KEYS = [...WEAPON_SFX_KEYS, ...EVENT_SFX_KEYS] as const
export type SfxKey = (typeof SFX_KEYS)[number]

/** Six tracks cycled across twelve stages, and the boss theme last. */
export const BGM_KEYS = ['bgm-01', 'bgm-02', 'bgm-03', 'bgm-04', 'bgm-05', 'bgm-06'] as const
export type BgmKey = (typeof BGM_KEYS)[number]

export function sfxUrl(key: string): string | undefined {
  return sfx.get(key)
}

export function bgmUrl(key: string): string | undefined {
  return bgm.get(key)
}

/**
 * The track for a stage.
 *
 * Boss stages get the last track; the rest cycle so consecutive stages never
 * repeat the same loop back to back.
 */
export function bgmForStage(stageIndex: number, isBoss: boolean): BgmKey {
  if (isBoss) return 'bgm-06'
  const slot = (stageIndex - 1) % 5
  return (BGM_KEYS[slot] ?? 'bgm-01') as BgmKey
}

/** Loads every effect and track into the Phaser cache. */
export function preloadAudio(load: Phaser.Loader.LoaderPlugin): void {
  for (const key of SFX_KEYS) {
    const url = sfxUrl(key)
    if (url !== undefined) load.audio(key, url)
  }
  for (const key of BGM_KEYS) {
    const url = bgmUrl(key)
    if (url !== undefined) load.audio(key, url)
  }
}
