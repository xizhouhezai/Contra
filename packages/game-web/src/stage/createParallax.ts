import type Phaser from 'phaser'
import { PARALLAX_FACTORS, PARALLAX_LAYERS } from '../assets/manifest'
import { hasStageScene, SCENE_LAYERS, stageLayerKey } from '../assets/stages'

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

/**
 * How much of each layer shows through, far to near.
 *
 * Tuned against measurements, not by eye. Two attempts are on record because
 * the first one went the wrong way.
 *
 * At the original 0.55/0.40/0.30/0.16 the backdrop sampled RGB 107,139,119 and
 * the player 103,134,121 - four levels apart on paper, which is invisible.
 * Dropping the alphas to 0.30/0.22/0.16/0.10 made it worse: less layer means
 * more paper, and paper (244,241,234) is lighter than the character's blue.
 *
 * Raising them instead pushes the backdrop toward its own dark palette. The
 * backdrop is now firmly behind the player in value, which is what lets a
 * blue-and-white silhouette read at a glance. Opacity is doing the opposite of
 * what it looks like it should do, and that is why it was measured.
 */
const LAYER_ALPHA = [0.72, 0.58, 0.44, 0.3] as const

/**
 * How much each per-stage layer follows the camera, sky to near.
 *
 * These are deliberately unremarkable numbers - the point of the per-stage art
 * is the picture, not a novel parallax feel. They match the shared set's
 * spacing so the depth reads the same whichever backdrop is in use.
 */
const STAGE_LAYER_FACTORS = [0.05, 0.15, 0.35, 0.6] as const

export function createParallax(
  scene: Phaser.Scene,
  worldWidth: number,
  stageId?: string,
): Phaser.GameObjects.TileSprite[] {
  const created: Phaser.GameObjects.TileSprite[] = []
  const width = scene.scale.width
  const height = scene.scale.height

  // A stage with its own art uses it; a stage without falls back to the shared
  // backdrop set, so a missing folder leaves the stage playable rather than
  // showing empty paper.
  const perStage = stageId !== undefined && hasStageScene(stageId)
  const keys = perStage
    ? SCENE_LAYERS.map((layer) => stageLayerKey(stageId, layer))
    : [...PARALLAX_LAYERS]

  keys.forEach((key, index) => {
    if (!scene.textures.exists(key)) return

    // Per-stage art is drawn at full strength: it was authored for this stage
    // and its palette is already dark enough to sit behind the player. The
    // shared set still needs the alpha ramp, which was measured against it.
    const alpha = perStage ? 1 : (LAYER_ALPHA[index] ?? 0.3)

    const source = scene.textures.get(key).getSourceImage()
    const tile = scene.add
      .tileSprite(0, height, width, height, key)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(-100 + index)
      .setAlpha(alpha)

    // Both axes, and the same factor.
    //
    // Only Y was scaled before: the texture was squashed vertically to 540 while
    // staying 1:1 horizontally, so every layer was drawn with an anisotropic
    // stretch - 1920px of picture across a 960px window, wrapping wherever the
    // texture ended. That wrap is the vertical seam, and the mismatch between the
    // two axes is why the art also looked soft: horizontal samples landed between
    // texels while vertical ones did not.
    //
    // With one factor the 1920x1080 texture becomes exactly 960x540, one texture
    // fills the window, and the wrap happens at the texture edge - which is the
    // edge the art was authored to join.
    // Scale so one copy of the texture covers the window exactly. Dividing by the
    // texture width rather than its height is the difference between a seamless
    // backdrop and a repeating one: the layers are authored 16:9 to match the
    // window, so width is the axis that decides how many copies fit. Driving the
    // scale from height left the texture narrower than the window whenever the
    // aspect ratio drifted - which happens as soon as the canvas is FIT-scaled -
    // and every extra copy starts with a visible seam.
    const scale = source.width > 0 ? width / source.width : 1
    tile.tileScaleX = scale
    tile.tileScaleY = scale

    // Half-scale downsampling is the blur. Every per-stage layer is 1920x1080
    // shown in a 960x540 window, so the GPU is resampling the whole picture at
    // exactly 0.5 - and tilePositionX is rarely an integer, so each frame samples
    // between texels. NEAREST keeps the pixel edges the Riso art is drawn with
    // instead of averaging them into a soft seam where the tile repeats.
    //
    // The cost is aliasing when a layer is scaled by a non-integer factor; that is
    // the honest trade for this art, which is flat colour and hard edges and reads
    // worse blurred than it does aliased.
    // FilterMode.NEAREST is 0 in Phaser's enum; the numeric form is used because
    // this module holds Phaser as a type import, not a value.
    const texture = scene.textures.get(key) as Phaser.Textures.Texture & {
      setFilter?: (mode: number) => void
    }
    texture.setFilter?.(0)
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
    // Two backdrops with the same layer order but different factor tables: the
    // shared set has hand-tuned factors per named layer, the per-stage art is
    // uniform (sky barely moves, near moves almost with the world). Detected
    // from the texture key rather than passed in, so a caller does not have to
    // remember which kind it is holding.
    const isPerStage = String(layer.texture.key).startsWith('scene-')
    const factor = isPerStage
      ? (STAGE_LAYER_FACTORS[index] ?? 0.3)
      : (PARALLAX_FACTORS[PARALLAX_LAYERS[index] ?? ''] ?? 0.3)

    layer.tilePositionX = cameraScrollX * factor
    // A vertical stage scrolls the backdrop on y instead.
    layer.tilePositionY = cameraScrollY * factor
  })
}
