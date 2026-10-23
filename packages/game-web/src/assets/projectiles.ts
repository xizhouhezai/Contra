import type { WeaponId } from '@contra/game-core'
import type Phaser from 'phaser'

/**
 * Player projectile art.
 *
 * Ten weapons fired the same grey box until now. Their behaviour already
 * differed - a beam, a spread, a homing missile, a piercing spike - so the
 * projectiles are drawn to carry that difference: the shape is what a player
 * reads at 18px, colour only confirms it.
 */

/** Source size of every projectile sprite. */
export const PROJECTILE_SIZE = 64

export const PROJECTILE_WEAPONS: readonly WeaponId[] = [
  'pulse',
  'scatter',
  'rifle',
  'homing',
  'pierce',
  'cluster',
  'laser',
  'grenade',
  'replay',
  'prism',
]

/** Texture key for one weapon's projectile. */
export function projectileKey(weaponId: string): string {
  return `projectile-${weaponId}`
}

const modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/projectiles/player-*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const urls = new Map<string, string>()
const NAME = /player-([a-z]+)\.webp$/

for (const [path, url] of Object.entries(modules)) {
  const match = NAME.exec(path)
  const name = match?.[1]
  if (name !== undefined) urls.set(name, url)
}

/** Every weapon that has art. */
export function weaponsWithProjectiles(): string[] {
  return [...urls.keys()].sort()
}

/** True when this weapon has its own projectile. */
export function hasProjectile(weaponId: string): boolean {
  return urls.has(weaponId)
}

/** Queues every projectile sprite. */
export function preloadProjectiles(load: Phaser.Loader.LoaderPlugin): void {
  for (const [name, url] of urls) load.image(projectileKey(name), url)
}
