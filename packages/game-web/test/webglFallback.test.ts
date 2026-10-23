import { describe, expect, it, vi } from 'vitest'

/**
 * Phaser is stubbed: this suite covers the decision that runs *before* the game
 * exists, and the real Phaser cannot even be imported outside a browser - it
 * touches `window` at module scope. The stub stands in for the constructor and
 * the two Scale constants main.ts reads at import time.
 */
class StubGame {}

vi.mock('phaser', () => ({
  default: {
    Game: StubGame,
    // Every scene in src/scenes extends this at module scope, and main.ts imports
    // all of them, so the stub has to be constructible too.
    Scene: class {},
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH', Events: { RESIZE: 'resize' } },
  },
}))

const { hasWebGL, webglNoticeHtml } = await import('../src/main')

/** A canvas that hands out a context for the listed ids and nothing else. */
function canvasFor(supported: readonly string[], calls: string[] = []) {
  return {
    getContext(contextId: string): unknown {
      calls.push(contextId)
      return supported.includes(contextId) ? {} : null
    },
  }
}

describe('hasWebGL', () => {
  it('returns false when the browser refuses every context id', () => {
    expect(hasWebGL(() => canvasFor([]))).toBe(false)
  })

  it('returns true when a WebGL2 context is available', () => {
    expect(hasWebGL(() => canvasFor(['webgl2']))).toBe(true)
  })

  it('returns true on older hardware that only offers WebGL1', () => {
    expect(hasWebGL(() => canvasFor(['webgl']))).toBe(true)
  })

  it('asks for webgl2 first, so the newer renderer is preferred', () => {
    const calls: string[] = []
    hasWebGL(() => canvasFor([], calls))
    expect(calls).toEqual(['webgl2', 'webgl'])
  })

  it('returns false when no canvas can be created', () => {
    expect(hasWebGL(() => null)).toBe(false)
  })

  it('returns false when getContext throws, as it does on a blocklisted GPU', () => {
    const throwing = {
      getContext(): unknown {
        throw new Error('context creation failed')
      },
    }
    expect(hasWebGL(() => throwing)).toBe(false)
  })
})

describe('webglNoticeHtml', () => {
  const html = webglNoticeHtml()

  it('names the missing capability in Chinese', () => {
    expect(html).toContain('你的浏览器不支持 WebGL')
  })

  it('tells the player what to do about it', () => {
    // The point of the page: a blank screen leaves nothing to act on.
    expect(html).toContain('硬件加速')
    expect(html).toContain('Chrome')
  })

  it('prints on paper in the game palette, not in browser defaults', () => {
    expect(html).toContain('#f4f1ea')
    expect(html).toContain('#1a1a1a')
    expect(html).not.toContain('border-radius')
  })
})
