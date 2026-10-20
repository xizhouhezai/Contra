---
title: 技术架构
description: 分层结构、技术选型与运行时构成
---

# 技术架构

## 核心命题

游戏必须**同时**满足两个约束：

1. **Web 端流畅可玩** —— 浏览器内 60fps，5 秒内可玩
2. **未来可换引擎出原生 App** —— 不被 Phaser 绑死

这两条合起来指向一个结论：**玩法规则必须与渲染完全解耦**。

## 分层架构

```text
┌─────────────────────────────────────────────────────────┐
│  表现层  @contra/game-web                               │
│  Phaser 3 场景 / 精灵 / 动画 / 音频 / UI / 输入          │
└────────────────────────┬────────────────────────────────┘
                         │ 依赖方向：向下，禁止反向
┌────────────────────────▼────────────────────────────────┐
│  适配层  @contra/game-platform                           │
│  输入映射 / 存储 / 音频 / 生命周期 / 震动                 │
│  定义接口，Web 实现一套，原生实现另一套                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  规则层  @contra/game-core   ← 纯 TypeScript，零依赖       │
│  实体 / 碰撞 / 伤害 / 武器 / 关卡规则 / Boss 状态机       │
│  不引用 Phaser、不引用 DOM、不引用任何渲染 API             │
└─────────────────────────────────────────────────────────┘
                         ▲
                    数据层（纯 JSON / TS 常量）
```

**关键约束**：`@contra/game-core` 的 `package.json` 中**不得**出现 `phaser` 依赖，
其源码**不得** import 任何 DOM 或 Phaser 类型。
这一条由 lint 规则与 CI 脚本强制（见 [模块设计](/game/design/modules)）。

## 运行时循环

```text
每帧（固定步长 1/60s，最多追 5 帧）
  │
  ├─ 1. 采集输入      InputState { moveX, moveY, jump, fire, bomb }
  ├─ 2. 规则层更新    core.update(dt, input) → 事件队列
  ├─ 3. 事件消费      表现层消费 core 事件（命中/死亡/爆炸/拾取）
  └─ 4. 渲染          Phaser 同步精灵状态到规则层实体
```

**为什么固定步长**：规则层的碰撞与伤害判定必须可复现，
否则同一输入序列在不同帧率下结果不同，测试无法自动化。
渲染层用插值平滑可变帧率（REQ-NFR-001）。

## 技术选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 规则层 | TypeScript，零运行时依赖 | 可在 Node 下单测；未来可编译到其他平台 |
| 表现层 | Phaser 3 | 2D 横版成熟方案；WebGL 渲染；场景管理与输入内建 |
| 构建 | Vite | 与工作区现有工具链一致；产物分块与预载可控 |
| 状态 | 自研轻量状态机 | 依赖越少越好，规则层不引入第三方 |
| 测试 | vitest | 已在工作区配置；规则层可纯 Node 环境测试 |
| 静态检查 | Biome | 已配置；规则层可用 `noRestrictedImports` 强制依赖边界 |

## 事件驱动

规则层**不直接调用**表现层。它产出事件，表现层订阅：

```ts
type CoreEvent =
  | { type: "shot"; weaponId: WeaponId; position: Vec2; direction: Vec2 }
  | { type: "hit"; targetId: string; damage: number; position: Vec2 }
  | { type: "enemyDied"; enemyId: string; position: Vec2; score: number }
  | { type: "playerHurt"; heartsLeft: number; position: Vec2 }
  | { type: "playerDied"; position: Vec2 }
  | { type: "weaponPicked"; weaponId: WeaponId; slot: number }
  | { type: "explosion"; position: Vec2; radius: number }
  | { type: "bossPhaseChanged"; bossId: string; phase: number }
  | { type: "stageCleared"; score: number }
```

好处：表现层可以任意重放、录制、回放战斗过程用于调试；
规则层测试只需断言事件序列，无需模拟渲染。

## 目录结构

```text
packages/
├── game-core/          @contra/game-core    规则层（纯 TS）
│   ├── src/
│   │   ├── entities/    Player, Enemy, Bullet, Boss, Pickup
│   │   ├── systems/     Movement, Combat, Weapons, Collision, Spawner
│   │   ├── stages/      StageRunner, BossDirector, MechanicResolver
│   │   ├── data/        角色/武器/关卡/敌人的类型与加载
│   │   └── core.ts      World：持有实体、系统、事件队列
│   └── test/           纯 Node 单测
├── game-platform/      @contra/game-platform  适配层（接口 + Web 实现）
│   ├── src/
│   │   ├── interfaces/  Input, Storage, Audio, Lifecycle, Haptics
│   │   └── web/         浏览器实现
│   └── test/
└── game-web/           @contra/game-web     表现层（Phaser）
    ├── src/
    │   ├── scenes/      Boot, Title, CharacterSelect, Stage, HUD, Result
    │   ├── sprites/     角色与敌人的 Phaser 封装
    │   ├── audio/       BGM 与音效管理
    │   ├── ui/          UI 场景与控件
    │   └── input/       键鼠 / 触屏 → InputState
    └── test/
```

## 性能策略

### 帧预算

| 项 | 预算 | 超限对策 |
| --- | --- | --- |
| 规则层更新 | ≤ 3ms | 降低同时激活实体数 |
| 物理与碰撞 | ≤ 4ms | 空间哈希网格 |
| 渲染提交 | ≤ 6ms | 降级粒子与阴影 |
| 其余 | ≤ 3ms | — |

### 空间哈希

实体按 64×64 网格分桶，碰撞只检测相邻桶。
把 O(n²) 的全量碰撞降到近似 O(n)。
规则层实现（见 [模块设计](/game/design/modules)），不依赖 Phaser 的物理系统——
因为 Phaser 物理与规则层的可复现性要求冲突。

### 对象池

子弹、粒子、伤害数字全部走对象池，运行时零分配。
避免 GC 造成的帧率抖动（REQ-NFR-007）。

### 渲染降级

| 等级 | 条件 | 粒子 | 阴影 | 视差层 |
| --- | --- | --- | --- | --- |
| 高 | 桌面独显 | 全量 | 开 | 4 层 |
| 中 | 集显 / 高端移动 | 半量 | 关 | 3 层 |
| 低 | 低端移动 | 最小 | 关 | 2 层 |

自动检测首 3 秒平均帧率，动态调整。**逻辑帧率永不降级**（支柱一）。

## 首屏加载

```text
index.html  →  核心 JS（游戏逻辑 + Phaser 运行时）
            →  标题场景资源
            →  [玩家点击开始]
            →  关卡资源（按需加载，带进度条）
```

关卡资源按需加载，保证首包 ≤ 8MB（REQ-NFR-003）。
音频文件单独分块，不阻塞首屏。

## 追溯

本文件实现：REQ-NFR-001 ~ 021 · REQ-VIS-004

相关：[模块设计](/game/design/modules) · [数据模型](/game/design/data-model) · [跨端策略](/game/design/cross-platform) · [ADR](/game/design/adr)
