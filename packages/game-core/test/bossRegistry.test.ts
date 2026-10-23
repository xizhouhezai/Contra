import { describe, expect, it } from 'vitest'
import { ACT_III_STAGES } from '../src/data/act3.js'
import { BOSSES, bossDefinition } from '../src/data/bosses.js'
import { CAMPAIGN_STAGES } from '../src/data/campaign.js'

/**
 * Boss registry coverage (T3).
 *
 * A stage that names a boss id nothing can resolve is a boss stage with an
 * empty room - and it fails silently, because the lookup just returns
 * undefined and the scene draws nothing.
 */
describe('Boss registry (T3)', () => {
  it('resolves every boss id the campaign names', () => {
    const ids = [...CAMPAIGN_STAGES, ...ACT_III_STAGES]
      .map((stage) => stage.bossId)
      .filter((id): id is NonNullable<typeof id> => id !== undefined)

    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(bossDefinition(id), `未注册的 Boss: ${id}`).toBeDefined()
    }
  })

  it('registers both GPT forms', () => {
    expect(BOSSES['gpt-corpus']).toBeDefined()
    expect(BOSSES['gpt-emergent']).toBeDefined()
  })

  it('gives every registered boss positive hp and at least one phase', () => {
    for (const boss of Object.values(BOSSES)) {
      expect(boss.maxHp).toBeGreaterThan(0)
      expect(boss.phases.length).toBeGreaterThan(0)
    }
  })

  it('returns undefined for an id nothing defines', () => {
    expect(bossDefinition('no-such-boss')).toBeUndefined()
  })
})
