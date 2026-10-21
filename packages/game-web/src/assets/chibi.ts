import type { CharacterId } from '@contra/game-core'
import type Phaser from 'phaser'

/**
 * The chibi image index.
 *
 * The files live in folders named after the character (meme-deepseek, meme-qwen)
 * and are numbered rather than named, so the index is built from the path at
 * build time. The order follows the file name, which keeps it stable when the
 * set is rebuilt.
 *
 * Only the six playable characters are indexed. The meme-claude and meme-gpt
 * folders hold boss art and are not selectable looks.
 * *
 * The glob is deliberately NOT eager: with eager:true all 57 images are
 * inlined into the bundle, which pushed the first load past the 8MB budget
 * (REQ-NFR-003). Non-eager keeps them as separate chunks fetched on demand.
 */

const modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/official/meme-*/**/*.webp',
  { query: '?url', import: 'default' },
) as Record<string, () => Promise<string>>

export interface ChibiEntry {
  /** File name without the extension; the display order follows it. */
  readonly name: string
  /** Resolves the image url; the import is deferred until the look is opened. */
  readonly load: () => Promise<string>
}

/** Character id to its chibi images. */
export const chibiModules: Partial<Record<CharacterId, ChibiEntry[]>> = {}

for (const [path, load] of Object.entries(modules)) {
  const match = path.match(/meme-([a-z]+)\/([^/]+)\.webp$/)
  if (match === null) continue
  const [, folder, name] = match
  if (folder === undefined || name === undefined) continue

  // Boss art is not a selectable look.
  if (folder === 'claude' || folder === 'gpt') continue

  const character = folder as CharacterId
  const existing = chibiModules[character] ?? []
  existing.push({ name, load })
  chibiModules[character] = existing
}

for (const list of Object.values(chibiModules)) {
  list?.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Loads one chibi image into the scene's texture cache.
 *
 * The url is resolved lazily and the image is added to the loader only when a
 * player actually asks for that look, so the 57 images cost nothing until they
 * are looked at. A load failure is not fatal: the look simply shows nothing.
 */
export async function loadChibi(
  scene: Phaser.Scene,
  character: CharacterId,
  name: string,
): Promise<boolean> {
  const entry = (chibiModules[character] ?? []).find((candidate) => candidate.name === name)
  if (entry === undefined) return false

  const key = `chibi-${character}-${name}`
  if (scene.textures.exists(key)) return true

  try {
    const url = await entry.load()
    await scene.load.image(key, url)
    // start() runs the queue and resolves once the image is in the cache.
    await new Promise<void>((resolve) => {
      scene.load.once('complete', () => resolve())
      scene.load.start()
    })
    return scene.textures.exists(key)
  } catch {
    return false
  }
}
