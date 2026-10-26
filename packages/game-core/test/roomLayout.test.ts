import { describe, expect, it } from 'vitest'
import {
  isPlayable,
  type RoomGraph,
  reachableFrom,
  roomsOnRoute,
  shortestRoute,
  validateRoomGraph,
} from '../src/systems/RoomGraph.js'
import {
  isLayout,
  layoutRooms,
  missingTemplateKinds,
  type RoomTemplate,
} from '../src/systems/RoomLayout.js'

/**
 * The roguelite section has one invariant that matters more than any other:
 * randomness must not produce a stage the player cannot finish.
 *
 * These tests hold that line. A graph whose goal sits behind a room with no
 * entrance, or a template set missing a doorway kind, has to be rejected at
 * authoring and layout time - not discovered by a player who walks in circles.
 */

function graph(rooms: RoomGraph['rooms'], entryId = 'a', goalId = 'c'): RoomGraph {
  return { rooms, entryId, goalId }
}

const straight = graph([
  { id: 'a', kind: 'start', exits: ['b'] },
  { id: 'b', kind: 'combat', exits: ['c'] },
  { id: 'c', kind: 'goal', exits: [] },
])

describe('room graph (stage-expansion-plan §4.1)', () => {
  it('accepts a straight chain', () => {
    expect(validateRoomGraph(straight)).toEqual([])
    expect(isPlayable(straight)).toBe(true)
  })

  it('reports a goal that cannot be reached', () => {
    // b exits nowhere, so c exists but is cut off. This is the shape a careless
    // randomiser produces, and it plays as a stage that never ends.
    const broken = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'combat', exits: [] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    const problems = validateRoomGraph(broken)
    expect(problems.map((p) => p.kind)).toContain('goal-unreachable')
  })

  it('reports an exit pointing at a room that does not exist', () => {
    const broken = graph([
      { id: 'a', kind: 'start', exits: ['ghost'] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    expect(validateRoomGraph(broken).map((p) => p.kind)).toContain('unknown-exit')
  })

  it('reports a missing entry or goal', () => {
    expect(
      validateRoomGraph(graph([{ id: 'a', kind: 'start', exits: [] }], 'nope', 'c')).map(
        (p) => p.kind,
      ),
    ).toContain('missing-entry')
    expect(
      validateRoomGraph(graph([{ id: 'a', kind: 'start', exits: [] }], 'a', 'nope')).map(
        (p) => p.kind,
      ),
    ).toContain('missing-goal')
  })

  it('finds the shortest route, not just any route', () => {
    const g = graph([
      { id: 'a', kind: 'start', exits: ['b', 'long1'] },
      { id: 'b', kind: 'combat', exits: ['c'] },
      { id: 'long1', kind: 'platform', exits: ['long2'] },
      { id: 'long2', kind: 'platform', exits: ['c'] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    expect(shortestRoute(g)).toEqual(['a', 'b', 'c'])
  })

  it('returns no route when the goal is unreachable', () => {
    const broken = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'combat', exits: [] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    expect(shortestRoute(broken)).toEqual([])
  })

  it('lists the rooms on the route in order', () => {
    const kinds = roomsOnRoute(straight).map((room) => room.kind)
    expect(kinds).toEqual(['start', 'combat', 'goal'])
  })

  it('does not loop forever on a cycle', () => {
    const cyclic = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'combat', exits: ['a', 'c'] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    expect(reachableFrom(new Map(cyclic.rooms.map((r) => [r.id, r])), 'a').size).toBe(3)
    expect(shortestRoute(cyclic)).toEqual(['a', 'b', 'c'])
  })
})

const templates: readonly RoomTemplate[] = [
  {
    id: 't-start',
    kind: 'start',
    widthPx: 800,
    heightPx: 540,
    platforms: [{ x: 0, y: 400, width: 800, height: 60 }],
    spawnPoints: [],
  },
  {
    id: 't-combat',
    kind: 'combat',
    widthPx: 1200,
    heightPx: 540,
    platforms: [{ x: 0, y: 400, width: 1200, height: 60 }],
    spawnPoints: [{ x: 600, y: 360 }],
  },
  {
    id: 't-goal',
    kind: 'goal',
    widthPx: 600,
    heightPx: 540,
    platforms: [{ x: 0, y: 400, width: 600, height: 60 }],
    spawnPoints: [],
  },
  {
    id: 't-treasure',
    kind: 'treasure',
    widthPx: 400,
    heightPx: 540,
    platforms: [{ x: 0, y: 400, width: 400, height: 60 }],
    spawnPoints: [],
  },
]

describe('room layout (stage-expansion-plan §4.2)', () => {
  it('lays out every room on the route, left to right', () => {
    const result = layoutRooms(straight, templates, 1, shortestRoute(straight))
    if (!isLayout(result)) throw new Error('expected a layout')
    expect(result.rooms.map((r) => r.nodeId)).toEqual(['a', 'b', 'c'])
    const xs = result.rooms.map((r) => r.originX)
    expect(xs).toEqual([...xs].sort((p, q) => p - q))
  })

  it('offsets terrain into section coordinates', () => {
    const result = layoutRooms(straight, templates, 1, shortestRoute(straight))
    if (!isLayout(result)) throw new Error('expected a layout')
    const second = result.rooms[1]
    if (second === undefined) throw new Error('missing room')
    // The combat template's platform starts at 0 locally, so it must start at the
    // room's origin once placed.
    expect(second.platforms[0]?.x).toBe(second.originX)
  })

  it('produces the same layout for the same seed', () => {
    const run = (seed: number) => {
      const result = layoutRooms(straight, templates, seed, shortestRoute(straight))
      if (!isLayout(result)) throw new Error('expected a layout')
      return result.rooms.map((r) => r.templateId).join(',')
    }
    expect(run(42)).toBe(run(42))
  })

  it('refuses a graph whose goal cannot be reached', () => {
    const broken = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'combat', exits: [] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    const result = layoutRooms(broken, templates, 1, ['a', 'b'])
    expect(isLayout(result)).toBe(false)
    if (!isLayout(result)) expect(result.problem.kind).toBe('invalid-graph')
  })

  it('refuses when a room kind has no template', () => {
    const g = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'miniboss', exits: ['c'] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    const result = layoutRooms(g, templates, 1, ['a', 'b', 'c'])
    expect(isLayout(result)).toBe(false)
    if (!isLayout(result)) {
      expect(result.problem.kind).toBe('no-template')
    }
  })

  it('names the missing template kinds before play', () => {
    const g = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'miniboss', exits: ['c'] },
      { id: 'c', kind: 'goal', exits: [] },
    ])
    expect(missingTemplateKinds(g, templates)).toEqual(['miniboss'])
  })

  it('places optional rooms after the goal so the route stays contiguous', () => {
    const g = graph([
      { id: 'a', kind: 'start', exits: ['b'] },
      { id: 'b', kind: 'combat', exits: ['c'] },
      { id: 'c', kind: 'goal', exits: [] },
      { id: 'side', kind: 'treasure', exits: [] },
    ])
    const result = layoutRooms(g, templates, 7, shortestRoute(g))
    if (!isLayout(result)) throw new Error('expected a layout')
    const ids = result.rooms.map((r) => r.nodeId)
    expect(ids.indexOf('side')).toBeGreaterThan(ids.indexOf('c'))
  })
})
