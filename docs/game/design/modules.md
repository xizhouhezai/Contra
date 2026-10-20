---
title: 模块设计
description: 包划分、职责边界、接口定义与依赖规则
---

# 模块设计

## 包职责

| 包 | 职责 | 允许依赖 | 禁止依赖 |
| --- | --- | --- | --- |
| `@contra/game-core` | 玩法规则、实体、系统、关卡数据 | 无（仅 TS 标准库） | Phaser、DOM、任何渲染/平台 API |
| `@contra/game-platform` | 平台能力接口与 Web 实现 | `game-core`（仅类型） | Phaser |
| `@contra/game-web` | 表现层：场景、精灵、UI、音频、输入 | `game-core`、`game-platform` | 直接访问 localStorage（须走 platform 层） |

## 依赖规则强制

规则层的纯净性是移动端扩展的前提，必须**机器可验证**，不能靠自觉。

### 1. Biome 导入限制

```json
{
  "overrides": [
    {
      "includes": ["packages/game-core/**"],
      "linter": {
        "rules": {
          "correctness": {
            "noRestrictedImports": {
              "options": {
                "patterns": [
                  { "group": ["**"], "message": "game-core 必须保持零依赖" },
                  { "group": ["phaser", "**/phaser"], "message": "game-core 不得依赖 Phaser" }
                ]
              }
            }
          }
        }
      }
    }
  ]
}
```

### 2. CI 依赖边界检查

```bash
# game-core 的依赖必须为空
node -e "const p=require('./packages/game-core/package.json');
  const d={...p.dependencies,...p.devDependencies};
  if(d&&Object.keys(d).length) {
    console.error('game-core 存在依赖:',d); process.exit(1)
  }"
```

### 3. 源码扫描

```bash
# game-core 不得 import 渲染或平台 API
grep -rnE "from ['"](phaser|@contra/game-web|@contra/game-platform)" packages/game-core/src
  && { echo "game-core 出现越界导入"; exit 1; } || echo "边界检查通过"
```

## 规则层模块

### entities/

| 模块 | 职责 | 关键接口 |
| --- | --- | --- |
| `Player` | 玩家状态：位置、速度、生命、武器槽、炸弹数 | `update(dt, input)` |
| `Enemy` | 敌人实例：类型、HP、行为状态机 | `update(dt, world)` |
| `Bullet` | 子弹：位置、速度、伤害、所有者、穿透数 | `update(dt)` |
| `Boss` | Boss 实体：阶段、招式调度、血量 | `update(dt, world)` |
| `Pickup` | 掉落物：武器、补给、收集物 | `update(dt, player)` |

### systems/

| 模块 | 职责 |
| --- | --- |
| `Movement` | 移动、跳跃、重力、平台碰撞与落地判定 |
| `Combat` | 伤害结算、无敌帧、死亡判定、阵营关系 |
| `Weapons` | 武器槽管理、开火节奏、弹药衰减、散射散布 |
| `Collision` | 空间哈希维护与碰撞对生成 |
| `Spawner` | 按关卡脚本生成敌人与掉落 |
| `Score` | 分数、连击、命中率统计 |

### stages/

| 模块 | 职责 |
| --- | --- |
| `StageRunner` | 推进关卡脚本（段落、触发点、出口判定） |
| `BossDirector` | Boss 阶段推进、招式调度、阶段切换演出 |
| `MechanicResolver` | 机制开关：弹墙、可破坏地形、移动平台、纵向卷轴 |

## 适配层接口

```ts
/** 输入快照 —— 规则层唯一能看到的输入形式 */
export interface InputState {
  readonly moveX: -1 | 0 | 1
  readonly moveY: -1 | 0 | 1
  readonly jump: boolean
  readonly fire: boolean
  readonly bomb: boolean
}

export interface InputSource {
  poll(): InputState
  dispose(): void
}

/** 持久化存储 */
export interface Storage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
  clear(): void
}

/** 音频 */
export interface AudioPort {
  playBgm(trackId: string): void
  stopBgm(): void
  playSfx(sfxId: string): void
  setVolume(channel: "master" | "bgm" | "sfx", value: number): void
}

/** 生命周期 —— 原生端切后台时冻结逻辑 */
export interface Lifecycle {
  onPause(cb: () => void): void
  onResume(cb: () => void): void
}

/** 触感反馈 —— Web 端可为空实现 */
export interface Haptics {
  pulse(pattern: "light" | "medium" | "heavy"): void
}
```

## 表现层模块

| 场景 | 职责 |
| --- | --- |
| `BootScene` | 加载核心资源，显示进度 |
| `TitleScene` | 标题画面与主菜单 |
| `CharacterSelectScene` | 四栏选角，读取角色数据 |
| `StageSelectScene` | 12 关网格，读取存档进度 |
| `StageScene` | 核心游戏场景，承载规则层 World |
| `HudScene` | 生命、分数、连击、武器槽、Boss 血条 |
| `ResultScene` | 结算与评价 |
| `PauseScene` | 暂停与设置 |

**精灵封装**：每个 Phaser 精灵持有一个规则层实体引用，
每帧从实体读取位置/朝向/动画状态并同步，不反向写回。

## 事件流

```text
规则层                       表现层
──────                       ──────
World.update(dt, input)
  │
  ├─ 实体系统更新
  ├─ 碰撞与伤害结算
  └─ 产出 events[]
         │
         └──────────────────────→ 事件总线
                                   │
                     ┌─────────────┼─────────────┐
                     ↓             ↓             ↓
                  音效播放      特效生成      HUD 更新
```

## 追溯

本文件实现：REQ-NFR-004 · REQ-NFR-020 · REQ-PLY-010

相关：[技术架构](/game/design/architecture) · [数据模型](/game/design/data-model)
