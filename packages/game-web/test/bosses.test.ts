import { describe, expect, it } from 'vitest'
import { bossArtKey, bossArtUrl, bossFormsWithArt, hasBossArt } from '../src/assets/bosses'

/** Boss portraits (T-M6-22). */

const FORMS = ['claude-auditor', 'claude-rewriter', 'gpt-corpus', 'gpt-emergent'] as const

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
})
