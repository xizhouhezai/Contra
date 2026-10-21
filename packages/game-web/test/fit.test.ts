import { describe, expect, it } from 'vitest'
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config'
import { bufferSize, MAX_RENDER_SCALE, renderScale } from '../src/fit'

/**
 * Render scaling (sharpness fix).
 *
 * These pin the decision, not the pixels: the buffer must grow with the window
 * so text is not smeared, and must stop growing so the frame rate survives.
 * Both halves were measured - 1x was blurry, one-pixel-per-display-pixel was
 * 16.8fps at 2560x1440 - and either extreme coming back is a regression.
 */
describe('Render scale', () => {
  it('grows with a larger window', () => {
    expect(renderScale(1280, 720)).toBeGreaterThan(renderScale(960, 540))
  })

  it('never drops below 1, so a small window is not undersampled', () => {
    expect(renderScale(320, 180)).toBe(1)
  })

  it('never exceeds the cap', () => {
    expect(renderScale(3840, 2160)).toBe(MAX_RENDER_SCALE)
    // The cap exists to bound the fill cost, not to pin an exact number: 3 was
    // chosen because a 2560-wide window then needs no upscaling at all, and the
    // frame rate measured 60fps at 1366, 1920 and 2560.
    expect(MAX_RENDER_SCALE).toBeGreaterThanOrEqual(2)
    expect(MAX_RENDER_SCALE).toBeLessThanOrEqual(3)
  })

  it('covers a 2560-wide window without upscaling', () => {
    // The bug this guards: a cap of 1.5 left the 1920 window stretched 1.33x and
    // the 2560 window 1.78x, which is exactly the blur that was reported.
    const buffer = bufferSize(2560, 1440)
    expect(buffer.width).toBeGreaterThanOrEqual(2560)
  })

  it('caps the buffer instead of following the window without limit', () => {
    const huge = bufferSize(3840, 2160)
    const fourK = bufferSize(7680, 4320)
    expect(huge.width).toBe(fourK.width)
    expect(huge.width).toBeLessThan(3840)
  })

  it('keeps the buffer in the design aspect ratio', () => {
    for (const [width, height] of [
      [1280, 720],
      [1920, 1080],
      [2560, 1440],
      [1000, 1000],
    ]) {
      const buffer = bufferSize(width as number, height as number)
      expect(buffer.width / buffer.height).toBeCloseTo(GAME_WIDTH / GAME_HEIGHT, 2)
    }
  })
})
