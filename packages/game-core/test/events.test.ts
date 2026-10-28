import { describe, expect, it } from 'vitest'
import type { CoreEvent, CoreEventType } from '../src/core.js'

/**
 * Every event family the presentation layer must be able to consume
 * (docs/game/design/architecture.md §事件驱动).
 *
 * This list is the contract, and the coverage proof below fails to compile when
 * core.ts grows an event that is not named here. It did exactly that: boss
 * telegraph and attack landed with the boss-move fix, then enemy telegraph and
 * shot with the enemy-attack work, and this test refused to build until the four
 * were added. That is the whole reason the proof exists.
 */
const REQUIRED_EVENT_TYPES = [
  'shot',
  'hit',
  'enemyDied',
  'playerHurt',
  'playerHealed',
  'playerDied',
  'weaponPicked',
  'explosion',
  'bossTelegraph',
  'bossAttack',
  'bossPhaseChanged',
  'enemyTelegraph',
  'enemyShot',
  'minibossStarted',
  'minibossCleared',
  'waveStarted',
  'stageCleared',
] as const

type RequiredEventType = (typeof REQUIRED_EVENT_TYPES)[number]

type Expect<T extends true> = T

/**
 * Compile-time proof that CoreEvent covers exactly the nine required events:
 * nothing extra left uncovered, nothing required left missing.
 */
const EXACT_COVERAGE: Expect<
  [Exclude<CoreEventType, RequiredEventType>, Exclude<RequiredEventType, CoreEventType>] extends [
    never,
    never,
  ]
    ? true
    : false
> = true

const samples: readonly CoreEvent[] = [
  { type: 'shot', weaponId: 'pulse', position: { x: 0, y: 0 }, direction: { x: 1, y: 0 } },
  { type: 'hit', targetId: 'enemy-1', damage: 10, position: { x: 4, y: 4 } },
  { type: 'enemyDied', enemyId: 'enemy-1', position: { x: 4, y: 4 }, score: 100 },
  { type: 'playerHurt', heartsLeft: 2, position: { x: 8, y: 8 } },
  { type: 'playerHealed', heartsLeft: 3 },
  { type: 'playerDied', position: { x: 8, y: 8 } },
  { type: 'weaponPicked', weaponId: 'laser', slot: 1 },
  { type: 'explosion', position: { x: 12, y: 12 }, radius: 96 },
  { type: 'bossTelegraph', bossId: 'claude-auditor', moveId: 'audit-beam', seconds: 1.2 },
  {
    type: 'bossAttack',
    bossId: 'claude-auditor',
    moveId: 'audit-beam',
    position: { x: 4, y: 4 },
    hit: true,
  },
  { type: 'bossPhaseChanged', bossId: 'claude-auditor', phase: 2, healthFraction: 0.5 },
  {
    type: 'enemyTelegraph',
    enemyId: 'enemy-1',
    weaponId: 'pulse-gun',
    seconds: 0.5,
    position: { x: 4, y: 4 },
  },
  {
    type: 'enemyShot',
    enemyId: 'enemy-1',
    weaponId: 'pulse-gun',
    position: { x: 4, y: 4 },
    direction: { x: -1, y: 0 },
  },
  {
    type: 'minibossStarted',
    minibossId: 'miniboss-dock-foreman',
    position: { x: 6400, y: 400 },
  },
  {
    type: 'minibossCleared',
    minibossId: 'miniboss-dock-foreman',
    position: { x: 6400, y: 400 },
  },
  {
    type: 'waveStarted',
    waveId: 's1-w2',
    position: { x: 1350, y: 0 },
    gates: true,
    count: 2,
  },
  { type: 'stageCleared', score: 5000 },
]

function label(event: CoreEvent): string {
  switch (event.type) {
    case 'shot':
      return `shot:${event.weaponId}`
    case 'hit':
      return `hit:${event.targetId}`
    case 'enemyDied':
      return `enemyDied:${event.enemyId}`
    case 'playerHurt':
      return `playerHurt:${event.heartsLeft}`
    case 'playerHealed':
      return `playerHealed:${event.heartsLeft}`
    case 'playerDied':
      return 'playerDied'
    case 'weaponPicked':
      return `weaponPicked:${event.weaponId}`
    case 'explosion':
      return `explosion:${event.radius}`
    case 'bossTelegraph':
      return `bossTelegraph:${event.moveId}`
    case 'bossAttack':
      return `bossAttack:${event.moveId}`
    case 'bossPhaseChanged':
      return `bossPhaseChanged:${event.bossId}`
    case 'enemyTelegraph':
      return `enemyTelegraph:${event.weaponId}`
    case 'enemyShot':
      return `enemyShot:${event.weaponId}`
    case 'minibossStarted':
      return `minibossStarted:${event.minibossId}`
    case 'minibossCleared':
      return `minibossCleared:${event.minibossId}`
    case 'waveStarted':
      return `waveStarted:${event.waveId}`
    case 'stageCleared':
      return `stageCleared:${event.score}`
    default: {
      const unreachable: never = event
      return unreachable
    }
  }
}

describe('CoreEvent', () => {
  it('covers the nine required event families', () => {
    const seen = samples.map((event) => event.type)

    expect(EXACT_COVERAGE).toBe(true)
    expect(new Set(seen).size).toBe(REQUIRED_EVENT_TYPES.length)
    expect([...seen].sort()).toEqual([...REQUIRED_EVENT_TYPES].sort())
  })

  it('is exhaustively handled by a switch over its discriminant', () => {
    const labels = samples.map(label)

    expect(labels).toHaveLength(REQUIRED_EVENT_TYPES.length)
    expect(labels.every((value) => value.length > 0)).toBe(true)
  })
})
