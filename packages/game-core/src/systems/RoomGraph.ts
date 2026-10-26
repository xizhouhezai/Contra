/**
 * Room graphs: the route through a non-linear section of a stage.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.1.
 *
 * A stage used to be one rectangle with an exit at the far end. The expansion
 * gives a stage sections, and a section can be a cluster of rooms the player moves
 * between. This module owns the shape of that cluster - which rooms exist, which
 * rooms connect, and whether the goal is reachable at all.
 *
 * It is deliberately pure and holds no positions or art. Where a room sits on the
 * screen is RoomLayout's problem; what connects to what is this one's.
 */

/** What a room offers, which decides what the player gets for entering it. */
export type RoomKind = 'combat' | 'treasure' | 'platform' | 'miniboss' | 'start' | 'goal'

export interface RoomNode {
  readonly id: string
  readonly kind: RoomKind
  /** Ids of rooms reachable from here. Order is the order they are offered. */
  readonly exits: readonly string[]
}

export interface RoomGraph {
  readonly rooms: readonly RoomNode[]
  readonly entryId: string
  readonly goalId: string
}

/**
 * Why a graph is unusable.
 *
 * Returned rather than thrown: a graph is authored data, and an authoring tool
 * wants to show every problem at once instead of the first one.
 */
export type RoomGraphProblem =
  | { readonly kind: 'missing-entry'; readonly id: string }
  | { readonly kind: 'missing-goal'; readonly id: string }
  | { readonly kind: 'unknown-exit'; readonly from: string; readonly to: string }
  | { readonly kind: 'duplicate-id'; readonly id: string }
  | { readonly kind: 'goal-unreachable'; readonly id: string }

/** Every room by id; later duplicates are dropped so lookups stay stable. */
function indexRooms(graph: RoomGraph): Map<string, RoomNode> {
  const byId = new Map<string, RoomNode>()
  for (const room of graph.rooms) {
    if (!byId.has(room.id)) byId.set(room.id, room)
  }
  return byId
}

/**
 * Checks a graph before anything tries to run it.
 *
 * The invariant that matters is reachability of the goal. A random layout can
 * produce a graph whose goal sits behind a room the player cannot enter, and the
 * failure mode is not a crash - it is a stage the player walks around forever,
 * which is far worse to diagnose from a bug report.
 */
export function validateRoomGraph(graph: RoomGraph): readonly RoomGraphProblem[] {
  const problems: RoomGraphProblem[] = []
  const byId = indexRooms(graph)

  const seen = new Set<string>()
  for (const room of graph.rooms) {
    if (seen.has(room.id)) problems.push({ kind: 'duplicate-id', id: room.id })
    seen.add(room.id)
  }

  if (!byId.has(graph.entryId)) problems.push({ kind: 'missing-entry', id: graph.entryId })
  if (!byId.has(graph.goalId)) problems.push({ kind: 'missing-goal', id: graph.goalId })

  for (const room of byId.values()) {
    for (const exit of room.exits) {
      if (!byId.has(exit)) problems.push({ kind: 'unknown-exit', from: room.id, to: exit })
    }
  }

  // Reachability is only meaningful once the endpoints exist and every exit
  // points somewhere; reporting it before that would bury the real cause.
  if (problems.length === 0 && !reachableFrom(byId, graph.entryId).has(graph.goalId)) {
    problems.push({ kind: 'goal-unreachable', id: graph.goalId })
  }

  return problems
}

/** Room ids reachable from a starting room, following exits. */
export function reachableFrom(
  byId: ReadonlyMap<string, RoomNode>,
  startId: string,
): ReadonlySet<string> {
  const seen = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined || seen.has(id)) continue
    const room = byId.get(id)
    if (room === undefined) continue
    seen.add(id)
    for (const exit of room.exits) queue.push(exit)
  }
  return seen
}

/** The shortest chain of rooms from entry to goal, entry and goal included. */
export function shortestRoute(graph: RoomGraph): readonly string[] {
  const byId = indexRooms(graph)
  if (!byId.has(graph.entryId) || !byId.has(graph.goalId)) return []

  // Breadth-first, so the first time the goal is reached the path is shortest.
  const cameFrom = new Map<string, string>()
  const visited = new Set<string>([graph.entryId])
  const queue = [graph.entryId]

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) break
    if (id === graph.goalId) break
    const room = byId.get(id)
    if (room === undefined) continue
    for (const exit of room.exits) {
      if (visited.has(exit)) continue
      visited.add(exit)
      cameFrom.set(exit, id)
      queue.push(exit)
    }
  }

  if (!visited.has(graph.goalId)) return []

  const path: string[] = []
  let cursor: string | undefined = graph.goalId
  while (cursor !== undefined) {
    path.unshift(cursor)
    cursor = cameFrom.get(cursor)
  }
  return path
}

/**
 * Rooms worth visiting, in the order a player walking the shortest route would
 * meet them.
 *
 * Used to decide how many waves and rewards a route needs: a route three rooms
 * long cannot carry the same pacing as one eight rooms long, and the layout code
 * needs to know which before it places anything.
 */
export function roomsOnRoute(graph: RoomGraph): readonly RoomNode[] {
  const byId = indexRooms(graph)
  return shortestRoute(graph)
    .map((id) => byId.get(id))
    .filter((room): room is RoomNode => room !== undefined)
}

/** True when the graph can be played: it validates and the goal is reachable. */
export function isPlayable(graph: RoomGraph): boolean {
  return validateRoomGraph(graph).length === 0
}
