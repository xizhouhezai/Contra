/**
 * Act I mid-stage bosses.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.4 and
 * docs/game/design/stage-art-prompts-batch1.md §6.
 *
 * A miniboss is not a new kind of thing. It is the same phase machine the stage
 * bosses run - BossDirector steps it, the same three events describe it, the
 * same portrait lookup draws it - placed at a point along the route instead of
 * at the door. That is deliberate: an extra enemy type with its own state machine
 * would be a second thing to keep correct.
 *
 * What makes it a *miniboss* rather than a boss is the budget. Roughly a third
 * of the stage boss's HP in two phases instead of two long ones, so it reads as a
 * wall in the middle of a stage rather than a fight the stage is built around.
 * `gates` is the other half of that: a miniboss guards the way forward, so the
 * player cannot walk past the thing the stage spent a thousand pixels setting up.
 */
import type { BossDefinition } from '../stages/BossDirector.js'
import type { MinibossId } from './types.js'

/**
 * 码头工头 - stage 1, the yard before the crane.
 *
 * The first miniboss in the campaign, so its whole job is to be survivable
 * pressure rather than a test: two moves, generous telegraphs, and half the HP of
 * anything that comes after it. Its second phase only speeds the same two moves
 * up, because a new move here would be a second thing to learn in a fight the
 * player is meeting for the first time.
 */
export const MINIBOSS_DOCK_FOREMAN: BossDefinition = {
  id: 'miniboss-dock-foreman',
  name: '码头工头',
  maxHp: 240,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        // A swing that telegraphs long enough to be walked out of.
        { id: 'crane-swing', damage: 1, telegraphSeconds: 1.1, cooldownSeconds: 2.8 },
        // A short hook that punishes standing still after the swing.
        { id: 'hook-drag', damage: 1, telegraphSeconds: 0.9, cooldownSeconds: 3.2 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.4,
      gravityFlip: null,
      moves: [
        { id: 'crane-swing', damage: 1, telegraphSeconds: 0.8, cooldownSeconds: 2.2 },
        { id: 'hook-drag', damage: 2, telegraphSeconds: 0.7, cooldownSeconds: 2.6 },
      ],
    },
  ],
}

/**
 * 管廊看守 - stage 2, the rust corridor.
 *
 * The stage teaches bounce walls, so the miniboss is built to make the player use
 * them: its two moves cover the straight line, and the corridor's reflector is the
 * way to hit it while backing off. Damage 2 on the second phase is what stops the
 * fight from being a strafe loop.
 */
export const MINIBOSS_PIPE_WARDEN: BossDefinition = {
  id: 'miniboss-pipe-warden',
  name: '管廊看守',
  maxHp: 280,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'valve-burst', damage: 1, telegraphSeconds: 1.2, cooldownSeconds: 3 },
        { id: 'pipe-sweep', damage: 1, telegraphSeconds: 0.9, cooldownSeconds: 2.6 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.5,
      gravityFlip: null,
      moves: [
        { id: 'valve-burst', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.4 },
        { id: 'pipe-sweep', damage: 1, telegraphSeconds: 0.7, cooldownSeconds: 2 },
      ],
    },
  ],
  // The reward is a piercing round: the corridor's teaching is "shoot the wall
  // and hit what is behind you", and a round that passes through a body is the
  // same idea the player just learned, handed to them as a gun.
  dropsWeapon: 'pierce',
}

/**
 * 栈道吊车 - stage 3, the scaffolding.
 *
 * The platforming stage, so this one is fought over gaps rather than on a floor:
 * its long telegraphs punish a player who commits to a jump, and its second
 * phase is the fastest of the four because by now the player has three stages of
 * practice reading a warning band.
 */
export const MINIBOSS_SCAFFOLD_CRANE: BossDefinition = {
  id: 'miniboss-scaffold-crane',
  name: '栈道吊车',
  maxHp: 300,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'hook-drop', damage: 1, telegraphSeconds: 1.3, cooldownSeconds: 3.2 },
        { id: 'jib-swing', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.8 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.55,
      gravityFlip: null,
      moves: [
        { id: 'hook-drop', damage: 2, telegraphSeconds: 0.95, cooldownSeconds: 2.4 },
        { id: 'jib-swing', damage: 1, telegraphSeconds: 0.7, cooldownSeconds: 2.1 },
      ],
    },
  ],
}

/**
 * 审计书记 - stage 4, the audit hall, immediately before the auditor.
 *
 * The hardest of the four and the only one that gates a boss stage, because it is
 * the last thing taught before the act boss: it re-uses the auditor's own clause
 * language at a third of the scale, so the fight that follows reads as the same
 * system at full size rather than as a new one.
 */
export const MINIBOSS_AUDIT_CLERK: BossDefinition = {
  id: 'miniboss-audit-clerk',
  name: '审计书记',
  maxHp: 360,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'clause-stamp', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.6 },
        { id: 'ledger-scan', damage: 1, telegraphSeconds: 1.1, cooldownSeconds: 3 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.45,
      gravityFlip: null,
      moves: [
        { id: 'clause-stamp', damage: 2, telegraphSeconds: 0.85, cooldownSeconds: 2.2 },
        { id: 'ledger-scan', damage: 1, telegraphSeconds: 0.75, cooldownSeconds: 2.4 },
        // The auditor's own beam, at a third of its reach. Reading this once here
        // is what makes stage 4's boss a larger version of a known attack.
        { id: 'audit-beam', damage: 2, telegraphSeconds: 1.3, cooldownSeconds: 4 },
      ],
    },
  ],
}

/** Every miniboss the campaign can spawn, by id. */
export const MINIBOSSES: Readonly<Record<MinibossId, BossDefinition>> = {
  'miniboss-dock-foreman': MINIBOSS_DOCK_FOREMAN,
  'miniboss-pipe-warden': MINIBOSS_PIPE_WARDEN,
  'miniboss-scaffold-crane': MINIBOSS_SCAFFOLD_CRANE,
  'miniboss-audit-clerk': MINIBOSS_AUDIT_CLERK,
}

/** Every miniboss id, in the order act I introduces them. */
export const MINIBOSS_IDS: readonly MinibossId[] = [
  'miniboss-dock-foreman',
  'miniboss-pipe-warden',
  'miniboss-scaffold-crane',
  'miniboss-audit-clerk',
]

/**
 * Size of a miniboss's hit area.
 *
 * Bigger than an ordinary enemy because it is meant to be hit: a body that
 * telegraphs for over a second and then dodges the answer is an unfair fight, and
 * the generous box is what makes the telegraph a real opportunity rather than a
 * hint. Smaller than BOSS_HIT_HEIGHT (120) so the two are never mistaken for each
 * other in a screenshot.
 */
export const MINIBOSS_HIT_WIDTH = 72
export const MINIBOSS_HIT_HEIGHT = 104

/** True when the id names a miniboss rather than a stage boss. */
export function isMinibossId(id: string): id is MinibossId {
  return Object.hasOwn(MINIBOSSES, id)
}

/** The definition for one miniboss, or undefined when the id is not one. */
export function minibossDefinition(id: string): BossDefinition | undefined {
  return isMinibossId(id) ? MINIBOSSES[id] : undefined
}
