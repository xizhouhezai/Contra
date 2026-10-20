/** Gray-box palette (docs/game/requirements/gdd.md §视觉: 灰盒 = 矩形 + 纯色). */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

export const PALETTE = {
  background: '#0b0b0e',
  floor: 0x2a2a32,
  platform: 0x3d3d48,
  player: 0x8fb8e8,
  target: 0xd0503c,
  targetDead: 0x4a2a28,
  bullet: 0xf5e6a3,
  exit: 0x3f7f5f,
  exitCleared: 0x7ee0a8,
  hud: '#c9c9d4',
  alert: '#7ee0a8',
} as const

/** Texture keys generated procedurally in the boot scene. No image files ship in M0. */
export const TEXTURES = {
  player: 'graybox-player',
  target: 'graybox-target',
  bullet: 'graybox-bullet',
} as const
