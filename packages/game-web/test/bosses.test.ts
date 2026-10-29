import type Phaser from 'phaser'
import { describe, expect, it } from 'vitest'
import {
  bossArtKey,
  bossArtUrl,
  bossFormsWithArt,
  hasBossArt,
  preloadBossArt,
} from '../src/assets/bosses'

/** Boss portraits (T-M6-22). */

const FORMS = ['claude-auditor', 'claude-rewriter', 'gpt-corpus', 'gpt-emergent'] as const

/** Records the keys a loader was asked for, without a real Phaser loader. */
function queueingLoader(): { load: Phaser.Loader.LoaderPlugin; queued: string[] } {
  const queued: string[] = []
  const load = {
    image: (key: string) => {
      queued.push(key)
    },
  } as unknown as Phaser.Loader.LoaderPlugin
  return { load, queued }
}

describe('Boss art', () => {
  it('has a portrait for every form the rules layer can name', () => {
    const available = bossFormsWithArt()
    for (const id of FORMS) {
      expect(available).toContain(id)
    }
  })

  it('keys each portrait by the boss id itself, so it cannot disagree with the fight', () => {
    expect(bossArtKey('claude-auditor')).toBe('bossArt-claude-auditor')
    expect(bossArtKey('gpt-emergent')).toBe('bossArt-gpt-emergent')
  })

  it('resolves every form to a url', () => {
    for (const id of FORMS) {
      expect(bossArtUrl(id)).toBeDefined()
      expect(hasBossArt(id)).toBe(true)
    }
  })

  it('gives each form its own url', () => {
    const urls = FORMS.map((id) => bossArtUrl(id))
    expect(new Set(urls).size).toBe(FORMS.length)
  })

  /**
   * Portraits moved out of BootScene to save 0.81MB on the critical path of
   * REQ-NFR-002, so the load function that replaced it has to queue the right
   * keys - a wrong key here is a boss that silently draws nothing, because
   * `bossArtKeyFor` returns null when the texture is absent.
   */
  it('queues the portraits of the form a fight opens with', () => {
    const { load, queued } = queueingLoader()

    preloadBossArt(load, 'claude-auditor')

    expect(queued).toContain(bossArtKey('claude-auditor'))
  })

  it('queues every phase form of a fight that changes shape, not just the first', () => {
    // The GPT fight swaps from 语料 to 涌现 at its later phases. Queueing only
    // phase 1 would make the final form start loading mid-fight.
    const { load, queued } = queueingLoader()

    preloadBossArt(load, 'gpt-emergent')

    expect(queued).toContain(bossArtKey('gpt-corpus'))
    expect(queued).toContain(bossArtKey('gpt-emergent'))
  })

  it('does not queue the same key twice, however many phases reach it', () => {
    const { load, queued } = queueingLoader()

    preloadBossArt(load, 'gpt-emergent')

    expect(new Set(queued).size).toBe(queued.length)
  })

  it('queues only portraits, never a key it has no url for', () => {
    const { load, queued } = queueingLoader()

    preloadBossArt(load, 'claude-rewriter')

    for (const key of queued) {
      expect(key.startsWith('bossArt-')).toBe(true)
    }
  })
})
