/**
 * Weapon icons.
 *
 * Ten images, one per weapon, keyed by the same id the rules layer uses -
 * pulse, scatter, rifle and so on. The rules layer never references an image;
 * this is purely how the HUD shows which weapon is in hand.
 */

/** Size of every icon in the source art. */
export const WEAPON_ICON_SIZE = 128

const modules = import.meta.glob('../../../../docs/game/requirements/assets/weapons/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byId = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byId.set(name, url)
}

/** Texture key for one weapon icon. */
export function weaponIconKey(weaponId: string): string {
  return `weaponIcon-${weaponId}`
}

/** The url for a weapon icon, or undefined when it is absent. */
export function weaponIconUrl(weaponId: string): string | undefined {
  return byId.get(weaponId)
}

/** True when a weapon has an icon. */
export function hasWeaponIcon(weaponId: string): boolean {
  return byId.has(weaponId)
}

/** Every weapon that has an icon, sorted - used for preloading. */
export function weaponsWithIcons(): string[] {
  return [...byId.keys()].sort()
}
