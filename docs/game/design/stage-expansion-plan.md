# 关卡扩容方案 · 路径 C（密度 + roguelite）

> 状态：**已批准，已落地**（2026-10-28）
> 决策来源：Q1 先看方案 / Q2 玩法密度 + roguelite / Q3 美术按幕分 3 批
> 批准结果：Q1 接受垂直切片（第 1 关已作为切片落地）/ Q2 REQ-VIS-001 已改写为长线战役 / Q3 单关目标定 10 分钟
> 落地结果：**12 关全部按 600s 重做完毕**（合计 7200s = 120 分钟），每关 1 个中段小 Boss，
> 无头 Chrome 逐关验收通过
> 前置文档：[关卡扩容讨论](/game/design/stage-expansion)（冲突与实测数据）

## 一、结论先行

当前状态与目标的差距：

| 指标 | 决策前实测 | 目标 | 倍数 | 现状（2026-10-28） |
| --- | --- | --- | --- | --- |
| 单关时长 | 14.8s（实测） | 480-600s | **32-40x** | 600s（设计值），12/12 关 |
| 12 关合计 | 25.5 分钟（设计值） | 100-120 分钟 | 3.9-4.7x | **120 分钟**（7200s） |
| 敌人种类 | 10 | 18-22 | ~2x | 14（+4 幕 I 新敌人） |
| 背景 | 4 | 10-16 | 2.5-4x | 7（+3 幕 I 房间背景） |
| 房间/段落 | 0（单一静态关卡） | 每幕 6-8 套可组合房间 | 从零 | 每关 5-6 段波次（房间图仍零调用方） |
| 中段小 Boss | 0 | 12-24 | 从零 | **12**（每关 1 个） |

> 目标列按 2026-10-28 决策取值：单关 10 分钟、全战役 100~120 分钟，与改写后的 REQ-VIS-001 一致。
> 「决策前实测」列是决策前的现状实测，保留作基线；最后一列是本次交付后的实际状态。
> **唯一未达成的是房间图（RoomGraph / RoomLayout）**：它们写好了、也有测试，但仍然零调用方——
> 实际落地的是「波次 + 门禁 + 中段小 Boss」这条更直接的路径，见 §四。

**这个改动不是调参，是重做关卡架构。** 下面给出完整方案与成本。

## 二、核心设计：三段式关卡

每关 10-20 分钟由三个层次构成：

```text
┌─────────────────────────────────────────────────┐
│ 幕（Act）      : 4 关，共享一套美术与敌人池      │
├─────────────────────────────────────────────────┤
│ 关（Stage）    : 10-20 分钟                      │
│   ├─ 段落 A（主线）  4-6 分钟  固定编排          │
│   ├─ 房间群（rogue） 3-5 分钟  随机路线          │
│   ├─ 段落 B（主线）  3-6 分钟  固定编排          │
│   └─ 关底 Boss       1-2 分钟                    │
└─────────────────────────────────────────────────┘
```

**为什么这样切**

- 主线段落**固定**：保证每关有可预期的节奏与教学点
- 房间群**随机**：提供重复可玩性与时长弹性
- 这正是 roguelite 与线性横版的常见结合方式（如《死亡细胞》的分支路线 + 固定 Boss）

## 三、时长构成（到 600 秒）

| 层 | 时长 | 来源 |
| --- | --- | --- |
| 主线段落 A | 240s | 地图 12000px + 3-4 波敌人 + 1 个中段小 Boss |
| 房间群 | 180s | 4-6 个房间，每个 30-45s |
| 主线段落 B | 150s | 地图 8000px + 2-3 波 + 平台段 |
| 关底 Boss | 30s | 现有 Boss |
| **合计** | **600s** | |

地图总长 **20000px/关**（当前平均 2392px，8.4x），纯跑约 111 秒——**只占 18%**。其余 82% 是战斗与探索。

## 四、新增规则层模块

现有 `StageDefinition` 是**单一静态关卡**：一个 `platforms` 数组、一个 `targets` 数组、一个 `exit`。没有房间、没有段落、没有波次概念。

需要新增四个模块：

### 4.1 `RoomGraph.ts` — 房间图与路线

```ts
interface RoomNode {
  readonly id: string
  readonly kind: 'combat' | 'treasure' | 'platform' | 'miniboss'
  readonly exits: readonly string[]   // 通向哪些房间
}
interface RoomGraph {
  readonly rooms: readonly RoomNode[]
  readonly entry: string
  readonly goal: string
}
```

职责：定义可走的路线，检测死路，计算最短通关路径。

### 4.2 `RoomLayout.ts` — 按种子选择房间

```ts
interface RoomTemplate {
  readonly id: string
  readonly kind: RoomNode['kind']
  readonly widthPx: number
  readonly platforms: readonly TerrainPlatform[]
  readonly spawnPoints: readonly Vec2[]
}
function pickRooms(graph: RoomGraph, seed: number): readonly RoomTemplate[]
```

职责：同一关卡不同种子给出不同房间组合，**但必须保证可通关**（这是最关键的不变式）。

### 4.3 `Wave.ts` — 波次编排

```ts
interface Wave {
  readonly trigger: Rect          // 玩家进入此区域触发
  readonly spawns: readonly { targetId: string; x: number; delaySeconds: number }[]
  readonly clearsGate: boolean    // 全灭才开门
}
```

职责：敌人不再全图铺满，而是**按区域分批出现**。这是时长的最大来源（150s/关）。

### 4.4 `MiniBoss.ts` — 中段小 Boss

复用现有 `BossDirector`：一个小 Boss 就是只有 1-2 个阶段、低血量的 `BossDefinition`。

## 五、数据结构扩展

`StageDefinition` 需要从「单一关卡」变成「段落序列」：

```ts
// 现有
interface StageDefinition {
  platforms: readonly TerrainPlatform[]
  targets: readonly TargetDefinition[]
  exit: Rect
  // ...
}

// 扩展后
interface StageDefinition {
  /** 主线段落，按顺序播放 */
  readonly sections: readonly StageSection[]
  readonly bossId?: BossId
  // platforms/targets/exit 变为 section 内部字段
}

type StageSection =
  | { kind: 'linear'; /* 固定编排：地图+波次 */ }
  | { kind: 'rooms'; graph: RoomGraph; seed?: number }
```

**兼容性**：现有 12 关可以把整关包进一个 `linear` section，迁移路径平滑。

## 六、工程量

| 项 | 规模 | 说明 |
| --- | --- | --- |
| 规则层新模块 | 4 个 | RoomGraph / RoomLayout / Wave / MiniBoss |
| `StageDefinition` 重构 | 1 次 | 12 个关卡数据全部改写 |
| `World` 改造 | 中 | 需要支持段落切换、房间边界、波次触发 |
| 表现层 | 中 | 房间过渡、波次预警、路线指示 |
| 新增测试 | 60-100 个 | 每个新模块 + 可通关性不变式 |
| 12 关数据重写 | 大 | 每关 5-8 个段落，共 60-96 个段落定义 |

**估计**：规则层约 4 个模块 + 重构，数据层是当前 12 关的 5-8 倍。

## 七、美术需求（按幕分 3 批）

现有：10 敌人 / 4 背景 / 8 Boss / 28 特效。

按路径 C 需要：

| 类型 | 现有 | 新增 | 合计 |
| --- | --- | --- | --- |
| 敌人 | 10 种 | +10 种（每幕 3-4 种） | 20 种 |
| 背景层 | 4 张 | +9 张（每幕 3 层） | 13 张 |
| 房间套件 | 0 | 每幕 6 套模块化地形 | 18 套 |
| 中段小 Boss | 0 | 每幕 4 个 | 12 个 |
| 波次/路线 UI | 0 | 3 张 | 3 张 |

**分 3 批**，每批交付后即可接入该幕并验收：

- **批次 1（幕 I）**：4 敌人 + 3 背景 + 6 房间套件 + 4 小 Boss —— **已生成并接入**（2026-10-28）
- **批次 2（幕 II）**：3 敌人 + 3 背景 + 6 房间套件 + 4 小 Boss —— **小 Boss 已生成并接入**
  （占位图，`scripts/generate-acts23-minibosses.py`；其余装饰性资产按需接入）
- **批次 3（幕 III）**：3 敌人 + 3 背景 + 6 房间套件 + 4 小 Boss —— **小 Boss 已生成并接入**
  （同上）

批次 1 已落盘 36 个文件（新敌人 8 / 房间背景 3 / 地形套件 6 / 中段小 Boss 16 / 玩法 UI 3），
幕 I 四关的 4 个中段小 Boss 与 4 种新敌人已进入接入流程；其余装饰性资产按需接入。

批次 2/3 的 8 只中段小 Boss 已落盘 64 个文件（各 4 帧 × webp+png），
美术是**程序化占位图**而非生成图：本环境没有图像生成 API，`scripts/generate-acts23-minibosses.py`
按 Riso 规范画出规格正确的占位（360×360、RGBA、墨黑主体 76~93%），后续替换真图是换纹理而非重做。
它们已经接入 12 关的 8 个关卡并通过浏览器验收。

详细提示词见 [批次美术提示词](/game/design/stage-art-prompts-batch1)。

## 八、成本提示

这个方案的规模已经超出「一次任务」，实际是三块独立工作：

1. **规则层重构**（RoomGraph / RoomLayout / Wave / MiniBoss + StageDefinition 重写）
2. **12 关数据重写**（60-96 个段落）
3. **美术 3 批**（每批 17-20 个资产）

**建议先只做一关的完整垂直切片**，验证架构可行后再铺开 12 关。

## 九、决策结果（2026-10-28 已确认）

| # | 问题 | 推荐 | 决策 |
| --- | --- | --- | --- |
| 1 | 是否接受「先做 1 关垂直切片」再铺开 | 是（降低风险） | **接受**。第 1 关已作为切片落地：12000px、五段波次、600s 目标、码头工头 |
| 2 | REQ-VIS-001 是否改写为长线战役 | 是 | **改写**。新口径为「单关 8~10 分钟、全 12 关 100~120 分钟」 |
| 3 | 单关目标定 10 分钟还是 15 分钟 | 10 分钟先跑通 | **定 10 分钟**（`timeTargetSeconds: 600`），幕 I 四关按此执行 |

切片验证后的铺开顺序：幕 I 第 2~4 关已按同配方铺开（各带 1 个中段小 Boss）；
下一步是按同一节奏扩容幕 II/III，其 8 关仍在旧时长上（设计值合计 1680s），是后续工作量的大头。

## 十、追溯

本文件实现：REQ-VIS-001（已于 2026-10-28 改写为长线战役）、REQ-STG-009（中段小 Boss）、
REQ-STG-010（敌人波次）、REQ-STG-001、REQ-STG-005、REQ-GDD-003

相关：[关卡扩容讨论](/game/design/stage-expansion) · [技术架构](/game/design/architecture) · [数据模型](/game/design/data-model)
