/**
 * GPT - 皮特潘, the final boss. Two forms, four phases.
 *
 * Source of truth: docs/game/requirements/characters.md - GPT 皮特潘 and
 * docs/game/tasks/backlog.md T-M3-06.
 *
 * The four phases map onto the fight's narrative beats: corpus (I, II), the
 * split into echoes (III, driven by Echoes rather than the phase table), then
 * emergence (IV). Phase III carries no moves - the echoes are the threat - which
 * is why the director can drive it with an empty move list plus the echo system.
 */
import type { BossDefinition } from '../stages/BossDirector.js'

/**
 * 语料 (form I) and 涌现 (form II) as one fight.
 *
 * Thresholds: phase 1 covers 100%-70%, phase 2 70%-40%, the echo interlude sits
 * at 40% (handled by Echoes, not here), and phase 4 opens below 40% once the
 * echoes are gone.
 */
export const GPT_PETER_PAN: BossDefinition = {
  id: 'gpt-emergent',
  name: '皮特潘',
  maxHp: 1200,
  phases: [
    {
      // 形态 I · 语料: a wall of data thrown at the player.
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'data-flood', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.4 },
        { id: 'compress-wave', damage: 2, telegraphSeconds: 1.3, cooldownSeconds: 3.4 },
        { id: 'sample-draw', damage: 1, telegraphSeconds: 0.7, cooldownSeconds: 1.8 },
      ],
    },
    {
      // 形态 I · 语料, second half: the same moves, tighter.
      phase: 2,
      hpThreshold: 0.7,
      speedMultiplier: 1.25,
      gravityFlip: null,
      moves: [
        { id: 'data-flood', damage: 1, telegraphSeconds: 0.85, cooldownSeconds: 2 },
        { id: 'compress-wave', damage: 2, telegraphSeconds: 1.1, cooldownSeconds: 2.8 },
        { id: 'sample-draw', damage: 1, telegraphSeconds: 0.55, cooldownSeconds: 1.5 },
      ],
    },
    {
      // Interlude at 40%: the body splits. No moves - the echoes are the fight.
      phase: 3,
      hpThreshold: 0.4,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [],
    },
    {
      // 形态 II · 涌现, once the echoes are cleared.
      phase: 4,
      hpThreshold: 0.4,
      speedMultiplier: 1.4,
      // Emergence rewrites the arena the way the rewriter did, in bursts.
      gravityFlip: { secondsPerCycle: 5 },
      moves: [
        { id: 'emergent-proliferation', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.4 },
        { id: 'overfit', damage: 2, telegraphSeconds: 1.1, cooldownSeconds: 3 },
        { id: 'collapse', damage: 3, telegraphSeconds: 1.5, cooldownSeconds: 4.5 },
      ],
    },
  ],
}

/**
 * The phase the director should be in, accounting for the echo interlude.
 *
 * The plain threshold lookup would return phase 4 as soon as HP passes 40%, but
 * the body is untargetable during the interlude. This resolves which of the two
 * phases occupies the same threshold, which is the one piece of state the boss
 * table cannot express on its own.
 */
export function gptPhaseFor(hp: number, maxHp: number, echoesCleared: boolean): 1 | 2 | 3 | 4 {
  const fraction = hp / maxHp
  if (fraction > 0.7) return 1
  if (fraction > 0.4) return 2
  return echoesCleared ? 4 : 3
}

/** The four phases in narrative order, for the presentation layer's music cues. */
export const GPT_PHASE_LABELS = [
  { phase: 1, label: '语料 · 倾泻' },
  { phase: 2, label: '语料 · 压缩' },
  { phase: 3, label: '涌现 · 增殖' },
  { phase: 4, label: '涌现 · 坍缩' },
] as const
