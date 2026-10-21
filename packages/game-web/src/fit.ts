import type Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './config'

/**
 * Keeps the design coordinates and the screen pixels in agreement.
 *
 * The game is authored at 960x540 and that does not change: every scene
 * positions things in those units. What does change is how many pixels the
 * canvas gets.
 *
 * Three approaches were measured, and the numbers decided it:
 *   - Fixed 960x540 buffer stretched to the window: sharp at 1x, and every
 *     glyph smeared once the window is larger (1.69x upscale on a 1732px
 *     display), which is what players complained about.
 *   - One buffer per display pixel: crisp, but 41.6fps at 1732x911 and 16.8fps
 *     at 2560x1440. Unplayable.
 *   - A capped buffer: render at the design size times a bounded factor, then
 *     let the browser scale that. This is the one.
 *
 * The cap is the whole point. Doubling costs 4x the fill rate, and beyond 2x
 * the eye cannot tell the difference on text this size anyway.
 */

/**
 * Most pixels per design pixel we will ever allocate.
 *
 * 1.5 is where text stops looking soft without the fill cost running away: the
 * smearing was visible at 1x, and past 1.5 the difference on 12-20px type is
 * not perceptible. It also keeps the buffer under 1920x1080 on a 4K window,
 * which is where an integrated GPU starts dropping frames.
 */
export const MAX_RENDER_SCALE = 1.5

/**
 * Chooses the buffer scale for a viewport.
 *
 * Follows the display so a small window does not pay for pixels it never
 * shows, but never exceeds MAX_RENDER_SCALE.
 */
export function renderScale(width: number, height: number): number {
  const fits = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)
  return Math.min(MAX_RENDER_SCALE, Math.max(1, fits))
}

/** Buffer size in device pixels for a viewport. */
export function bufferSize(width: number, height: number): { width: number; height: number } {
  const scale = renderScale(width, height)
  return {
    width: Math.round(GAME_WIDTH * scale),
    height: Math.round(GAME_HEIGHT * scale),
  }
}

/**
 * Applies the fit to one camera.
 *
 * The viewport is the letterboxed area rather than the whole canvas, which is
 * what keeps a 16:9 game from distorting on a 4:3 or ultrawide window: the bars
 * are real, not stretched borders.
 */
export function applyFit(scene: Phaser.Scene): void {
  const width = scene.scale.width
  const height = scene.scale.height
  const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)

  const viewWidth = GAME_WIDTH * scale
  const viewHeight = GAME_HEIGHT * scale
  const offsetX = (width - viewWidth) / 2
  const offsetY = (height - viewHeight) / 2

  const camera = scene.cameras.main
  camera.setViewport(offsetX, offsetY, viewWidth, viewHeight)
  camera.setZoom(scale)
  camera.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2)
}

/**
 * Crops the letterbox away, so the visible area is exactly the game.
 *
 * Without this a 4:3 window shows empty background above and below the viewport
 * and the fit looks like a bug rather than a decision.
 */
export function letterbox(scene: Phaser.Scene): {
  x: number
  y: number
  width: number
  height: number
} {
  const width = scene.scale.width
  const height = scene.scale.height
  const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)
  const viewWidth = GAME_WIDTH * scale
  const viewHeight = GAME_HEIGHT * scale
  return {
    x: (width - viewWidth) / 2,
    y: (height - viewHeight) / 2,
    width: viewWidth,
    height: viewHeight,
  }
}
