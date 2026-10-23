import type { BossMove } from '../stages/BossDirector.js'

/**
 * How far each boss move reaches.
 *
 * The move data in data/bosses.ts describes damage and timing but not geometry,
 * because a move is authored before the arena it plays in exists. Reach lives
 * here instead: a sweep crosses the arena, a chain needs the player close, a
 * ground attack misses anyone airborne.
 *
 * The default is deliberately short. A move with no entry here should punish
 * standing next to the boss, not the entire screen - otherwise adding a move
 * silently makes the fight unavoidable.
 */
export interface MoveReach {
  /** Horizontal distance from the arena centre the move still covers, px. */
  readonly maxDistance: number
  /** True when a player mid-jump is above the attack and takes no damage. */
  readonly requiresGrounded: boolean
}

const DEFAULT_REACH: MoveReach = { maxDistance: 300, requiresGrounded: false }

export const BOSS_MOVE_REACH: Readonly<Record<string, MoveReach>> = {
  // Claude the auditor: a scanning beam sweeps the hall, the chain reaches out.
  'audit-beam': { maxDistance: 900, requiresGrounded: false },
  'clause-chain': { maxDistance: 380, requiresGrounded: false },

  // Claude the rewriter: a wall-wide sweep, a single piercing lance.
  'rewrite-sweep': { maxDistance: 900, requiresGrounded: false },
  'redline-lance': { maxDistance: 520, requiresGrounded: false },

  // GPT corpus: swarms fill the air, vines only threaten the floor.
  'corpus-swarm': { maxDistance: 900, requiresGrounded: false },
  'harvest-vines': { maxDistance: 900, requiresGrounded: true },

  // GPT emergent: the burst is arena-wide, the scythe is a close sweep.
  'emergence-burst': { maxDistance: 900, requiresGrounded: false },
  'reaper-scythe': { maxDistance: 460, requiresGrounded: false },
}

export function reachFor(move: BossMove | string): MoveReach {
  const id = typeof move === 'string' ? move : move.id
  return BOSS_MOVE_REACH[id] ?? DEFAULT_REACH
}
