import { describe, expect, it } from 'vitest'
import { CHARACTER_IDS, INITIAL_WEAPON } from '../src/data/characters.js'
import type { WeaponId } from '../src/data/types.js'
import {
  explosionRadius,
  FALLBACK_WEAPON_ID,
  PRISM_BASE_TARGETS,
  WEAPON_IDS,
  WEAPONS,
} from '../src/data/weapons.js'
import { createPlayer } from '../src/entities/Player.js'
import { createWeaponSlot, equipWeapon } from '../src/systems/Arsenal.js'

/**
 * GDD §3.2 武器数值, transcribed column by column. Fields the table leaves empty
 * for a row are null here, so a value invented in the catalogue stands out.
 */
interface GddRow {
  readonly id: WeaponId
  readonly name: string
  readonly damage: number
  readonly shotsPerSecond: number
  readonly projectileSpeed: number | null
  readonly projectileCount: number | null
  readonly ammo: number
  readonly special: string
}

const GDD_3_2: readonly GddRow[] = [
  {
    id: 'pulse',
    name: '脉冲弹',
    damage: 10,
    shotsPerSecond: 6,
    projectileSpeed: 420,
    projectileCount: 1,
    ammo: Number.POSITIVE_INFINITY,
    special: '保底武器',
  },
  {
    id: 'scatter',
    name: '扩散散弹',
    damage: 8,
    shotsPerSecond: 3,
    projectileSpeed: 380,
    projectileCount: 5,
    ammo: 120,
    special: '连续射击弹道变散',
  },
  {
    id: 'rifle',
    name: '长程连射',
    damage: 6,
    shotsPerSecond: 12,
    projectileSpeed: 700,
    projectileCount: 1,
    ammo: 200,
    special: '射程远',
  },
  {
    id: 'homing',
    name: '追踪弹幕',
    damage: 12,
    shotsPerSecond: 4,
    projectileSpeed: 300,
    projectileCount: 1,
    ammo: 150,
    special: '自动锁定',
  },
  {
    id: 'pierce',
    name: '穿甲弹',
    damage: 25,
    shotsPerSecond: 4,
    projectileSpeed: 520,
    projectileCount: 1,
    ammo: 40,
    special: '穿透 1 个',
  },
  {
    id: 'replay',
    name: '回溯弹',
    damage: 8,
    shotsPerSecond: 5,
    projectileSpeed: 480,
    projectileCount: 1,
    ammo: 150,
    special: '命中叠加记忆印记',
  },
  {
    id: 'prism',
    name: '棱镜弹',
    damage: 7,
    shotsPerSecond: 4,
    projectileSpeed: 500,
    projectileCount: 1,
    ammo: 150,
    special: '同时命中 3 个目标',
  },
  {
    id: 'cluster',
    name: '集束炸弹',
    damage: 30,
    shotsPerSecond: 1.2,
    projectileSpeed: null,
    projectileCount: null,
    ammo: 30,
    special: '落地爆炸',
  },
  {
    id: 'laser',
    name: '激光枪',
    damage: 3,
    shotsPerSecond: 20,
    projectileSpeed: null,
    projectileCount: null,
    ammo: 100,
    special: '持续光束',
  },
  {
    id: 'grenade',
    name: '散射榴弹',
    damage: 35,
    shotsPerSecond: 1,
    projectileSpeed: null,
    projectileCount: null,
    ammo: 25,
    special: '大范围爆炸',
  },
]

describe('Weapon catalogue (T-M1-01)', () => {
  it('defines exactly the ten GDD weapons', () => {
    expect(WEAPON_IDS).toHaveLength(10)
    expect(new Set(WEAPON_IDS).size).toBe(10)
    expect([...WEAPON_IDS].sort()).toEqual([...GDD_3_2.map((row) => row.id)].sort())
  })

  it('instantiates every weapon with a complete definition', () => {
    for (const id of WEAPON_IDS) {
      const weapon = WEAPONS[id]
      expect(weapon).toBeDefined()
      expect(weapon.id).toBe(id)
      expect(weapon.name.length).toBeGreaterThan(0)
      expect(weapon.damage).toBeGreaterThan(0)
      expect(weapon.shotsPerSecond).toBeGreaterThan(0)
      expect(weapon.ammo).toBeGreaterThan(0)
      expect(Number.isFinite(weapon.spreadDeg)).toBe(true)
      expect(Number.isFinite(weapon.pierceCount)).toBe(true)
      expect(Number.isFinite(weapon.homingTurnRate)).toBe(true)
    }
  })

  it('matches GDD §3.2 column by column', () => {
    for (const row of GDD_3_2) {
      const weapon = WEAPONS[row.id]

      expect({ id: row.id, name: weapon.name }).toEqual({ id: row.id, name: row.name })
      expect({ id: row.id, damage: weapon.damage }).toEqual({ id: row.id, damage: row.damage })
      expect({ id: row.id, rate: weapon.shotsPerSecond }).toEqual({
        id: row.id,
        rate: row.shotsPerSecond,
      })
      expect({ id: row.id, ammo: weapon.ammo }).toEqual({ id: row.id, ammo: row.ammo })

      // The three columns the table leaves blank for beam / throwable rows.
      if (row.projectileSpeed !== null) {
        expect({ id: row.id, speed: weapon.projectileSpeed }).toEqual({
          id: row.id,
          speed: row.projectileSpeed,
        })
      }
      if (row.projectileCount !== null) {
        expect({ id: row.id, count: weapon.projectileCount }).toEqual({
          id: row.id,
          count: row.projectileCount,
        })
      }
    }
  })

  it('encodes the 特殊 column in behaviour fields', () => {
    expect(WEAPONS.pulse.ammo).toBe(Number.POSITIVE_INFINITY)
    expect(FALLBACK_WEAPON_ID).toBe('pulse')

    // 连续射击弹道变散: only the scatter family declares a cone.
    expect(WEAPONS.scatter.spreadDeg).toBeGreaterThan(0)
    for (const id of WEAPON_IDS) {
      if (id === 'scatter') continue
      expect({ id, spread: WEAPONS[id].spreadDeg }).toEqual({ id, spread: 0 })
    }

    // 自动锁定
    expect(WEAPONS.homing.homing).toBe(true)
    expect(WEAPONS.homing.homingTurnRate).toBeGreaterThan(0)
    expect(WEAPON_IDS.filter((id) => WEAPONS[id].homing)).toEqual(['homing'])

    // 穿透 1 个 vs 同时命中 3 个目标
    expect(WEAPONS.pierce.pierceCount).toBe(1)
    expect(WEAPONS.prism.pierceCount).toBe(PRISM_BASE_TARGETS - 1)

    // 落地爆炸: throwables fly under gravity and leave a blast.
    expect(WEAPONS.cluster.kind).toBe('throwable')
    expect(WEAPONS.grenade.kind).toBe('throwable')
    expect(explosionRadius('cluster')).toBeGreaterThan(0)
    expect(explosionRadius('grenade')).toBeGreaterThan(explosionRadius('cluster'))
    expect(explosionRadius('pulse')).toBe(0)

    // 持续光束: a beam delivers ticks, not projectiles.
    expect(WEAPONS.laser.kind).toBe('beam')
    expect(WEAPONS.laser.projectileCount).toBe(0)
  })
})

describe('Character starting weapons (T-M1-01)', () => {
  it('gives each of the six characters a different opening weapon', () => {
    const weapons = CHARACTER_IDS.map((id) => INITIAL_WEAPON[id])

    expect(CHARACTER_IDS).toHaveLength(6)
    expect(new Set(weapons).size).toBe(6)
    expect(weapons).toEqual(['scatter', 'rifle', 'homing', 'pulse', 'replay', 'prism'])
  })

  it('equips the starting weapon into slot 0 of a fresh player', () => {
    const player = createPlayer({ x: 0, y: 0 })
    equipWeapon(player, INITIAL_WEAPON.gemini)

    expect(player.weaponSlots[0]?.weaponId).toBe('prism')
    expect(player.weaponSlots[0]?.ammoLeft).toBe(WEAPONS.prism.ammo)
    expect(player.activeSlot).toBe(0)
  })

  it('fills a fresh slot to the weapon ammo capacity', () => {
    expect(createWeaponSlot('pierce').ammoLeft).toBe(40)
    expect(createWeaponSlot('pulse').ammoLeft).toBe(Number.POSITIVE_INFINITY)
  })
})
