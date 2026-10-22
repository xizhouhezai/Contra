import type { CharacterId } from '@contra/game-core'

/**
 * Character avatars - the square head-and-shoulders portraits.
 *
 * These are what the select screen shows by default, and what the HUD uses for
 * the small character indicator. They are separate from the full-body action
 * frames: an avatar reads at 36px, a full-body frame does not.
 */

/** Square size of every avatar. */
export const AVATAR_SIZE = 256

const modules = import.meta.glob('../../../../docs/game/requirements/assets/avatars/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byId = new Map<string, string>()
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop()?.replace('.webp', '')
  if (name !== undefined) byId.set(name, url)
}

/** Texture key for one character's avatar. */
export function avatarKey(character: CharacterId): string {
  return `avatar-${character}`
}

/** The url for a character's avatar, or undefined when it is absent. */
export function avatarUrl(character: CharacterId): string | undefined {
  return byId.get(character)
}

/** True when a character has an avatar image. */
export function hasAvatar(character: CharacterId): boolean {
  return byId.has(character)
}

/** Every character that actually has an avatar. */
export function avatarsAvailable(): string[] {
  return [...byId.keys()].sort()
}
