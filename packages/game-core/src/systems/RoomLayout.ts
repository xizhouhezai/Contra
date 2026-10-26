/**
 * Room layout: turning a room graph into placed, playable rooms.
 *
 * Source of truth: docs/game/design/stage-expansion-plan.md §4.2.
 *
 * The hard part of a roguelite section is not randomness, it is that randomness
 * must not produce an unwinnable stage. This module holds that line: it picks
 * templates for the nodes of a validated graph, and it refuses to return a layout
 * unless the result still validates and its route is still walkable.
 *
 * Seeded rather than Math.random so a seed reproduces a run - required for
 * debugging a report and for the determinism the rule layer already promises.
 */

import {
  type RoomGraph,
  type RoomGraphProblem,
  type RoomKind,
  type RoomNode,
  reachableFrom,
  validateRoomGraph,
} from './RoomGraph.js'
import type { TerrainPlatform } from './Terrain.js'

/** One authored room shape. Several templates may share a kind. */
export interface RoomTemplate {
  readonly id: string
  readonly kind: RoomKind
  readonly widthPx: number
  readonly heightPx: number
  /** Terrain in room-local coordinates; placed by offsetting to the room origin. */
  readonly platforms: readonly TerrainPlatform[]
  /** Where enemies may appear, room-local. */
  readonly spawnPoints: readonly { readonly x: number; readonly y: number }[]
}

/** A template placed at a position along the section. */
export interface PlacedRoom {
  readonly nodeId: string
  readonly kind: RoomKind
  readonly templateId: string
  /** Left edge of the room in section coordinates. */
  readonly originX: number
  /** Terrain in section coordinates. */
  readonly platforms: readonly TerrainPlatform[]
  readonly spawnPoints: readonly { readonly x: number; readonly y: number }[]
}

export interface RoomLayout {
  readonly rooms: readonly PlacedRoom[]
  readonly widthPx: number
  /** The rooms on the shortest route, in order. */
  readonly route: readonly string[]
}

/** Why a layout could not be produced. */
export type LayoutProblem =
  | {
      readonly kind: 'invalid-graph'
      /** What the graph checker objected to, so an author sees the cause. */
      readonly problems: readonly RoomGraphProblem[]
    }
  | { readonly kind: 'no-template'; readonly nodeId: string; readonly roomKind: RoomKind }
  | { readonly kind: 'route-broken'; readonly reachable: readonly string[] }

/**
 * A small, fast deterministic generator.
 *
 * Mulberry32: one 32-bit word of state, uniform enough for choosing rooms, and
 * reproducible from a seed written in a bug report. A cryptographic generator
 * would be the wrong tool - it costs more and buys nothing a player can see.
 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Templates grouped by the kind they can fill. */
function templatesByKind(
  templates: readonly RoomTemplate[],
): ReadonlyMap<RoomKind, readonly RoomTemplate[]> {
  const byKind = new Map<RoomKind, RoomTemplate[]>()
  for (const template of templates) {
    const list = byKind.get(template.kind) ?? []
    list.push(template)
    byKind.set(template.kind, list)
  }
  return byKind
}

/**
 * Places a room for every node, left to right along the route.
 *
 * Rooms not on the route are placed after the goal, which is what an optional
 * branch is: reachable, not required. Their x does not matter to the player, only
 * that they exist and can be entered, so they are appended rather than laid out
 * geometrically.
 */
export function layoutRooms(
  graph: RoomGraph,
  templates: readonly RoomTemplate[],
  seed: number,
  route: readonly string[],
): RoomLayout | { readonly problem: LayoutProblem } {
  const graphProblems = validateRoomGraph(graph)
  if (graphProblems.length > 0) {
    return { problem: { kind: 'invalid-graph', problems: graphProblems } }
  }

  const byKind = templatesByKind(templates)
  const random = makeRandom(seed)
  const nodesById = new Map<string, RoomNode>()
  for (const node of graph.rooms) if (!nodesById.has(node.id)) nodesById.set(node.id, node)

  // Optional rooms come after the goal so the route stays contiguous.
  const optional = graph.rooms.map((room) => room.id).filter((id) => !route.includes(id))

  const placed: PlacedRoom[] = []
  let cursorX = 0

  for (const nodeId of [...route, ...optional]) {
    const node = nodesById.get(nodeId)
    if (node === undefined) continue

    const candidates = byKind.get(node.kind) ?? []
    if (candidates.length === 0) {
      return { problem: { kind: 'no-template', nodeId, roomKind: node.kind } }
    }
    const template = candidates[Math.floor(random() * candidates.length)]
    if (template === undefined) {
      return { problem: { kind: 'no-template', nodeId, roomKind: node.kind } }
    }

    placed.push({
      nodeId,
      kind: node.kind,
      templateId: template.id,
      originX: cursorX,
      platforms: template.platforms.map((platform) => ({
        ...platform,
        x: platform.x + cursorX,
      })),
      spawnPoints: template.spawnPoints.map((point) => ({ x: point.x + cursorX, y: point.y })),
    })
    cursorX += template.widthPx
  }

  // The check that makes the module safe: whatever was chosen, the goal must still
  // be reachable through placed rooms. A template missing a doorway cannot produce
  // a layout that ships.
  const placedIds = new Map<string, RoomNode>()
  for (const room of placed) {
    const node = nodesById.get(room.nodeId)
    if (node !== undefined) placedIds.set(room.nodeId, node)
  }
  const reachable = reachableFrom(placedIds, graph.entryId)
  if (!reachable.has(graph.goalId)) {
    return { problem: { kind: 'route-broken', reachable: [...reachable] } }
  }

  return { rooms: placed, widthPx: cursorX, route }
}

/** True when layoutRooms returned a layout rather than a problem. */
export function isLayout(
  result: RoomLayout | { readonly problem: LayoutProblem },
): result is RoomLayout {
  return 'rooms' in result
}

/**
 * The templates a section needs, so authoring can be checked before play.
 *
 * A section whose graph uses a room kind with no template cannot be laid out, and
 * finding that out at load time rather than at play time is the difference
 * between a failed build and a stage the player falls through.
 */
export function missingTemplateKinds(
  graph: RoomGraph,
  templates: readonly RoomTemplate[],
): readonly RoomKind[] {
  const byKind = templatesByKind(templates)
  const missing = new Set<RoomKind>()
  for (const room of graph.rooms) {
    if ((byKind.get(room.kind) ?? []).length === 0) missing.add(room.kind)
  }
  return [...missing]
}
