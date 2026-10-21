/**
 * The two Claude boss forms.
 *
 * Source of truth: docs/game/requirements/characters.md - Claude 克劳德,
 * 形态 I「审计者」and 形态 II「改写者」.
 *
 * Both are the same BossDefinition shape, which is the point: the director is
 * generic and the bosses are data.
 */
import type { BossDefinition } from '../stages/BossDirector.js'

/**
 * 审计者 - stage 4.
 *
 * Two answers the player must alternate between: step out of the beam, and keep
 * moving against the chains. Neither is a pure damage race.
 */
export const CLAUDE_AUDITOR: BossDefinition = {
  id: 'claude-auditor',
  name: '审计者',
  maxHp: 600,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'audit-beam', damage: 2, telegraphSeconds: 1.2, cooldownSeconds: 3 },
        { id: 'clause-chain', damage: 1, telegraphSeconds: 0.8, cooldownSeconds: 2.4 },
      ],
    },
    {
      // Below half HP the auditor reads faster and its windows shrink.
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.5,
      gravityFlip: null,
      moves: [
        { id: 'audit-beam', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.2 },
        { id: 'clause-chain', damage: 1, telegraphSeconds: 0.6, cooldownSeconds: 1.8 },
      ],
    },
  ],
  dropsWeapon: 'laser',
}

/**
 * 改写者 - stage 8.
 *
 * Phase 2 rewrites the rules: gravity inverts. The inversion is reversible by
 * construction - it is a flag on the phase, and leaving the phase clears it - so
 * a player cannot be stranded upside down after the fight.
 */
export const CLAUDE_REWRITER: BossDefinition = {
  id: 'claude-rewriter',
  name: '改写者',
  maxHp: 900,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'text-storm', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.6 },
        { id: 'final-check', damage: 3, telegraphSeconds: 1.6, cooldownSeconds: 4 },
      ],
    },
    {
      // The form change: palette shift in the presentation layer, gravity flip here.
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.35,
      // Inverted for six seconds at a time, then restored.
      gravityFlip: { secondsPerCycle: 6 },
      moves: [
        { id: 'rule-rewrite', damage: 0, telegraphSeconds: 1.4, cooldownSeconds: 5 },
        { id: 'text-storm', damage: 1, telegraphSeconds: 0.8, cooldownSeconds: 2 },
        { id: 'final-check', damage: 3, telegraphSeconds: 1.3, cooldownSeconds: 3.2 },
      ],
    },
  ],
}

export const BOSSES: Readonly<Record<string, BossDefinition>> = {
  'claude-auditor': CLAUDE_AUDITOR,
  'claude-rewriter': CLAUDE_REWRITER,
}

export function bossDefinition(id: string): BossDefinition | undefined {
  return BOSSES[id]
}
