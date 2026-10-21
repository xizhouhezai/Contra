/**
 * Character definitions.
 *
 * Source of truth: docs/game/requirements/characters.md.
 * Six characters share one weapon pool (ADR-0006); what distinguishes them is
 * the starting weapon, the passive and the bomb - never a stat template.
 */
import type { CharacterId, WeaponId } from './types.js'

/** Passive skill identifiers, one per character. */
export type PassiveId =
  | 'spread-resist'
  | 'foresight'
  | 'sticky-tracking'
  | 'balanced-rhythm'
  | 'long-context'
  | 'multimodal'

/** Bomb identifiers, one per character. */
export type BombId =
  | 'blast'
  | 'laser-pierce'
  | 'homing-mother'
  | 'shield'
  | 'context-replay'
  | 'prism-refract'

export interface CharacterDefinition {
  readonly id: CharacterId
  /** Real product name; stable identifier in specs and code. */
  readonly name: string
  /** Chinese nickname used in UI and marketing (characters.md 命名说明). */
  readonly codename: string
  readonly initialWeapon: WeaponId
  readonly passive: PassiveId
  readonly bomb: BombId
  /** Primary / secondary colours, as hex, for the sprite palette. */
  readonly primary: string
  readonly secondary: string
  readonly role: string
}

export const CHARACTERS: Readonly<Record<CharacterId, CharacterDefinition>> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    codename: '蓝色大肥鱼',
    initialWeapon: 'scatter',
    passive: 'spread-resist',
    bomb: 'blast',
    primary: '#1f4e8c',
    secondary: '#e8eef7',
    role: '范围压制',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    codename: '千问',
    initialWeapon: 'rifle',
    passive: 'foresight',
    bomb: 'laser-pierce',
    primary: '#7b6cc4',
    secondary: '#f0edfb',
    role: '远程狙击',
  },
  doubao: {
    id: 'doubao',
    name: '豆包',
    codename: 'DouBao',
    initialWeapon: 'homing',
    passive: 'sticky-tracking',
    bomb: 'homing-mother',
    primary: '#c9612a',
    secondary: '#fdf0e6',
    role: '辅助支援',
  },
  glm: {
    id: 'glm',
    name: 'GLM',
    codename: '哥林姆',
    initialWeapon: 'pulse',
    passive: 'balanced-rhythm',
    bomb: 'shield',
    primary: '#232323',
    secondary: '#f4f4f4',
    role: '均衡续航',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    codename: '月读',
    initialWeapon: 'replay',
    passive: 'long-context',
    bomb: 'context-replay',
    primary: '#c8d4e3',
    secondary: '#2a3a5c',
    role: '记忆延迟',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    codename: '双子',
    initialWeapon: 'prism',
    passive: 'multimodal',
    bomb: 'prism-refract',
    primary: '#7b8ce0',
    secondary: '#9be0d8',
    role: '多目标',
  },
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

/** The weapon each character starts with. */
export const INITIAL_WEAPON: Readonly<Record<CharacterId, WeaponId>> = {
  deepseek: CHARACTERS.deepseek.initialWeapon,
  qwen: CHARACTERS.qwen.initialWeapon,
  doubao: CHARACTERS.doubao.initialWeapon,
  glm: CHARACTERS.glm.initialWeapon,
  kimi: CHARACTERS.kimi.initialWeapon,
  gemini: CHARACTERS.gemini.initialWeapon,
}

export function characterDefinition(id: CharacterId): CharacterDefinition {
  return CHARACTERS[id]
}

/** Passive tuning, so the numbers live in one place per characters.md. */
export const PASSIVE_TUNING = {
  /** DeepSeek: spread accumulates at half rate. */
  spreadResistMultiplier: 0.5,
  /** Qwen: off-screen enemies are outlined this many seconds early. */
  foresightLeadSeconds: 0.5,
  /** 豆包: homing damage bonus and extra lock. */
  stickyDamageMultiplier: 1.3,
  stickyExtraLocks: 1,
  /** GLM: one heart back per this many kills, once per stage. */
  rhythmKillsPerHeart: 20,
  /** Kimi: marks needed before the payout. */
  contextMarksRequired: 5,
  /** Gemini: extra simultaneous prism targets. */
  multimodalExtraTargets: 1,
} as const
