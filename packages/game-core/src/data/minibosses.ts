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

/* ------------------------------------------------------------------ act II */

/**
 * 冷却监工 - stage 5, the coolant gallery.
 *
 * The stage teaches chasing enemies, so the fight is built around being closed in
 * on: both moves reach further than they look, and the second phase is where the
 * player finds out that backing off is not an answer. The gauge on its chest is
 * the art's way of saying "this one is pressurised", and the names of its moves
 * carry that too.
 */
export const MINIBOSS_COOLANT_OVERSEER: BossDefinition = {
  id: 'miniboss-coolant-overseer',
  name: '冷却监工',
  maxHp: 320,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'pressure-release', damage: 1, telegraphSeconds: 1.2, cooldownSeconds: 3 },
        { id: 'coolant-sweep', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.8 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.45,
      gravityFlip: null,
      moves: [
        { id: 'pressure-release', damage: 2, telegraphSeconds: 0.85, cooldownSeconds: 2.4 },
        { id: 'coolant-sweep', damage: 1, telegraphSeconds: 0.7, cooldownSeconds: 2.1 },
      ],
    },
  ],
}

/**
 * 阵列巡守 - stage 6, the server hall.
 *
 * The flying-enemy stage, so this one fights from above: its lock-on is the
 * longest telegraph in act II and its round is the fastest, which is the same
 * bargain the audit drone makes at a smaller scale. A player who learned to look
 * up in act I is being asked to do it while under a second body's fire.
 */
export const MINIBOSS_ARRAY_WARDEN: BossDefinition = {
  id: 'miniboss-array-warden',
  name: '阵列巡守',
  maxHp: 340,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'array-lock', damage: 1, telegraphSeconds: 1.3, cooldownSeconds: 3.2 },
        { id: 'blade-sweep', damage: 1, telegraphSeconds: 0.9, cooldownSeconds: 2.6 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.5,
      gravityFlip: null,
      moves: [
        { id: 'array-lock', damage: 2, telegraphSeconds: 1, cooldownSeconds: 2.6 },
        { id: 'blade-sweep', damage: 1, telegraphSeconds: 0.75, cooldownSeconds: 2.2 },
      ],
    },
  ],
}

/**
 * 熔炉匠长 - stage 7, the forge.
 *
 * The armoured-enemy stage, so this one is armoured where it counts: its cast
 * comes down from above in a fixed place, which is the one attack an armoured
 * enemy could not simply be walked around. Phase 2 adds damage rather than a new
 * move, because the stage's lesson is already "you cannot out-armour this, you
 * have to move".
 */
export const MINIBOSS_FORGE_MASTER: BossDefinition = {
  id: 'miniboss-forge-master',
  name: '熔炉匠长',
  maxHp: 380,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'forge-cast', damage: 1, telegraphSeconds: 1.4, cooldownSeconds: 3.4 },
        { id: 'anvil-slam', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.8 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.4,
      gravityFlip: null,
      moves: [
        { id: 'forge-cast', damage: 2, telegraphSeconds: 1, cooldownSeconds: 2.6 },
        { id: 'anvil-slam', damage: 2, telegraphSeconds: 0.8, cooldownSeconds: 2.4 },
      ],
    },
  ],
  // The piercing round again, and for the same reason the act I warden drops it:
  // the answer to armour is a shot that ignores it.
  dropsWeapon: 'pierce',
}

/**
 * 红线书记 - stage 8, the rewriting room, immediately before 改写者.
 *
 * The last fight before the act boss, and the one that hands the player their
 * weapon: it drops the laser, which is what the rewriter's gravity-flipping second
 * phase rewards - a beam does not care which way is down. Its moves are the
 * rewriter's own at a third of the scale, so the boss reads as the same system at
 * full size.
 */
export const MINIBOSS_REDLINE_CLERK: BossDefinition = {
  id: 'miniboss-redline-clerk',
  name: '红线书记',
  maxHp: 400,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'red-pen', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.6 },
        { id: 'margin-note', damage: 1, telegraphSeconds: 1.2, cooldownSeconds: 3 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.5,
      gravityFlip: null,
      moves: [
        { id: 'red-pen', damage: 2, telegraphSeconds: 0.85, cooldownSeconds: 2.2 },
        { id: 'margin-note', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.5 },
        { id: 'rule-rewrite', damage: 0, telegraphSeconds: 1.4, cooldownSeconds: 5 },
      ],
    },
  ],
  dropsWeapon: 'laser',
}

/* ----------------------------------------------------------------- act III */

/**
 * 档案看守 - stage 9, the collapsing archive.
 *
 * The breakable-terrain stage, so its fight is about the floor: both moves are
 * ground attacks that arrive where the player is standing, which is what makes
 * standing still after a bomb the wrong reflex. It is the tar pit of the act III
 * set - slower than the others, and it hits harder for it.
 */
export const MINIBOSS_ARCHIVE_KEEPER: BossDefinition = {
  id: 'miniboss-archive-keeper',
  name: '档案看守',
  maxHp: 380,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'shelf-collapse', damage: 1, telegraphSeconds: 1.3, cooldownSeconds: 3.2 },
        { id: 'paper-cut', damage: 1, telegraphSeconds: 0.9, cooldownSeconds: 2.6 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.42,
      gravityFlip: null,
      moves: [
        { id: 'shelf-collapse', damage: 2, telegraphSeconds: 0.95, cooldownSeconds: 2.5 },
        { id: 'paper-cut', damage: 2, telegraphSeconds: 0.7, cooldownSeconds: 2.1 },
      ],
    },
  ],
}

/**
 * 镜像副官 - stage 10, the mirror gallery.
 *
 * The moving-platform stage, and the fight is a timing problem like the stage:
 * its sweep covers the width the player has to cross, and the second phase adds
 * the mirror's own trick - a move that copies the player's weapon. It reads as a
 * rehearsal for the mirror apostle sharing the stage with it.
 */
export const MINIBOSS_MIRROR_LIEUTENANT: BossDefinition = {
  id: 'miniboss-mirror-lieutenant',
  name: '镜像副官',
  maxHp: 400,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'mirror-sweep', damage: 1, telegraphSeconds: 1.1, cooldownSeconds: 2.8 },
        { id: 'offset-copy', damage: 1, telegraphSeconds: 1, cooldownSeconds: 3 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.55,
      gravityFlip: null,
      moves: [
        { id: 'mirror-sweep', damage: 2, telegraphSeconds: 0.8, cooldownSeconds: 2.2 },
        { id: 'offset-copy', damage: 2, telegraphSeconds: 0.75, cooldownSeconds: 2.4 },
        { id: 'mirror-break', damage: 2, telegraphSeconds: 1.2, cooldownSeconds: 3.6 },
      ],
    },
  ],
}

/**
 * 井道看守 - stage 11, the vertical shaft.
 *
 * The only fight in the campaign that is fought on a vertical axis, so its two
 * moves are aimed up and down rather than left and right. Its telegraphs are the
 * longest in the act because the player is falling while they read them, which is
 * a different amount of attention than standing still.
 */
export const MINIBOSS_SHAFT_GAOLER: BossDefinition = {
  id: 'miniboss-shaft-gaoler',
  name: '井道看守',
  maxHp: 420,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'web-drop', damage: 1, telegraphSeconds: 1.5, cooldownSeconds: 3.4 },
        { id: 'claw-climb', damage: 1, telegraphSeconds: 1.2, cooldownSeconds: 3 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.48,
      gravityFlip: null,
      moves: [
        { id: 'web-drop', damage: 2, telegraphSeconds: 1.05, cooldownSeconds: 2.6 },
        { id: 'claw-climb', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.5 },
      ],
    },
  ],
}

/**
 * 涌现先驱 - stage 12, immediately before the GPT fight.
 *
 * The last miniboss in the campaign, and the hardest: three moves in both phases,
 * the highest HP of the twelve, and the widest set of answers demanded. It is the
 * exam the final boss then raises. It does not gate the door - the GPT fight does
 * that - because a stage should not put two locks on one exit.
 */
export const MINIBOSS_EMERGENCE_HERALD: BossDefinition = {
  id: 'miniboss-emergence-herald',
  name: '涌现先驱',
  maxHp: 460,
  phases: [
    {
      phase: 1,
      hpThreshold: 1,
      speedMultiplier: 1,
      gravityFlip: null,
      moves: [
        { id: 'cube-shift', damage: 1, telegraphSeconds: 1.2, cooldownSeconds: 3 },
        { id: 'mesh-surge', damage: 1, telegraphSeconds: 1, cooldownSeconds: 2.7 },
        { id: 'instability', damage: 1, telegraphSeconds: 1.3, cooldownSeconds: 3.6 },
      ],
    },
    {
      phase: 2,
      hpThreshold: 0.5,
      speedMultiplier: 1.6,
      gravityFlip: null,
      moves: [
        { id: 'cube-shift', damage: 2, telegraphSeconds: 0.9, cooldownSeconds: 2.3 },
        { id: 'mesh-surge', damage: 2, telegraphSeconds: 0.75, cooldownSeconds: 2.1 },
        { id: 'instability', damage: 2, telegraphSeconds: 0.95, cooldownSeconds: 2.8 },
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
  'miniboss-coolant-overseer': MINIBOSS_COOLANT_OVERSEER,
  'miniboss-array-warden': MINIBOSS_ARRAY_WARDEN,
  'miniboss-forge-master': MINIBOSS_FORGE_MASTER,
  'miniboss-redline-clerk': MINIBOSS_REDLINE_CLERK,
  'miniboss-archive-keeper': MINIBOSS_ARCHIVE_KEEPER,
  'miniboss-mirror-lieutenant': MINIBOSS_MIRROR_LIEUTENANT,
  'miniboss-shaft-gaoler': MINIBOSS_SHAFT_GAOLER,
  'miniboss-emergence-herald': MINIBOSS_EMERGENCE_HERALD,
}

/** Every miniboss id, in the order the campaign introduces them. */
export const MINIBOSS_IDS: readonly MinibossId[] = [
  'miniboss-dock-foreman',
  'miniboss-pipe-warden',
  'miniboss-scaffold-crane',
  'miniboss-audit-clerk',
  'miniboss-coolant-overseer',
  'miniboss-array-warden',
  'miniboss-forge-master',
  'miniboss-redline-clerk',
  'miniboss-archive-keeper',
  'miniboss-mirror-lieutenant',
  'miniboss-shaft-gaoler',
  'miniboss-emergence-herald',
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
