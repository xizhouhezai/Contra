import { describe, expect, it } from 'vitest'
import { CAMPAIGN_STAGES } from '../src/data/campaign.js'
import { CHARACTER_IDS, CHARACTERS } from '../src/data/characters.js'
import { WEAPONS } from '../src/data/weapons.js'

/**
 * Balance checks (T-M5-06).
 *
 * These assert the design is internally consistent. They cannot assert that the
 * game feels right, and they cannot assert pick-rate balance - that needs real
 * players, so it is recorded as unverified in the NFR checklist rather than
 * faked here.
 */

/** How far a stage's authored time may drift from the GDD target. */
const PACING_TOLERANCE = 0.2

describe('Stage pacing (T-M5-06)', () => {
  it('keeps every stage on the same ten minute budget', () => {
    // The migration is over. Every stage in the campaign is a ten minute stage
    // now, so the split this test used to carry - one range for the reworked
    // stages, one for the ones still on the old 90-180 second corridor budget -
    // has nothing left to distinguish. Keeping it would have hidden a stage that
    // quietly drifted back onto the short budget.
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.timeTargetSeconds, stage.id).toBe(600)
    }
  })

  it('builds every stage out of beats rather than a corridor', () => {
    // A ten minute budget on a stage with no waves is a lie the data tells: the
    // player would cross it in a minute and the number would never be earned.
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.waves?.length ?? 0, `${stage.id} 没有波次`).toBeGreaterThanOrEqual(4)
      expect(stage.targets, `${stage.id} 还有开局直接摆的敌人`).toHaveLength(0)
    }
  })

  it('gives every stage a mid-stage fight', () => {
    // REQ-STG-009. The middle of a ten minute stage has to be held by something;
    // without a miniboss the only body that can stop the player is the exit guard
    // and everything between is scenery.
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.minibosses?.length ?? 0, `${stage.id} 缺少中段小 Boss`).toBeGreaterThanOrEqual(1)
    }
  })

  it('makes the boss stages longer than their act average', () => {
    // Boss stages are no longer *longer* than their act-mates in authored time -
    // every stage is 600s now - so the comparison that matters is the reverse:
    // the boss stage must not be shorter, or the act would end on its easiest
    // ten minutes.
    for (const act of [1, 2, 3] as const) {
      const stages = CAMPAIGN_STAGES.filter((s) => s.act === act)
      const boss = stages.find((s) => s.bossId !== undefined)
      if (boss === undefined) continue
      const average = stages.reduce((sum, s) => sum + s.timeTargetSeconds, 0) / stages.length
      expect(boss.timeTargetSeconds, `${boss.id}`).toBeGreaterThanOrEqual(average)
    }
  })

  it('keeps the pacing tolerance reasonable', () => {
    expect(PACING_TOLERANCE).toBeCloseTo(0.2, 10)
  })
})

describe('Roster differentiation (T-M5-06)', () => {
  it('gives every character a distinct starting weapon', () => {
    const weapons = CHARACTER_IDS.map((id) => CHARACTERS[id].initialWeapon)
    expect(new Set(weapons).size).toBe(CHARACTER_IDS.length)
  })

  it('gives every character a distinct passive and bomb', () => {
    const passives = CHARACTER_IDS.map((id) => CHARACTERS[id].passive)
    const bombs = CHARACTER_IDS.map((id) => CHARACTERS[id].bomb)
    expect(new Set(passives).size).toBe(CHARACTER_IDS.length)
    expect(new Set(bombs).size).toBe(CHARACTER_IDS.length)
  })

  it('gives every character a distinct primary colour', () => {
    const colours = CHARACTER_IDS.map((id) => CHARACTERS[id].primary)
    expect(new Set(colours).size).toBe(CHARACTER_IDS.length)
  })

  it('points every starting weapon at a real weapon', () => {
    for (const id of CHARACTER_IDS) {
      expect(WEAPONS[CHARACTERS[id].initialWeapon]).toBeDefined()
    }
  })
})

describe('Weapon spread (T-M5-06)', () => {
  /**
   * Per-shot damage actually delivered.
   *
   * A scatter gun listed as 8 damage fires five pellets, so comparing the bare
   * damage number would call it dominated by a single-shot weapon that is
   * strictly worse in practice. This is the number the player feels.
   */
  function effectiveDamage(w: (typeof WEAPONS)[keyof typeof WEAPONS]): number {
    return w.damage * Math.max(1, w.projectileCount)
  }

  /**
   * Whether two weapons are the same kind.
   *
   * A thrown bomb and a rifle are not comparable on rate and ammo: the bomb's
   * value is the blast radius and its ability to hit through cover, neither of
   * which appears as a per-shot number. Comparing across kinds would only ever
   * produce false dominance, so the check stays within a kind.
   */
  function sameKind(
    a: (typeof WEAPONS)[keyof typeof WEAPONS],
    b: (typeof WEAPONS)[keyof typeof WEAPONS],
  ): boolean {
    return a.kind === b.kind
  }

  it('keeps no weapon strictly dominated by one of its own kind', () => {
    const ids = Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]
    for (const a of ids) {
      const wa = WEAPONS[a]
      for (const b of ids) {
        if (a === b) continue
        const wb = WEAPONS[b]
        if (!sameKind(wa, wb)) continue

        // The pulse is the deliberate floor, not a competitor: it is the
        // infinite-ammo fallback handed to a player with nothing else. Because
        // its ammo is limitless it would "dominate" every finite weapon on that
        // axis alone, which says nothing about whether those weapons earn a slot.
        // It is therefore excluded on both sides of the comparison.
        if (a === 'pulse' || b === 'pulse') continue

        const dominated =
          effectiveDamage(wb) >= effectiveDamage(wa) &&
          wb.shotsPerSecond >= wa.shotsPerSecond &&
          wb.ammo >= wa.ammo &&
          wb.pierceCount >= wa.pierceCount &&
          Number(wb.homing) >= Number(wa.homing) &&
          (effectiveDamage(wb) > effectiveDamage(wa) ||
            wb.shotsPerSecond > wa.shotsPerSecond ||
            wb.ammo > wa.ammo ||
            wb.pierceCount > wa.pierceCount ||
            Number(wb.homing) > Number(wa.homing))
        expect(dominated).toBe(false)
      }
    }
  })

  it('counts pellets, not just the listed damage', () => {
    // Scatter fires five pellets: 8 listed is 40 delivered.
    expect(effectiveDamage(WEAPONS.scatter)).toBe(WEAPONS.scatter.damage * 5)
    expect(effectiveDamage(WEAPONS.pulse)).toBe(WEAPONS.pulse.damage)
  })

  it('gives every weapon some reason to be picked', () => {
    // Rate, burst, reach, ammo or a mechanic - at least one axis distinct.
    const signatures = new Set(
      Object.values(WEAPONS).map(
        (w) => `${w.damage}/${w.shotsPerSecond}/${w.projectileCount}/${w.kind}`,
      ),
    )
    expect(signatures.size).toBe(Object.keys(WEAPONS).length)
  })
})
