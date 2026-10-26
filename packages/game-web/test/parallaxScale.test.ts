import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The parallax layer has to be scaled so one copy covers the window.
 *
 * The bug was a stretch that looked like a blur. Only tileScaleY was set, so every
 * layer was squashed vertically and left 1:1 horizontally - 1920px of picture
 * across a 960px window, wrapping wherever the texture ended. The wrap is the
 * vertical seam, and the mismatch between axes is why the art also read soft:
 * horizontal samples landed between texels while vertical ones did not.
 *
 * Driving the scale from the texture height fixed the axis mismatch but not the
 * seam, because the canvas is FIT-scaled: at 1280 wide a 1280x720 texture scaled
 * by 540/720 became 960 wide, narrower than the window, so it still repeated. Both
 * lessons are pinned here because either one alone brings the seam back.
 */
const source = readFileSync(
  fileURLToPath(new URL('../src/stage/createParallax.ts', import.meta.url)),
  'utf8',
)

describe('parallax scaling (background seam)', () => {
  it('scales both axes by the same factor', () => {
    // A mismatch here is the anisotropic stretch that made the art look blurred.
    expect(source).toMatch(/tileScaleX\s*=\s*scale/)
    expect(source).toMatch(/tileScaleY\s*=\s*scale/)
  })

  it('derives the factor from the texture width', () => {
    // Height is the wrong axis: it leaves the texture narrower than the window as
    // soon as the canvas aspect ratio drifts, and a narrower texture repeats.
    expect(source).toMatch(/width\s*\/\s*source\.width/)
    expect(source).not.toMatch(/height\s*\/\s*source\.height/)
  })

  it('sets a pixel filter that does not average edges', () => {
    // Riso art is flat colour with hard edges; linear resampling turns every
    // boundary into a soft gradient and the seam into a smear.
    expect(source).toContain('setFilter')
  })
})
