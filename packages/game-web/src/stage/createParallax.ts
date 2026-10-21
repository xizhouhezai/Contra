import type Phaser from 'phaser'
import { backgroundUrl, PARALLAX_FACTORS, PARALLAX_LAYERS } from '../assets/manifest'

/**
 * Builds the parallax backdrop for a stage.
 *
 * Each layer is a tiled sprite pinned to the camera, with its own texture offset
 * per frame - that is what produces depth: the sky barely moves, the foreground
 * nearly matches the world.
 *
 * Depth and alpha are the two things that keep this from swallowing the game.
 * The layers sit far below every gameplay object, and each is dimmed toward the
 * paper background: a backdrop is context, and the moment it competes with the
 * player silhouette the stage stops being readable.
 *
 * A layer whose texture is missing is skipped rather than fatal, because the art
 * is additive: the game runs on grey boxes with or without it.
 */

/** How much of each layer shows through, far to near. */
const LAYER_ALPHA = [0.55, 0.4, 0.3, 0.16] as const

export function createParallax(
  scene: Phaser.Scene,
  worldWidth: number,
): Phaser.GameObjects.TileSprite[] {
  const created: Phaser.GameObjects.TileSprite[] = []
  const width = scene.scale.width
  const height = scene.scale.height

  PARALLAX_LAYERS.forEach((key, index) => {
    const url = backgroundUrl(key)
    if (url === undefined || !scene.textures.exists(key)) return

    const source = scene.textures.get(key).getSourceImage()
    const tile = scene.add
      .tileSprite(0, height, width, height, key)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(-100 + index)
      .setAlpha(LAYER_ALPHA[index] ?? 0.3)

    if (source.height > 0) tile.tileScaleY = height / source.height
    created.push(tile)
  })

  void worldWidth
  return created
}

/**
 * Advances the tiled layers with the camera.
 *
 * TileSprite cannot use a scroll factor for its own tiling, so the offset is set
 * by hand each frame: tilePositionX moves the texture, not the sprite.
 */
export function updateParallax(
  layers: readonly Phaser.GameObjects.TileSprite[],
  cameraScrollX: number,
  cameraScrollY = 0,
): void {
  layers.forEach((layer, index) => {
    const key = PARALLAX_LAYERS[index]
    const factor = key === undefined ? 0.3 : (PARALLAX_FACTORS[key] ?? 0.3)
    layer.tilePositionX = cameraScrollX * factor
    // A vertical stage scrolls the backdrop on y instead.
    layer.tilePositionY = cameraScrollY * factor
  })
}
