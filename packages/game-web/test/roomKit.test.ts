import type Phaser from 'phaser'
import { describe, expect, it } from 'vitest'
import {
  hasRoomKitTile,
  preloadRoomKit,
  ROOM_KIT_ACTS,
  ROOM_KIT_TILE_NAMES,
  ROOM_KIT_TILE_SIZE,
  type RoomKitAct,
  roomKitActFor,
  roomKitTileKey,
  usesRoomKit,
} from '../src/stage/terrain'

/**
 * The room kit is a per-act set of six tiles (stage-art-prompts-batch23.md §7.1).
 *
 * Everything asserted here is either a pure function or a question about which
 * files the glob found - the drawing path needs a real Phaser renderer, which the
 * node test environment does not have. The presence checks are written so they
 * hold both while acts II and III are still being packed and after: act I must be
 * complete (it already ships), and an act that has started shipping must be
 * complete rather than half-loaded.
 */
describe('Room kit, per act (batch 2/3 §7.2)', () => {
  it('puts stages 1-4 in act I, 5-8 in act II and 9-12 in act III', () => {
    expect(roomKitActFor(1)).toBe(1)
    expect(roomKitActFor(4)).toBe(1)
    expect(roomKitActFor(5)).toBe(2)
    expect(roomKitActFor(8)).toBe(2)
    expect(roomKitActFor(9)).toBe(3)
    expect(roomKitActFor(12)).toBe(3)
  })

  it('clamps an out-of-range stage index into the first or last act', () => {
    // Callers pass `stage.index ?? 1` and campaign indices are 1..12, but a
    // hand-built request must not be able to produce an act with no kit at all.
    expect(roomKitActFor(0)).toBe(1)
    expect(roomKitActFor(-3)).toBe(1)
    expect(roomKitActFor(13)).toBe(3)
    expect(roomKitActFor(99)).toBe(3)
  })

  it('names textures by act so the three kits cannot overwrite each other', () => {
    // Phaser's texture cache is global to the game, so an act-less key would let
    // whichever act loaded first paint the other two.
    expect(roomKitTileKey(1, 'floor')).toBe('act1-tile-floor')
    expect(roomKitTileKey(2, 'floor')).toBe('act2-tile-floor')
    expect(roomKitTileKey(3, 'platform')).toBe('act3-tile-platform')

    for (const name of ROOM_KIT_TILE_NAMES) {
      const keys = ROOM_KIT_ACTS.map((act) => roomKitTileKey(act, name))
      expect(new Set(keys).size).toBe(ROOM_KIT_ACTS.length)
    }
  })

  it('keeps the six piece names and the act I size table unchanged', () => {
    expect([...ROOM_KIT_TILE_NAMES]).toEqual([
      'floor',
      'wall',
      'platform',
      'props',
      'hazard',
      'door',
    ])
    // Sizes come from the packer and are common to all three acts.
    expect(ROOM_KIT_TILE_SIZE.floor).toEqual({ width: 256, height: 256 })
    expect(ROOM_KIT_TILE_SIZE.wall).toEqual({ width: 256, height: 256 })
    expect(ROOM_KIT_TILE_SIZE.platform).toEqual({ width: 384, height: 64 })
    expect(ROOM_KIT_TILE_SIZE.props).toEqual({ width: 256, height: 192 })
    expect(ROOM_KIT_TILE_SIZE.hazard).toEqual({ width: 384, height: 128 })
    expect(ROOM_KIT_TILE_SIZE.door).toEqual({ width: 288, height: 160 })
  })

  it('has act I art for all six pieces', () => {
    for (const name of ROOM_KIT_TILE_NAMES) {
      expect(hasRoomKitTile(1, name)).toBe(true)
    }
    expect(usesRoomKit(1)).toBe(true)
  })

  it('ships acts II and III all six at a time, or not at all', () => {
    // The packer writes the six files as one batch. A partially-visible act would
    // mean a half-packed directory, which is the state that must not reach a
    // player; asserting "none or all six" holds either side of the parallel pack.
    for (const act of [2, 3] as const) {
      const present = ROOM_KIT_TILE_NAMES.filter((name) => hasRoomKitTile(act, name))
      if (present.length === 0) continue
      expect(present, `act ${act} is half-packed`).toHaveLength(ROOM_KIT_TILE_NAMES.length)
    }
  })

  it('only claims the kit when the two pieces the platform path reads exist', () => {
    // `drawRoomKitPlatform` needs the floor plate or the platform strip and
    // nothing else, so a stage must not be sent down the kit path on the strength
    // of a props atlas alone.
    for (const stageIndex of [1, 5, 9]) {
      const act = roomKitActFor(stageIndex)
      const expected = hasRoomKitTile(act, 'floor') && hasRoomKitTile(act, 'platform')
      expect(usesRoomKit(stageIndex)).toBe(expected)
    }
  })

  it('queues only the keys of the act it was asked for', () => {
    const queued: string[] = []
    // A loader double rather than a real Phaser one: the only member the function
    // uses is `image(key, url)`, and the node environment has no renderer.
    const load = {
      image: (key: string) => {
        queued.push(key)
      },
    } as unknown as Phaser.Loader.LoaderPlugin

    preloadRoomKit(load, 1)

    expect(queued).toHaveLength(ROOM_KIT_TILE_NAMES.length)
    for (const key of queued) expect(key.startsWith('act1-tile-')).toBe(true)
    expect(new Set(queued).size).toBe(queued.length)
  })

  it('queues exactly the pieces an act has, and never another act’s keys', () => {
    const queued: string[] = []
    const load = {
      image: (key: string) => {
        queued.push(key)
      },
    } as unknown as Phaser.Loader.LoaderPlugin

    for (const act of [2, 3] as const) {
      queued.length = 0
      preloadRoomKit(load, act)
      const expected = ROOM_KIT_TILE_NAMES.filter((name) => hasRoomKitTile(act, name)).length
      expect(queued).toHaveLength(expected)
      for (const key of queued) expect(key.startsWith(`act${act}-tile-`)).toBe(true)
    }
  })

  it('covers every act the campaign can reach', () => {
    // Twelve stages, four per act: if an act were ever added, the boundary test
    // above would go stale silently and this is the line that would notice.
    const acts = new Set<RoomKitAct>()
    for (let stageIndex = 1; stageIndex <= 12; stageIndex += 1) {
      acts.add(roomKitActFor(stageIndex))
    }
    expect([...acts].sort()).toEqual([...ROOM_KIT_ACTS])
  })
})
