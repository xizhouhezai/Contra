import { describe, expect, it } from 'vitest'
import { CLAUDE_AUDITOR, CLAUDE_REWRITER } from '../src/data/bosses.js'
import {
  createBossState,
  damageBoss,
  hpFraction,
  isTelegraphing,
  phaseForHp,
  stepBoss,
} from '../src/stages/BossDirector.js'

/** Runs the director for `seconds`, collecting every resolved move id. */
function run(state: ReturnType<typeof createBossState>, seconds: number) {
  const resolved: string[] = []
  const seenPhases: number[] = []
  const steps = Math.round(seconds * 60)
  for (let step = 0; step < steps; step += 1) {
    const result = stepBoss(state, 1 / 60)
    if (result.resolved !== null) resolved.push(result.resolved.id)
    if (result.phaseChanged) seenPhases.push(result.newPhase)
  }
  return { resolved, seenPhases }
}

describe('BossDirector (T-M2-07)', () => {
  it('starts at full health in phase 1', () => {
    const state = createBossState(CLAUDE_AUDITOR)
    expect(hpFraction(state)).toBe(1)
    expect(state.phase).toBe(1)
    expect(state.defeated).toBe(false)
  })

  it('selects the phase the HP has reached', () => {
    expect(phaseForHp(CLAUDE_AUDITOR, 600).phase).toBe(1)
    expect(phaseForHp(CLAUDE_AUDITOR, 400).phase).toBe(1)
    expect(phaseForHp(CLAUDE_AUDITOR, 300).phase).toBe(2)
    expect(phaseForHp(CLAUDE_AUDITOR, 10).phase).toBe(2)
  })

  it('switches phase exactly at the threshold', () => {
    const state = createBossState(CLAUDE_AUDITOR)
    damageBoss(state, 301)
    expect(state.hp).toBe(299)
    const result = stepBoss(state, 0)
    expect(result.phaseChanged).toBe(true)
    expect(state.phase).toBe(2)
  })

  it('telegraphs before a move resolves', () => {
    const state = createBossState(CLAUDE_AUDITOR)
    const first = stepBoss(state, 1 / 60)
    expect(first.telegraphed).not.toBeNull()
    expect(isTelegraphing(state)).toBe(true)

    // Still warning partway through the window.
    for (let step = 0; step < 30; step += 1) stepBoss(state, 1 / 60)
    expect(isTelegraphing(state)).toBe(true)
  })

  it('resolves the move when the telegraph expires', () => {
    const state = createBossState(CLAUDE_AUDITOR)
    const { resolved } = run(state, 2)
    expect(resolved.length).toBeGreaterThan(0)
    expect(['audit-beam', 'clause-chain']).toContain(resolved[0])
  })

  it('respects cooldowns between repeats of one move', () => {
    const state = createBossState(CLAUDE_AUDITOR)
    const { resolved } = run(state, 12)
    // Two moves alternating over twelve seconds cannot exceed one per cooldown.
    const beams = resolved.filter((id) => id === 'audit-beam').length
    expect(beams).toBeLessThanOrEqual(Math.ceil(12 / 2.2) + 1)
  })

  it('drives both bosses with the same code', () => {
    const auditor = run(createBossState(CLAUDE_AUDITOR), 6)
    const rewriter = run(createBossState(CLAUDE_REWRITER), 6)
    expect(auditor.resolved.length).toBeGreaterThan(0)
    expect(rewriter.resolved.length).toBeGreaterThan(0)
    expect(CLAUDE_AUDITOR.maxHp).not.toBe(CLAUDE_REWRITER.maxHp)
  })
})

/** Non-optional access for test reads: a boss with no phases is a broken dataset. */
function phaseOf(boss: typeof CLAUDE_AUDITOR, index: number) {
  const phase = boss.phases[index]
  if (phase === undefined) throw new Error(`no phase ${index} on ${boss.id}`)
  return phase
}

describe('审计者 (T-M2-08)', () => {
  it('has two dodgable moves with a warning window', () => {
    const moves = phaseOf(CLAUDE_AUDITOR, 0).moves
    expect(moves.map((m) => m.id).sort()).toEqual(['audit-beam', 'clause-chain'])
    for (const move of moves) expect(move.telegraphSeconds).toBeGreaterThan(0)
  })

  it('speeds up below half health', () => {
    expect(phaseOf(CLAUDE_AUDITOR, 1).speedMultiplier).toBeGreaterThan(
      phaseOf(CLAUDE_AUDITOR, 0).speedMultiplier,
    )
  })

  it('shortens its warning window in phase 2', () => {
    const phase1 = phaseOf(CLAUDE_AUDITOR, 0).moves.find((m) => m.id === 'audit-beam')
    const phase2 = phaseOf(CLAUDE_AUDITOR, 1).moves.find((m) => m.id === 'audit-beam')
    expect(phase2?.telegraphSeconds).toBeLessThan(phase1?.telegraphSeconds ?? 0)
  })

  it('drops the laser on defeat', () => {
    expect(CLAUDE_AUDITOR.dropsWeapon).toBe('laser')
    const state = createBossState(CLAUDE_AUDITOR)
    expect(damageBoss(state, CLAUDE_AUDITOR.maxHp)).toBe(true)
    expect(state.defeated).toBe(true)
  })
})

describe('改写者 (T-M2-09)', () => {
  it('flips gravity only in its second phase', () => {
    expect(phaseOf(CLAUDE_REWRITER, 0).gravityFlip).toBeNull()
    expect(phaseOf(CLAUDE_REWRITER, 1).gravityFlip).not.toBeNull()
  })

  it('flips gravity when it crosses into phase 2', () => {
    const state = createBossState(CLAUDE_REWRITER)
    expect(state.gravityFlipped).toBe(false)
    damageBoss(state, CLAUDE_REWRITER.maxHp * 0.6)
    stepBoss(state, 0)
    expect(state.phase).toBe(2)
    expect(state.gravityFlipped).toBe(true)
  })

  it('restores gravity on its own after the window', () => {
    // The whole point of the timed flip: no state can leave the player stuck
    // upside down, so the inversion must end without any external help.
    const state = createBossState(CLAUDE_REWRITER)
    damageBoss(state, CLAUDE_REWRITER.maxHp * 0.6)
    stepBoss(state, 0)
    expect(state.gravityFlipped).toBe(true)

    const window = phaseOf(CLAUDE_REWRITER, 1).gravityFlip?.secondsPerCycle ?? 0
    expect(window).toBeGreaterThan(0)

    for (let step = 0; step < Math.round(window * 60) + 10; step += 1) stepBoss(state, 1 / 60)
    expect(state.gravityFlipped).toBe(false)
    expect(state.gravitySecondsLeft).toBe(0)
  })

  it('never flips gravity when the boss dies in phase 1', () => {
    const state = createBossState(CLAUDE_REWRITER)
    damageBoss(state, CLAUDE_REWRITER.maxHp)
    stepBoss(state, 0)
    expect(state.gravityFlipped).toBe(false)
  })

  it('has three moves in its second phase', () => {
    expect(phaseOf(CLAUDE_REWRITER, 1).moves.length).toBe(3)
    expect(phaseOf(CLAUDE_REWRITER, 1).moves.map((m) => m.id)).toContain('rule-rewrite')
  })

  it('keeps every move on a cooldown', () => {
    for (const phase of CLAUDE_REWRITER.phases) {
      for (const move of phase.moves) expect(move.cooldownSeconds).toBeGreaterThan(0)
    }
  })
})
