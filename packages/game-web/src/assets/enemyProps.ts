import type Phaser from 'phaser'
import { ENEMY_FRAME_SIZE } from './enemies'

/**
 * Enemy weapon props.
 *
 * The design doc splits the ten archetypes in two: five carry their weapon in the
 * sprite - a turret has its barrels, a smith has its hammer - and four do not.
 * Patrol, carrier, warden and mirror shipped with bare hands, so the player had
 * no way to see that a given drone was the one about to fire.
 *
 * A prop is mounted on the enemy rather than baked into the sheet because the
 * enemy is already animated at 128x128 and the weapon is a separate 20-40px
 * piece: compositing it at draw time keeps one sheet per archetype instead of one
 * sheet per archetype-per-weapon.
 */

/** Enemy archetype to the prop it carries, for the four that needed one. */
const PROP_BY_ARCHETYPE: Readonly<Record<string, string>> = {
  patrol: 'pulse-gun',
  carrier: 'launcher-pod',
  warden: 'scatter-cannon',
  mirror: 'caster',
}

/** Texture key for one enemy weapon prop, or null when the archetype has none. */
export function enemyWeaponPropKey(archetype: string | undefined): string | null {
  if (archetype === undefined) return null
  const name = PROP_BY_ARCHETYPE[archetype]
  return name === undefined ? null : `enemy-prop-${name}`
}

/**
 * Where the prop sits on the enemy, as fractions of the drawn sprite.
 *
 * The four that need a prop are roughly humanoid or drone-shaped and all face
 * right in the sheet, so the muzzle end is the right edge at shoulder height.
 * Fractions rather than pixels because the actor is drawn at several sizes.
 */
export const PROP_OFFSET = { x: 0.78, y: 0.46 } as const

/**
 * Multiplier on the mounted weapon's size.
 *
 * The prop is drawn at the enemy's own scale, so a 24x16 gun on an enemy 72px
 * tall comes out 13px wide - true to the art, and too small to tell one drone's
 * weapon from another's at play distance. Lifting it slightly keeps the
 * silhouette readable without making the gun look detached from the body.
 */
export const PROP_BOOST = 1.6

const modules = import.meta.glob('../../../../docs/game/requirements/assets/enemy-weapons/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const urls = new Map<string, string>()
const NAME = /enemy-weapons\/([a-z-]+)\.webp$/

for (const [path, url] of Object.entries(modules)) {
  const match = NAME.exec(path)
  const name = match?.[1]
  if (name !== undefined) urls.set(`enemy-prop-${name}`, url)
}

/** True when this archetype's prop has art. */
export function hasEnemyProp(archetype: string | undefined): boolean {
  const key = enemyWeaponPropKey(archetype)
  return key !== null && urls.has(key)
}

/** Queues the four props. Under 20KB together. */
export function preloadEnemyProps(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, url] of urls) load.image(key, url)
}

/**
 * Adds a prop sprite for one enemy, or null when it does not carry one.
 *
 * `height` is the enemy's drawn height, not its collision-box height: the box is
 * 40px while the art is drawn at 72, and deriving the prop's scale from the box
 * made the gun a third of the size it should be.
 */
export function mountProp(
  scene: Phaser.Scene,
  archetype: string | undefined,
  x: number,
  y: number,
  height: number,
  depth: number,
): Phaser.GameObjects.Image | null {
  const key = enemyWeaponPropKey(archetype)
  if (key === null || !urls.has(key)) return null

  const prop = scene.add.image(x, y, key)
  prop.setDepth(depth + 1).setOrigin(0.5, 0.5)
  // Matched to the enemy's own scale, then lifted by the boost so the weapon reads
  // at play distance instead of looking like a blemish on the drone.
  prop.setScale((height / ENEMY_FRAME_SIZE) * PROP_BOOST)
  return prop
}
