import type Phaser from 'phaser'

/**
 * Enemy art.
 *
 * Ten archetypes, two frames each - idle and hit. The generated sprites
 * replaced the procedural grey placeholders shipped with the rules layer:
 * those were 48px blocks kept only so the game could run without art.
 *
 * These are the packed sheets, not the originals. The generated PNGs are
 * 512x512 with the creature floating inside a lot of transparent margin, so
 * scaling that canvas to a 36px collision box left a few visible pixels.
 * scripts/pack-enemies.py crops each frame to its content and pads it into a
 * 128px square, which is what this loads.
 */

/** Frame size of every packed enemy image. */
export const ENEMY_FRAME_SIZE = 128

/** Slots the art provides. */
export const ENEMY_FRAMES = ['idle', 'hit'] as const
export type EnemyFrame = (typeof ENEMY_FRAMES)[number]

const modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/enemies-packed/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

/** enemyId to frame name to url. */
const byEnemy = new Map<string, Map<string, string>>()

const ENEMY_PATH = /enemies-packed\/([a-z-]+?)-(idle|hit)-00\.webp$/

for (const [path, url] of Object.entries(modules)) {
  const match = ENEMY_PATH.exec(path)
  if (match === null) continue
  const enemyId = match[1]
  const frame = match[2]
  if (enemyId === undefined || frame === undefined) continue

  const frames = byEnemy.get(enemyId) ?? new Map<string, string>()
  frames.set(frame, url)
  byEnemy.set(enemyId, frames)
}

/** Texture key for one enemy frame. */
export function enemyFrameKey(enemyId: string, frame: EnemyFrame): string {
  return `enemyArt-${enemyId}-${frame}`
}

/** The url for one enemy frame, or undefined when that art is absent. */
export function enemyFrameUrl(enemyId: string, frame: EnemyFrame): string | undefined {
  return byEnemy.get(enemyId)?.get(frame)
}

/** True when an enemy has generated art rather than only the placeholder. */
export function hasEnemyArt(enemyId: string): boolean {
  return (byEnemy.get(enemyId)?.size ?? 0) > 0
}

/** Queues every enemy image on a loader. */
export function preloadEnemies(load: Phaser.Loader.LoaderPlugin): void {
  for (const [enemyId, frames] of byEnemy) {
    for (const [frame, url] of frames) {
      if (!ENEMY_FRAMES.includes(frame as EnemyFrame)) continue
      load.image(enemyFrameKey(enemyId, frame as EnemyFrame), url)
    }
  }
}
