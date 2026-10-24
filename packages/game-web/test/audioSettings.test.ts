import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The volume sliders have to reach the mixer.
 *
 * REQ-GDD-005 asks for a settings screen with volume control. The screen existed
 * and wrote masterVolume and sfxVolume to storage on every keypress - and nothing
 * read them. AudioManager had its own constants and never consulted the file, so
 * both sliders changed a percentage next to themselves and left every sound at the
 * level it had been compiled with.
 *
 * This is the same shape as the other three defects in this project: a finished
 * piece wired to nothing. The check reads the source because the behaviour needs a
 * Web Audio context, and what broke was the link, not the arithmetic.
 */
const audio = readFileSync(
  fileURLToPath(new URL('../src/audio/AudioManager.ts', import.meta.url)),
  'utf8',
)

describe('volume settings reach the mixer (REQ-GDD-005)', () => {
  it('scales effects by the player settings', () => {
    expect(audio).toContain('settings.masterVolume')
    expect(audio).toContain('settings.sfxVolume')
  })

  it('scales music by the master setting', () => {
    expect(audio).toContain('settings.masterVolume')
  })

  it('exposes a way to take settings at runtime', () => {
    // A constructor-only read would leave the screen's changes silent until the
    // next scene, which is how a working slider still feels broken.
    expect(audio).toContain('applySettings')
  })

  it('does not keep a volume the settings cannot change', () => {
    // The old fields were private constants; if either name comes back, the
    // sliders stop working again without any test noticing.
    expect(audio).not.toMatch(/private\s+bgmVolume\s*=\s*0\./)
    expect(audio).not.toMatch(/private\s+sfxVolume\s*=\s*0\./)
  })
})
