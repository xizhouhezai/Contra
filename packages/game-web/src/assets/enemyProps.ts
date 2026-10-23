import type Phaser from 'phaser'

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
 * Where the prop sits on the enemy, as a fraction of its box.
 *
 * The four that need a prop are roughly humanoid or drone-shaped and all face
 * right in the sheet, so the muzzle end is the right edge at shoulder height.
 * Expressed as fractions rather than pixels because the actor is drawn at several
 * sizes: a target is scaled by its box height, so a fixed pixel offset would
 * drift off the hand on the taller stages.
 */
export const PROP_OFFSET = { x: 0.78, y: 0.46 } as const

/**
 * Multiplier on the mounted weapon's size.
 *
 * A 24x16 gun on a 128x128 sheet is already small; scaled by the box height on a
 * 40px enemy it becomes unreadable. The props were drawn as detachable pieces, so
 * they are not in the same scale as the body and have to be corrected for that.
 */
export const PROP_BOOST = 2.6

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

/** Adds a prop sprite for one enemy, or null when it does not carry one. */
export function mountProp(
  scene: Phaser.Scene,
  archetype: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
): Phaser.GameObjects.Image | null {
  const key = enemyWeaponPropKey(archetype)
  if (key === null || !urls.has(key)) return null

  const prop = scene.add.image(x + width * PROP_OFFSET.x, y + height * PROP_OFFSET.y, key)
  prop.setDepth(depth + 1).setOrigin(0.5, 0.5)
  // The prop is drawn at the *sprite's* scale, not the box's. The sheet is
  // 128x128 and a 24px gun mounted at box scale came out as a 7px sliver that
  // read as a seam on the drone rather than as a weapon. PROP_BOOST lifts it to
  // where the silhouette is recognisable at 32px on screen.
  prop.setScale((height / 128) * PROP_BOOST)
  return prop
}
