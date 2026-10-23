import type Phaser from 'phaser'

/**
 * Per-stage scene art.
 *
 * Twelve stage folders, four parallax layers each. Before this the game had one
 * shared backdrop set, so stages 1, 2 and 3 were the same picture with
 * different names - the reason the campaign felt like one long place.
 *
 * The layer names are fixed (sky, far, mid, near) because the parallax code
 * needs a stable order; which picture goes in each is the stage's business.
 */

/** The four parallax layers, far to near. */
export const SCENE_LAYERS = ['sky', 'far', 'mid', 'near'] as const
export type SceneLayer = (typeof SCENE_LAYERS)[number]

/** Source size of every scene layer. */
export const SCENE_WIDTH = 1920
export const SCENE_HEIGHT = 1080

// Non-eager: 48 images at 1920x1080 is 18MB, and bundling them eagerly put the
// whole set in the first load. Lazy imports make each stage's four layers a
// separate fetch, which is what the per-stage preload in StageScene needs.
const modules = import.meta.glob('../../../../docs/game/requirements/assets/scenes/*/*.webp', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>

/** stageId to layer to a lazy url loader. */
const byStage = new Map<string, Map<string, () => Promise<string>>>()

const SCENE_PATH = /scenes\/([^/]+)\/([^/]+)\.webp$/

for (const [path, load] of Object.entries(modules)) {
  const match = SCENE_PATH.exec(path)
  if (match === null) continue
  const stageId = match[1]
  const layer = match[2]
  if (stageId === undefined || layer === undefined) continue

  const layers = byStage.get(stageId) ?? new Map<string, () => Promise<string>>()
  layers.set(layer, load)
  byStage.set(stageId, layers)
}

/** Texture key for one stage's layer. */
export function stageLayerKey(stageId: string, layer: SceneLayer): string {
  return `scene-${stageId}-${layer}`
}

/** Resolves the url for one stage layer, or undefined when absent. */
export async function stageLayerUrl(
  stageId: string,
  layer: SceneLayer,
): Promise<string | undefined> {
  const load = byStage.get(stageId)?.get(layer)
  return load === undefined ? undefined : await load()
}

/** True when the layer's art exists, without resolving it. */
export function stageLayerExists(stageId: string, layer: SceneLayer): boolean {
  return byStage.get(stageId)?.has(layer) === true
}

/** True when a stage has its own backdrop set. */
export function hasStageScene(stageId: string): boolean {
  return (byStage.get(stageId)?.size ?? 0) >= SCENE_LAYERS.length
}

/** Every stage that has its own art. */
export function stagesWithScenes(): string[] {
  return [...byStage.keys()].filter((id) => hasStageScene(id)).sort()
}

/**
 * Queues one stage's layers on a loader.
 *
 * Async because the urls are lazy imports: Phaser's loader needs a url up
 * front, so they have to be resolved before the queue is built.
 */
export async function preloadStageScene(
  load: Phaser.Loader.LoaderPlugin,
  stageId: string,
): Promise<void> {
  for (const layer of SCENE_LAYERS) {
    const url = await stageLayerUrl(stageId, layer)
    if (url === undefined) continue
    load.image(stageLayerKey(stageId, layer), url)
  }
}

/** True when every layer of a stage is already in the texture cache. */
export function stageSceneLoaded(scene: Phaser.Scene, stageId: string): boolean {
  return SCENE_LAYERS.every((layer) => scene.textures.exists(stageLayerKey(stageId, layer)))
}

/** Queues every stage's layers. Not used at boot - see preloadStageScene. */
export async function preloadAllStages(load: Phaser.Loader.LoaderPlugin): Promise<void> {
  for (const stageId of byStage.keys()) await preloadStageScene(load, stageId)
}
