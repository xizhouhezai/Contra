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

/**
 * One track per stage, named after the stage it belongs to.
 *
 * The old list held six generically numbered tracks that were cycled across
 * twelve stages. Twelve named tracks replaced them; the six originals are left
 * in the asset folder but are no longer loaded, because keeping them here would
 * mean downloading 6MB of audio nothing plays.
 */
export const BGM_KEYS = [
  'bgm-01-dock',
  'bgm-02-corridor',
  'bgm-03-bridge',
  'bgm-04-auditor',
  'bgm-05-coolant',
  'bgm-06-server',
  'bgm-07-forge',
  'bgm-08-rewriter',
  'bgm-09-archive',
  'bgm-10-mirror',
  'bgm-11-abyss',
  'bgm-12-emergence',
] as const
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
export function bgmForStage(stageIndex: number, _isBoss: boolean): BgmKey {
  // One track per stage now that all twelve exist, instead of five tracks
  // cycled across twelve stages with a single boss theme. Two adjacent stages
  // sharing a loop was the reason the soundtrack felt like one long piece.
  const perStage: Record<number, string> = {
    1: 'bgm-01-dock',
    2: 'bgm-02-corridor',
    3: 'bgm-03-bridge',
    4: 'bgm-04-auditor',
    5: 'bgm-05-coolant',
    6: 'bgm-06-server',
    7: 'bgm-07-forge',
    8: 'bgm-08-rewriter',
    9: 'bgm-09-archive',
    10: 'bgm-10-mirror',
    11: 'bgm-11-abyss',
    12: 'bgm-12-emergence',
  }
  const key = perStage[stageIndex]
  if (key !== undefined && (BGM_KEYS as readonly string[]).includes(key)) {
    return key as BgmKey
  }

  // A stage whose track is missing falls back to the nearest one that exists,
  // so a gap in the soundtrack never leaves a stage silent.
  const fallback = BGM_KEYS[Math.min(BGM_KEYS.length - 1, Math.max(0, stageIndex - 1))]
  return (fallback ?? 'bgm-01-dock') as BgmKey
}

/**
 * Loads every sound effect. Music is loaded per stage instead.
 *
 * Effects are small and any of them can fire on the first shot, so they all
 * come down with the boot. Music is 21MB for twelve tracks and the player will
 * hear one of them, so preloading the set put the first load at 24MB against
 * an 8MB budget - the largest single regression this project has had.
 */
export function preloadAudio(load: Phaser.Loader.LoaderPlugin): void {
  for (const key of SFX_KEYS) {
    const url = sfxUrl(key)
    if (url !== undefined) load.audio(key, url)
  }
}

/** Queues one stage's track, if it is not already in the cache. */
export function preloadBgm(load: Phaser.Loader.LoaderPlugin, key: BgmKey): void {
  if (load.cacheManager.audio.exists(key)) return
  const url = bgmUrl(key)
  if (url !== undefined) load.audio(key, url)
}

/** True when a track is already cached. */
export function hasBgm(cache: Phaser.Cache.BaseCache, key: BgmKey): boolean {
  return cache.audio.exists(key)
}
