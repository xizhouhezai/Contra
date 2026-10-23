import type Phaser from 'phaser'

/**
 * Ground and platform art.
 *
 * The stages were drawn as flat rectangles in a single grey - the "fake
 * ground" that reads as a placeholder next to finished backdrops. These are
 * the generated tiles that replace them.
 *
 * Ground is a seamless 256x64 strip repeated horizontally; platforms come from
 * one 96x96 nine-slice so a 24px ledge and a 900px slab both get correct
 * corners instead of a squashed texture.
 */

/** Size of one ground tile. */
export const GROUND_TILE_WIDTH = 256
export const GROUND_TILE_HEIGHT = 64

/** The nine-slice source, 3x3 cells of 32px. */
export const PLATFORM_NINE_SLICE = 96
const _CELL = 32

export type GroundVariant = 'cold' | 'teal' | 'grey'

/** Which ground set a stage uses, by act. */
export function groundVariantFor(stageIndex: number): GroundVariant {
  if (stageIndex <= 4) return 'cold'
  if (stageIndex <= 8) return 'teal'
  return 'grey'
}

export function groundKey(variant: GroundVariant): string {
  return `terrain-ground-${variant}`
}

export function platformKey(): string {
  return 'terrain-platform'
}

const groundModules = import.meta.glob('../../../../docs/game/requirements/assets/terrain/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const platformModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/terrain/platform-9slice.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

function urlFor(modules: Record<string, string>, name: string): string | undefined {
  for (const [path, url] of Object.entries(modules)) {
    if (path.endsWith(`/${name}`)) return url
  }
  return undefined
}

/** Queues the ground sets and the platform slice. */
export function preloadTerrain(load: Phaser.Loader.LoaderPlugin): void {
  for (const variant of ['cold', 'teal', 'grey'] as const) {
    const url = urlFor(groundModules, `ground-${variant}.webp`)
    if (url !== undefined) load.image(groundKey(variant), url)
  }
  const platform = urlFor(platformModules, 'platform-9slice.webp')
  if (platform !== undefined) load.image(platformKey(), platform)
}

/**
 * Draws one platform.
 *
 * Ground slabs (60px tall and up) are a tiled strip, because the art is a
 * horizontal repeat and stretching it would smear the rivets. Everything else
 * is nine-sliced so the ledge keeps 32px corners whatever its width.
 *
 * A missing texture falls back to the old rectangle rather than drawing
 * nothing: an invisible floor is a far worse failure than an ugly one.
 */
export function drawPlatform(
  scene: Phaser.Scene,
  platform: { x: number; y: number; width: number; height: number },
  variant: GroundVariant,
  fallbackColour: number,
): Phaser.GameObjects.GameObject {
  const isGround = platform.height >= GROUND_TILE_HEIGHT - 4
  const key = isGround ? groundKey(variant) : platformKey()

  if (!scene.textures.exists(key)) {
    return scene.add
      .rectangle(platform.x, platform.y, platform.width, platform.height, fallbackColour)
      .setOrigin(0, 0)
      .setDepth(1)
  }

  if (isGround) {
    const tile = scene.add
      .tileSprite(platform.x, platform.y, platform.width, platform.height, key)
      .setOrigin(0, 0)
      .setDepth(1)
    // Scale the art to the slab's height so a 60px slab is not a 64px strip
    // sticking out below the floor line.
    tile.tileScaleY = platform.height / GROUND_TILE_HEIGHT
    return tile
  }

  const source = scene.textures.get(key).getSourceImage()
  const textureW = source.width || PLATFORM_NINE_SLICE
  const textureH = source.height || PLATFORM_NINE_SLICE

  // A ledge in this game is 16px tall against a 96px texture. Nine-slicing it
  // directly squashes the middle third to nothing and the corners overlap, so
  // the whole slice is scaled down to the ledge height first and then stretched
  // horizontally only. That keeps the rivet row intact along the top edge,
  // which is the detail that makes a ledge read as a ledge.
  const scale = platform.height / textureH
  const sliceH = platform.height
  const insetY = (textureH / 3) * scale
  const insetX = textureW / 3

  const w = Math.max(insetX * 2, platform.width)
  const h = Math.max(sliceH, 1)

  return scene.add
    .nineslice(platform.x, platform.y, w, h, key, insetX, insetX, insetY, insetY)
    .setOrigin(0, 0)
    .setDepth(1)
}
