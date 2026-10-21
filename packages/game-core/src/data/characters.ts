/**
 * Which weapon each character starts with.
 *
 * Source of truth: docs/game/requirements/characters.md §初始武器. The full
 * CharacterDefinition (passive, bomb, palette) lands with T-M1-03; the pool is
 * shared, so the starting weapon is the whole of a character's weapon identity.
 */
import type { CharacterId, WeaponId } from './types.js'

export const INITIAL_WEAPON: Readonly<Record<CharacterId, WeaponId>> = {
  deepseek: 'scatter',
  qwen: 'rifle',
  doubao: 'homing',
  glm: 'pulse',
  kimi: 'replay',
  gemini: 'prism',
}

/** Every playable character id, in roster order. */
export const CHARACTER_IDS: readonly CharacterId[] = [
  'deepseek',
  'qwen',
  'doubao',
  'glm',
  'kimi',
  'gemini',
]
