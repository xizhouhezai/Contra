/**
 * Accessibility options (T-M5-05).
 *
 * Source of truth: docs/game/requirements/nonfunctional.md REQ-NFR-012 ~ 016.
 *
 * The rule that matters here: colour is never the only carrier of information.
 * A player who cannot distinguish the vermillion damage flash from the teal
 * pickup must still be able to tell them apart, which is why every state that
 * uses colour also changes shape or text.
 */

export interface AccessibilityOptions {
  /** Disables screen flash, shake and rapid blinking. */
  readonly reduceMotion: boolean
  /** Draws a shape badge on top of every colour-coded state. */
  readonly shapeCues: boolean
  /** Scales HUD and menu text. */
  readonly largeText: boolean
}

export const DEFAULT_ACCESSIBILITY: AccessibilityOptions = {
  reduceMotion: false,
  shapeCues: true,
  largeText: false,
}

/** A visual state that must not rely on colour alone. */
export type CueState = 'playerHurt' | 'enemyArmored' | 'pickup' | 'exit' | 'bossPhase'

/** The glyph drawn alongside the colour for each state. */
export const STATE_GLYPHS: Readonly<Record<CueState, string>> = {
  playerHurt: '\u2716',
  enemyArmored: '\u25A0',
  pickup: '\u25B2',
  exit: '\u25BC',
  bossPhase: '\u25C6',
}

/**
 * Whether a blinking effect may run.
 *
 * With reduceMotion on, blinks become a static outline: the information (you
 * were hit) survives, the flashing that triggers photosensitivity does not.
 */
export function allowsFlashing(options: AccessibilityOptions): boolean {
  return !options.reduceMotion
}

/**
 * Whether screen shake may run.
 *
 * Shake is motion, not information: nothing is lost by removing it, so it goes
 * with the same switch.
 */
export function allowsShake(options: AccessibilityOptions): boolean {
  return !options.reduceMotion
}

/** The glyph to draw for a state, or null when shape cues are off. */
export function glyphFor(state: CueState, options: AccessibilityOptions): string | null {
  return options.shapeCues ? STATE_GLYPHS[state] : null
}

/** HUD text size for the current option set. */
export function hudFontSize(options: AccessibilityOptions): number {
  return options.largeText ? 20 : 14
}

/**
 * Every action the keyboard can perform.
 *
 * Listed so a test can assert the keyboard alone reaches all of them - the
 * accessibility requirement that a player never needs a second device.
 */
export const KEYBOARD_ACTIONS = [
  'moveLeft',
  'moveRight',
  'aimUp',
  'aimDown',
  'jump',
  'fire',
  'bomb',
  'pause',
] as const
export type KeyboardAction = (typeof KEYBOARD_ACTIONS)[number]
