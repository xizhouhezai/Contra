/**
 * Character looks (REQ-VAR-001).
 *
 * A character can be shown in more than one look: the painted portrait, or one
 * of the chibi images. They are separate assets by different authors, so each
 * carries its own label and its own attribution - the credits page lists them
 * per look rather than per character.
 *
 * The chibi files are numbered rather than named, so the display order comes
 * from the file name and stays stable across rebuilds.
 */

import type { CharacterId } from '@contra/game-core'

import { avatarsAvailable } from './avatars'
import { chibiModules } from './chibi'

const AVATAR_LABEL = '立绘头像'
const avatarModule: Record<string, true> = Object.fromEntries(
  avatarsAvailable().map((id) => [id, true as const]),
)

/** How a look is presented. */
export type LookKind = 'avatar' | 'portrait' | 'chibi'

export interface CharacterLook {
  /** Stable id used in saves and in the texture key. */
  readonly id: string
  readonly kind: LookKind
  /** Display name, e.g. 「立绘」 or 「Q 萌」. */
  readonly label: string
  /** Source file name, for attribution. */
  readonly source: string
  /** Texture key, once loaded. */
  readonly textureKey: string
}

const PORTRAIT_LABEL = '立绘'
const CHIBI_LABEL = 'Q 萌'

/**
 * Every look for a character.
 *
 * The portrait comes first when it exists - it is the default, and a player
 * who never touches the setting should see the painted character.
 */
export function looksFor(character: CharacterId, portraitUrl?: string): CharacterLook[] {
  const out: CharacterLook[] = []

  // The square avatar leads: it is drawn for a small card, so it reads better
  // than a full-body illustration squeezed into the same space.
  if (avatarModule[character] !== undefined) {
    out.push({
      id: 'avatar',
      kind: 'avatar',
      label: AVATAR_LABEL,
      source: `${character}.webp`,
      textureKey: `avatar-${character}`,
    })
  }

  if (portraitUrl !== undefined) {
    out.push({
      id: 'portrait',
      kind: 'portrait',
      label: PORTRAIT_LABEL,
      source: `${character}.webp`,
      textureKey: `portrait-${character}`,
    })
  }

  for (const chibi of chibiModules[character] ?? []) {
    out.push({
      id: `chibi-${chibi.name}`,
      kind: 'chibi',
      label: CHIBI_LABEL,
      source: chibi.name,
      textureKey: `chibi-${character}-${chibi.name}`,
    })
  }

  return out
}

/** The look id used when nothing was chosen. */
export const DEFAULT_LOOK = 'avatar'

/**
 * The look to fall back to.
 *
 * A saved look id can point at an image that is no longer present - the file
 * was renamed, or the player picked a chibi that has since been removed. The
 * fallback is the first available look rather than a crash.
 */
export function resolveLook(
  character: CharacterId,
  lookId: string | undefined,
  portraitUrl?: string,
): CharacterLook {
  const looks = looksFor(character, portraitUrl)
  const first = looks[0]
  if (first === undefined) {
    // No art at all for this character: a synthetic key the caller will find
    // missing and fall back from.
    return {
      id: 'none',
      kind: 'portrait',
      label: PORTRAIT_LABEL,
      source: '',
      textureKey: `portrait-${character}`,
    }
  }
  return looks.find((look) => look.id === lookId) ?? first
}
