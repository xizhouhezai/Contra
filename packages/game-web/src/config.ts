/**
 * Game palette.
 *
 * Source of truth: docs/game/design/art-style.md §2 视觉基调.
 * These are the same inks the documentation site uses, so the game and the
 * spec site read as one artifact rather than two unrelated products.
 */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

/** Riso inks: vermillion and teal carry meaning, the rest is paper and ink. */
export const PALETTE = {
  /** Paper, not black: the site is printed, not lit. */
  background: '#f4f1ea',
  // Gameplay silhouettes stay near-black on ink so they read over any backdrop.
  floor: 0x1a1a1a,
  platform: 0x1a1a1a,
  player: 0xd6452c,
  target: 0xd6452c,
  targetDead: 0x9a9088,
  bullet: 0xc8901f,
  exit: 0x1f6f6b,
  exitCleared: 0x1f6f6b,
  hud: '#1a1a1a',
  /** Alert red doubles as the hurt and boss colour. */
  alert: '#d6452c',
} as const

/** Procedural texture keys; M4 loads real sheets alongside these. */
export const TEXTURES = {
  player: 'graybox-player',
  target: 'graybox-target',
  bullet: 'graybox-bullet',
} as const

/** Riso typography (art-style.md §2): serif for titles, mono for labels. */
export const FONTS = {
  title: 'Georgia, serif',
  label: 'monospace',
} as const

/** Shared UI metrics: square corners, 2px ink strokes, no rounding. */
export const UI = {
  strokeWidth: 2,
  ink: 0x1a1a1a,
  paper: 0xf4f1ea,
  vermillion: 0xd6452c,
  teal: 0x1f6f6b,
} as const
