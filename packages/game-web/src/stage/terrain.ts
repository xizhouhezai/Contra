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
 * Act I room-kit tiles.
 *
 * Source of truth: docs/game/design/stage-art-prompts-batch1.md §5.
 *
 * These are the six pieces the expansion's act I rooms are built from: a floor
 * plate, a wall plate, a platform strip, a props atlas, a hazard strip and a door
 * sheet. They are a different language from the `terrain/` set above - that one is
 * a single tiled ground strip in three tints, this one is a kit with corners and
 * edges - so they are addressed separately rather than folded into
 * GroundVariant.
 *
 * Sizes come from the packer, not from a guess: floor and wall are 256x256, the
 * platform is 384x64, the hazard strip is 384x128, the props atlas is 256x192 and
 * the door sheet is 288x160.
 */
export const ACT1_TILE_NAMES = ['floor', 'wall', 'platform', 'props', 'hazard', 'door'] as const
export type Act1TileName = (typeof ACT1_TILE_NAMES)[number]

/** Source size of each act I tile, so a caller can slice without loading it. */
export const ACT1_TILE_SIZE: Readonly<Record<Act1TileName, { width: number; height: number }>> = {
  floor: { width: 256, height: 256 },
  wall: { width: 256, height: 256 },
  platform: { width: 384, height: 64 },
  props: { width: 256, height: 192 },
  hazard: { width: 384, height: 128 },
  door: { width: 288, height: 160 },
}

const act1Modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/tiles/tiles-act1-*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const ACT1_NAME = /tiles-act1-([a-z]+)\.webp$/

const act1Urls = new Map<Act1TileName, string>()
for (const [path, url] of Object.entries(act1Modules)) {
  const match = ACT1_NAME.exec(path)
  const name = match?.[1]
  if (name === undefined) continue
  if (!(ACT1_TILE_NAMES as readonly string[]).includes(name)) continue
  act1Urls.set(name as Act1TileName, url)
}

/** Texture key for one act I tile. */
export function act1TileKey(name: Act1TileName): string {
  return `act1-tile-${name}`
}

/** True when that piece of the kit shipped. */
export function hasAct1Tile(name: Act1TileName): boolean {
  return act1Urls.has(name)
}

/**
 * Queues the act I kit.
 *
 * Six files, about 300KB together - cheap enough to load per stage rather than at
 * boot, and loaded per stage anyway because a stage that does not use the kit
 * should not pay for it.
 */
export function preloadAct1Tiles(load: Phaser.Loader.LoaderPlugin): void {
  for (const [name, url] of act1Urls) load.image(act1TileKey(name), url)
}

/**
 * Whether a stage belongs to the act that has the kit.
 *
 * Act I only: stages 5-12 are still on the shared ground strip, and drawing them
 * from this kit would mix two visual languages in one campaign.
 */
export function usesAct1Kit(stageIndex: number): boolean {
  return stageIndex >= 1 && stageIndex <= 4
}

/**
 * Draws one platform from the act I kit, falling back to the shared strip.
 *
 * Ground slabs are the floor plate tiled; ledges are the platform strip, which is
 * authored as three segments (end cap, repeatable middle, end cap) and is therefore
 * tiled horizontally rather than nine-sliced. A missing texture falls through to
 * the caller's existing path, because an invisible floor is a far worse failure
 * than an old-looking one.
 */
export function drawAct1Platform(
  scene: Phaser.Scene,
  platform: { x: number; y: number; width: number; height: number },
): Phaser.GameObjects.GameObject | null {
  const isGround = platform.height >= 40
  const name: Act1TileName = isGround ? 'floor' : 'platform'
  const key = act1TileKey(name)
  if (!scene.textures.exists(key)) return null

  const tile = scene.add
    .tileSprite(platform.x, platform.y, platform.width, platform.height, key)
    .setOrigin(0, 0)
    .setDepth(1)

  // Ground is a square plate, so it scales in both directions; a ledge is a
  // 16px-thick strip being drawn into a 16-20px slot, so it is scaled to fit the
  // height and left to tile horizontally.
  if (isGround) {
    const source = ACT1_TILE_SIZE[name]
    tile.tileScaleX = 1
    tile.tileScaleY = platform.height / source.height
  } else {
    tile.tileScaleY = platform.height / ACT1_TILE_SIZE.platform.height
  }
  return tile
}

/**
 * Draws one platform from the shared terrain set.
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
    .nineslice(platform.x, platform.y, key, undefined, w, h, insetX, insetX, insetY, insetY)
    .setOrigin(0, 0)
    .setDepth(1)
}
