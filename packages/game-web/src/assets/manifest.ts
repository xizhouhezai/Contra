/**
 * Asset manifest.
 *
 * Every texture the presentation layer loads, in one place, so a missing file is
 * a build error rather than a silent blank sprite at runtime.
 *
 * The art under docs/game/requirements/assets/ is bundled by Vite at build time
 * via import.meta.glob, which is why the paths are relative and static.
 */
import type { CharacterId } from '@contra/game-core'

/** A sprite sheet plus the frame geometry Phaser needs to slice it. */
export interface SheetSpec {
  readonly key: string
  readonly url: string
  readonly frameWidth: number
  readonly frameHeight: number
}

const characterModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/sprites/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const backgroundModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/backgrounds/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const portraitModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/portraits/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

function toMap(modules: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop()
    if (name === undefined) continue
    map.set(name.replace('.webp', ''), url)
  }
  return map
}

const sprites = toMap(characterModules)
const backgrounds = toMap(backgroundModules)
const portraits = toMap(portraitModules)

/** Character animation states, matching the generated sheets. */
export const CHARACTER_STATES = ['idle', 'run', 'jump', 'hurt'] as const
export type CharacterState = (typeof CHARACTER_STATES)[number]

/** Sprite geometry: characters are 48px, enemies 32px, four frames each. */
export const CHARACTER_FRAME = 48
export const ENEMY_FRAME = 32

/** Every character animation sheet. */
export function characterSheets(): SheetSpec[] {
  const out: SheetSpec[] = []
  for (const [key, url] of sprites) {
    if (!CHARACTER_STATES.some((state) => key.endsWith(`-${state}`))) continue
    if (key.startsWith('enemy-')) continue
    out.push({ key, url, frameWidth: CHARACTER_FRAME, frameHeight: CHARACTER_FRAME })
  }
  return out
}

/** Every enemy sheet: ten archetypes, two frames each. */
export function enemySheets(): SheetSpec[] {
  const out: SheetSpec[] = []
  for (const [key, url] of sprites) {
    if (!key.startsWith('enemy-')) continue
    out.push({ key, url, frameWidth: ENEMY_FRAME, frameHeight: ENEMY_FRAME })
  }
  return out
}

/** Parallax background layers, far to near. */
export const PARALLAX_LAYERS = [
  'industrial-sky',
  'industrial-far-buildings',
  'industrial-buildings',
  'industrial-foreground',
] as const

/** Scroll factor per layer: distant layers move less. */
export const PARALLAX_FACTORS: Readonly<Record<string, number>> = {
  'industrial-sky': 0,
  'industrial-far-buildings': 0.15,
  'industrial-buildings': 0.4,
  'industrial-foreground': 0.8,
}

export function backgroundUrl(key: string): string | undefined {
  return backgrounds.get(key)
}

export function portraitUrl(id: CharacterId): string | undefined {
  return portraits.get(id)
}

/** Texture key for a character animation. */
export function characterTexture(character: CharacterId, state: CharacterState): string {
  return `${character}-${state}`
}

/** Texture key for an enemy animation. */
export function enemyTexture(enemyId: string): string {
  return `enemy-${enemyId}`
}

/** True when every expected sheet is present, used by the boot scene's check. */
export function missingSheets(): string[] {
  const expected: string[] = []
  for (const key of sprites.keys()) expected.push(key)
  return expected.filter((key) => !sprites.has(key))
}
