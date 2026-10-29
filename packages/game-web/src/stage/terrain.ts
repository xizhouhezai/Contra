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
 * Room-kit tiles, one kit per act.
 *
 * Source of truth: docs/game/design/stage-art-prompts-batch23.md §7.1/§7.2, which
 * supersedes batch1.md §5 now that acts II and III shipped their own sets.
 *
 * These are the six pieces the expansion's rooms are built from: a floor plate, a
 * wall plate, a platform strip, a props atlas, a hazard strip and a door sheet.
 * They are a different language from the `terrain/` set above - that one is a
 * single tiled ground strip in three tints, this one is a kit with corners and
 * edges - so they are addressed separately rather than folded into GroundVariant.
 *
 * The six names and their sizes are common to all three acts; only the artwork
 * differs. Sizes come from the packer, not from a guess: floor and wall are
 * 256x256, the platform is 384x64, the hazard strip is 384x128, the props atlas is
 * 256x192 and the door sheet is 288x160.
 */
export const ROOM_KIT_ACTS = [1, 2, 3] as const
export type RoomKitAct = (typeof ROOM_KIT_ACTS)[number]

export const ROOM_KIT_TILE_NAMES = ['floor', 'wall', 'platform', 'props', 'hazard', 'door'] as const
export type RoomKitTileName = (typeof ROOM_KIT_TILE_NAMES)[number]

/** Source size of each tile, so a caller can slice without loading it. */
export const ROOM_KIT_TILE_SIZE: Readonly<
  Record<RoomKitTileName, { width: number; height: number }>
> = {
  floor: { width: 256, height: 256 },
  wall: { width: 256, height: 256 },
  platform: { width: 384, height: 64 },
  props: { width: 256, height: 192 },
  hazard: { width: 384, height: 128 },
  door: { width: 288, height: 160 },
}

/**
 * A floor plate only reads as ground at 40px and up; everything shorter is a ledge
 * drawn from the platform strip. Carried over from the act I pass unchanged so the
 * three acts keep one drawing rule.
 */
const GROUND_PLATE_MIN_HEIGHT = 40

/**
 * One glob for all three acts rather than one per act.
 *
 * Three literals would have to be kept in step with ROOM_KIT_ACTS by hand, and the
 * failure mode of forgetting one is silent: a stage quietly falls back to the
 * shared ground strip. Parsing the act out of the path instead cannot miss a pack.
 */
const roomKitModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/tiles/tiles-act*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const ROOM_KIT_PATH = /tiles-act([123])-([a-z]+)\.webp$/

function isRoomKitAct(value: number): value is RoomKitAct {
  return (ROOM_KIT_ACTS as readonly number[]).includes(value)
}

const roomKitUrls = new Map<RoomKitAct, Map<RoomKitTileName, string>>()
for (const [path, url] of Object.entries(roomKitModules)) {
  const match = ROOM_KIT_PATH.exec(path)
  const act = Number(match?.[1])
  const name = match?.[2]
  if (!isRoomKitAct(act) || name === undefined) continue
  if (!(ROOM_KIT_TILE_NAMES as readonly string[]).includes(name)) continue
  const forAct = roomKitUrls.get(act) ?? new Map<RoomKitTileName, string>()
  forAct.set(name as RoomKitTileName, url)
  roomKitUrls.set(act, forAct)
}

/**
 * Texture key for one tile of one act.
 *
 * The act is part of the key because Phaser's texture cache is global to the game,
 * not per scene: a shared `act1-tile-floor`-style key would let whichever act
 * loaded first paint the other two, and the two kits are different art.
 */
export function roomKitTileKey(act: RoomKitAct, name: RoomKitTileName): string {
  return `act${act}-tile-${name}`
}

/** Which act a stage belongs to: 1-4 act I, 5-8 act II, 9-12 act III. */
export function roomKitActFor(stageIndex: number): RoomKitAct {
  if (stageIndex <= 4) return 1
  if (stageIndex <= 8) return 2
  return 3
}

/** True when that piece of that act's kit shipped. */
export function hasRoomKitTile(act: RoomKitAct, name: RoomKitTileName): boolean {
  return roomKitUrls.get(act)?.has(name) ?? false
}

/**
 * Whether a stage draws its floors from the room kit instead of the shared strip.
 *
 * Acts II and III are packed separately from this file, so a stage can reach the
 * scene before its art exists. The gate is on the two pieces the platform path
 * actually reads, not on the act number: a kit that is half-packed would draw its
 * ground from the new language and its ledges from the old one, and one stage
 * mixing two languages is worse than a stage that is simply still on the old one.
 */
export function usesRoomKit(stageIndex: number): boolean {
  const act = roomKitActFor(stageIndex)
  return hasRoomKitTile(act, 'floor') && hasRoomKitTile(act, 'platform')
}

/**
 * Queues the kit of one act.
 *
 * Six files, about 300KB together - cheap enough to load per stage rather than at
 * boot, and loaded per stage anyway because a stage only needs its own act's art.
 */
export function preloadRoomKit(load: Phaser.Loader.LoaderPlugin, act: RoomKitAct): void {
  for (const [name, url] of roomKitUrls.get(act) ?? []) {
    load.image(roomKitTileKey(act, name), url)
  }
}

/**
 * Draws one platform from a stage's room kit, falling back to the shared strip.
 *
 * Ground slabs are the floor plate tiled; ledges are the platform strip, which is
 * authored as three segments (end cap, repeatable middle, end cap) and is therefore
 * tiled horizontally rather than nine-sliced. A missing texture falls through to
 * the caller's existing path, because an invisible floor is a far worse failure
 * than an old-looking one.
 */
export function drawRoomKitPlatform(
  scene: Phaser.Scene,
  platform: { x: number; y: number; width: number; height: number },
  act: RoomKitAct,
): Phaser.GameObjects.GameObject | null {
  const isGround = platform.height >= GROUND_PLATE_MIN_HEIGHT
  const name: RoomKitTileName = isGround ? 'floor' : 'platform'
  const key = roomKitTileKey(act, name)
  if (!scene.textures.exists(key)) return null

  const tile = scene.add
    .tileSprite(platform.x, platform.y, platform.width, platform.height, key)
    .setOrigin(0, 0)
    .setDepth(1)

  // Ground is a square plate, so it scales in both directions; a ledge is a
  // 16px-thick strip being drawn into a 16-20px slot, so it is scaled to fit the
  // height and left to tile horizontally.
  if (isGround) {
    const source = ROOM_KIT_TILE_SIZE[name]
    tile.tileScaleX = 1
    tile.tileScaleY = platform.height / source.height
  } else {
    tile.tileScaleY = platform.height / ROOM_KIT_TILE_SIZE.platform.height
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
