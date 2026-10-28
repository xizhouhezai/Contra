/**
 * REQ-GDD-003: 敌人至少 6 种，含精英与飞行
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file. The behaviour was covered before;
 * only the link was missing.
 */
import { describe, expect, it } from 'vitest'
import {
  absorbsHit,
  canTransition,
  ENEMIES,
  ENEMY_IDS,
  enemyDefinition,
  TRANSITIONS,
  transition,
} from '../src/data/enemies.js'

describe('Enemy catalogue (T-M1-05)', () => {
  it('defines every archetype in the catalogue', () => {
    // Ten act I/II/III archetypes plus act I's four expansion enemies, from
    // docs/game/design/stage-art-prompts-batch1.md §3. The count is asserted
    // against ENEMY_IDS itself rather than a literal so that adding one is a
    // deliberate act: the list and the definitions cannot drift apart without
    // one of these failing.
    expect(ENEMY_IDS).toHaveLength(14)
    expect(Object.keys(ENEMIES)).toHaveLength(ENEMY_IDS.length)
  })

  it('gives each archetype a distinct behaviour', () => {
    // Distinct in name at least. Two archetypes sharing a behaviour would mean
    // one of them is a re-skin, and every one of these is supposed to read as a
    // different thing to fight.
    const behaviours = ENEMY_IDS.map((id) => enemyDefinition(id).behaviour)
    expect(new Set(behaviours).size).toBe(ENEMY_IDS.length)
  })

  it('lists every definition in the id array', () => {
    for (const id of Object.keys(ENEMIES)) {
      expect(ENEMY_IDS).toContain(id)
    }
  })

  it('keeps every stat positive where it should be', () => {
    for (const id of ENEMY_IDS) {
      const def = enemyDefinition(id)
      expect(def.hp).toBeGreaterThan(0)
      expect(def.damage).toBeGreaterThan(0)
      expect(def.score).toBeGreaterThan(0)
      expect(def.width).toBeGreaterThan(0)
      expect(def.height).toBeGreaterThan(0)
      expect(def.speed).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps stationary archetypes at zero speed', () => {
    expect(enemyDefinition('turret').speed).toBe(0)
    expect(enemyDefinition('forge').speed).toBe(0)
    // Act I's two stage-pieces: a hook is bolted to the ceiling and a vent is a
    // hole in the floor, so neither is a body that walks.
    expect(enemyDefinition('crane-hook').speed).toBe(0)
    expect(enemyDefinition('steam-vent').speed).toBe(0)
  })

  it('marks only the two hovering archetypes as flying', () => {
    expect(enemyDefinition('flyer').flying).toBe(true)
    expect(enemyDefinition('audit-drone').flying).toBe(true)
    const flying = ENEMY_IDS.filter((id) => enemyDefinition(id).flying)
    expect(flying).toHaveLength(2)
    expect(enemyDefinition('patrol').flying).toBe(false)
  })
})

describe('Enemy state machine (T-M1-05)', () => {
  it('lets a live enemy reach dead', () => {
    for (const state of ['idle', 'patrol', 'chase', 'attack', 'hurt'] as const) {
      expect(canTransition(state, 'dead')).toBe(true)
    }
  })

  it('treats dead as terminal', () => {
    expect(TRANSITIONS.dead).toHaveLength(0)
    for (const state of ['idle', 'patrol', 'chase', 'attack', 'hurt', 'dead'] as const) {
      expect(canTransition('dead', state)).toBe(false)
    }
  })

  it('refuses an illegal move instead of throwing', () => {
    // dead is terminal, so any move out of it is refused.
    expect(transition('dead', 'chase')).toBe('dead')
    expect(transition('dead', 'idle')).toBe('dead')
  })

  it('applies a legal move', () => {
    expect(transition('patrol', 'chase')).toBe('chase')
    expect(transition('chase', 'dead')).toBe('dead')
  })
})

describe('Armoured enemies (T-M1-05)', () => {
  it('absorbs frontal hits and takes rear hits', () => {
    const armored = enemyDefinition('armored')
    // A shot travelling leftward comes from the right, hitting the front.
    expect(absorbsHit(armored, true)).toBe(true)
    expect(absorbsHit(armored, false)).toBe(false)
  })

  it('never absorbs when not armoured', () => {
    const patrol = enemyDefinition('patrol')
    expect(absorbsHit(patrol, true)).toBe(false)
  })
})
