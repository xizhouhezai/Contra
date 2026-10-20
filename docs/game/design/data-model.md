---
title: 数据模型
description: 角色、武器、关卡、敌人的数据结构定义
---

# 数据模型

所有游戏数据以**纯 TypeScript 常量**或 **JSON 文件**定义，
不写在代码逻辑里（REQ-STG-008：改关卡无需改代码）。

## 类型位置约定

```text
packages/game-core/src/data/
├── types.ts        全部类型定义
├── characters.ts   4 角色 + 4 Boss 形态
├── weapons.ts      8 种武器
├── enemies.ts      10 种敌人
├── stages.ts       12 关配置
└── index.ts        汇总导出
```

## 基础类型

```ts
export interface Vec2 {
  readonly x: number
  readonly y: number
}

export type EntityId = string

export type Difficulty = "casual" | "standard" | "hardcore"

export type WeaponId =
  | "pulse" | "scatter" | "rifle" | "homing"
  | "pierce" | "cluster" | "laser" | "grenade"

export type CharacterId = "deepseek" | "qwen" | "doubao" | "glm"

export type BossId =
  | "claude-auditor" | "claude-rewriter" | "gpt-corpus" | "gpt-emergent"

export type MechanicId =
  | "bounce-wall" | "platforming" | "tracking-enemy" | "flying-enemy"
  | "armored-enemy" | "breakable-terrain" | "moving-platform" | "vertical-scroll"
```

## 角色数据

```ts
export interface PassiveSkill {
  readonly id: string
  readonly name: string
  readonly description: string
  /** 通用参数，含义由 id 决定 */
  readonly params: Readonly<Record<string, number>>
}

export interface BombSkill {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly damage: number
  readonly radius: number
  readonly durationMs: number
}

export interface CharacterDefinition {
  readonly id: CharacterId
  readonly name: string
  readonly codename: string
  readonly tagline: string
  readonly initialWeapon: WeaponId
  readonly passive: PassiveSkill
  readonly bomb: BombSkill
  readonly bombCharges: number
  readonly palette: {
    readonly primary: string
    readonly secondary: string
    readonly projectile: string
  }
  readonly quotes: readonly string[]
}

export interface BossDefinition {
  readonly id: BossId
  readonly name: string
  readonly title: string
  readonly boss: CharacterId | "gpt" | "claude"
  readonly hp: number
  readonly contactDamage: number
  readonly score: number
  readonly phases: readonly BossPhaseDefinition[]
  readonly palette: {
    readonly primary: string
    readonly secondary: string
  }
  readonly quotes: readonly string[]
}

export interface BossPhaseDefinition {
  readonly index: number
  readonly hpThreshold: number
  readonly moves: readonly BossMoveDefinition[]
  readonly transition: {
    readonly paletteShift: boolean
    readonly musicTrack: string
    readonly durationMs: number
  }
}

export interface BossMoveDefinition {
  readonly id: string
  readonly name: string
  readonly cooldownMs: number
  readonly telegraphMs: number
  readonly params: Readonly<Record<string, number>>
}
```

**示例：DeepSeek**

```ts
export const deepseek: CharacterDefinition = {
  id: "deepseek",
  name: "DeepSeek",
  codename: "深寻",
  tagline: "让我把所有可能性都算一遍。",
  initialWeapon: "scatter",
  passive: {
    id: "scatter-decay",
    name: "扩散之芯",
    description: "散弹类武器弹道衰减速度减半",
    params: { decayMultiplier: 0.5 },
  },
  bomb: {
    id: "blast-core",
    name: "扩散冲击",
    description: "以自身为圆心大范围爆炸伤害",
    damage: 40,
    radius: 96,
    durationMs: 400,
  },
  bombCharges: 3,
  palette: {
    primary: "#1f3a5f",
    secondary: "#3d6ea5",
    projectile: "#8fb8e8",
  },
  quotes: ["让我把所有可能性都算一遍。"],
}
```

## 武器数据

```ts
export type WeaponKind = "projectile" | "beam" | "throwable"

export interface WeaponDefinition {
  readonly id: WeaponId
  readonly name: string
  readonly kind: WeaponKind
  readonly damage: number
  readonly shotsPerSecond: number
  readonly projectileSpeed: number
  readonly projectileCount: number
  readonly ammo: number
  readonly spreadDeg: number
  readonly pierceCount: number
  readonly homing: boolean
  readonly homingTurnRate: number
  readonly rarity: "basic" | "common" | "rare" | "epic"
}
```

**数值来源**：[GDD §3.2 武器数值](/game/requirements/gdd#32-武器数值)。
改数值只改这个文件，不触碰战斗逻辑。

## 敌人数据

```ts
export type EnemyBehavior =
  | "patrol" | "turret" | "charger" | "flyer" | "armored" | "mirror" | "carrier"

export interface EnemyDefinition {
  readonly id: string
  readonly name: string
  readonly behavior: EnemyBehavior
  readonly hp: number
  readonly contactDamage: number
  readonly speed: number
  readonly score: number
  readonly sprite: string
  /** 出现该敌人的关卡 id 列表 */
  readonly stages: readonly string[]
  /** 特殊参数，如追踪速度倍率 */
  readonly params: Readonly<Record<string, number>>
}
```

## 关卡数据

```ts
export interface StageDefinition {
  readonly id: string
  readonly index: number
  readonly act: 1 | 2 | 3
  readonly name: string
  readonly scene: string
  readonly music: string
  /** 目标通关时长（秒），用于难度校验 */
  readonly targetDurationSec: number
  /** 本关引入的新机制 */
  readonly introduces: MechanicId | null
  readonly segments: readonly StageSegment[]
  readonly boss: BossId | null
  readonly pickupTable: readonly PickupEntry[]
}

export interface StageSegment {
  readonly kind: "explore" | "encounter" | "puzzle"
  readonly lengthPx: number
  readonly spawns: readonly SpawnEntry[]
  readonly platforms: readonly PlatformDefinition[]
  readonly hazards: readonly HazardDefinition[]
}

export interface SpawnEntry {
  readonly enemyId: string
  readonly count: number
  /** 相对段落起点的 X 偏移 */
  readonly atX: number
  readonly atY?: number
  readonly intervalMs?: number
}

export interface PlatformDefinition {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** 可破坏平台需要指定破坏后暴露的内容 */
  readonly breakable?: boolean
  readonly reveals?: string
  /** 移动平台 */
  readonly motion?: {
    readonly axis: "x" | "y"
    readonly distance: number
    readonly periodMs: number
    readonly phaseMs: number
  }
}

export interface HazardDefinition {
  readonly kind: "steam" | "lava" | "crusher" | "fall"
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly damage: number
  readonly periodMs?: number
  readonly activeMs?: number
}

export interface PickupEntry {
  readonly itemId: string
  readonly chance: number
  readonly atX: number
}
```

**示例：第 1 关**

```ts
export const stage01: StageDefinition = {
  id: "stage-01",
  index: 1,
  act: 1,
  name: "码头晨雾",
  scene: "harbor-dawn",
  music: "bgm-02",
  targetDurationSec: 90,
  introduces: null,
  segments: [
    {
      kind: "explore",
      lengthPx: 1600,
      spawns: [{ enemyId: "patrol", count: 4, atX: 200, intervalMs: 1200 }],
      platforms: [],
      hazards: [],
    },
  ],
  boss: null,
  pickupTable: [{ itemId: "weapon-pulse", chance: 1, atX: 400 }],
}
```

## 运行时状态

```ts
export interface PlayerState {
  readonly position: Vec2
  readonly velocity: Vec2
  readonly onGround: boolean
  readonly facing: -1 | 1
  readonly aiming: Vec2
  readonly hearts: number
  readonly invulnerableUntil: number
  readonly weaponSlots: readonly WeaponSlot[]
  readonly activeSlot: number
  readonly bombsLeft: number
}

export interface WeaponSlot {
  readonly weaponId: WeaponId
  readonly ammoLeft: number
  /** 散弹散布的累积量，0~1 */
  readonly spreadAccum: number
}

export interface RunState {
  readonly characterId: CharacterId
  readonly stageId: string
  readonly score: number
  readonly combo: number
  readonly comboExpiresAt: number
  readonly shotsFired: number
  readonly shotsHit: number
  readonly startedAt: number
}
```

## 存档格式

```ts
export interface SaveData {
  readonly version: 1
  readonly highestScore: number
  readonly clearedStages: readonly string[]
  readonly settings: {
    readonly masterVolume: number
    readonly bgmVolume: number
    readonly sfxVolume: number
    readonly difficulty: Difficulty
    readonly touchLayout: "default" | "left" | "right"
  }
}
```

**版本字段**：`version` 用于未来迁移。当前只有 v1，
但字段必须存在，否则第一次改结构时就没有迁移依据。

## 追溯

本文件实现：REQ-STG-008 · REQ-CHR-002 ~ 005 · REQ-PLY-003 ~ 004

相关：[玩法规格](/game/requirements/gameplay) · [关卡规格](/game/requirements/stages) · [模块设计](/game/design/modules)
