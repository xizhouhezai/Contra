---
title: 敌人与 Boss 攻击能力设计
description: 让敌人主动攻击，修复 Boss 招式被丢弃的缺陷
---

# 敌人与 Boss 攻击能力设计

> **需求来源**：玩家反馈「怪兽和 Boss 没有策划武器和技能，只能被动挨打，互动性不好」
> **核实结论**：玩家描述准确。敌人**完全没有攻击能力**，Boss 的招式数据写好了但**结果被丢弃**。

## 1. 现状核实（已读代码确认）

| 项 | 现状 | 证据 |
| --- | --- | --- |
| 敌人攻击 | **无** | `data/enemies.ts` 只有移动行为（patrol/charger/flyer…） |
| 敌人伤害来源 | **仅靠碰瓷** | `core.ts:697` `if (!touching && !shot) return` |
| Boss 招式数据 | **已有** | `data/bosses.ts` 定义了 `audit-beam`、`clause-chain` 等 |
| Boss 招式执行 | **有，但结果被丢** | `core.ts:361` 只用了 `phaseChanged` 和 `gravityFlipped` |
| 敌人子弹 | **从未创建** | 全仓库无 `owner: 'enemy'` 的子弹构造 |
| 伤害阵营系统 | **已就绪** | `canDamage('enemy', 'player')` 已实现 |
| 子弹系统 | **已就绪** | `createBullet` 支持 owner / gravity / homing / pierce |

**结论**：基础设施齐全，缺的是「让敌人开火」和「消费 Boss 招式结果」两步。

## 2. 核心设计原则

### 2.1 敌人必须有「可读的预告」

Contra 的战斗乐趣来自**躲避**，不是来自敌人伤害高。
所以每个攻击必须先给玩家反应时间：

| 攻击类型 | 预告时长 | 说明 |
| --- | --- | --- |
| 直射 | 0.5s | 子弹缓慢飞行，足够反应 |
| 瞄准射击 | 0.8s | 枪口闪光 + 子弹追踪 |
| 冲撞 | 1.0s | 蓄力抖动 |
| 范围攻击 | 1.2s | 地面预警线 |

**没有预告的攻击一律不做。** 玩家死于看不懂的攻击不是难度，是不公平。

### 2.2 敌人攻击频率必须低

| 关卡阶段 | 敌人同时开火数 | 攻击间隔 |
| --- | --- | --- |
| 幕 I（第 1~3 关） | **最多 1 个** | ≥ 3s |
| 幕 II（第 5~7 关） | 最多 2 个 | ≥ 2s |
| 幕 III（第 9~11 关） | 最多 3 个 | ≥ 1.5s |
| Boss 关 | 独立配平 | 见 Boss 招式表 |

### 2.3 伤害仍然是「一颗心」

现有 `applyHit` 统一吃一颗心，1.5 秒无敌。
**敌人攻击不改变这个规则**，只是增加「被击中的机会」。

---

## 3. 十种敌人的攻击方案

每种敌人配一把**专属武器**，符合它的形象定位。

| 敌人 | 武器 | 攻击方式 | 伤害 | 预告 | 冷却 |
| --- | --- | --- | --- | --- | --- |
| **巡逻兵** patrol | 脉冲枪 | 直射，瞄准玩家方向 | 1 | 0.5s | 3.0s |
| **固定炮台** turret | 霰弹 | 三发扇形散射 | 1 | 0.8s | 2.5s |
| **运载虫** carrier | 追踪弹 | 缓慢追踪弹，1 发 | 1 | 0.8s | 4.0s |
| **冲锋兵** charger | 冲撞 | 无子弹，冲撞本身伤害 2 | 2 | 1.0s | 3.5s |
| **飞行体** flyer | 投掷弹 | 抛物线投掷（受重力） | 1 | 0.6s | 3.0s |
| **守卫者** warden | 扇形散弹 | 五发大角度散射 | 1 | 1.0s | 3.5s |
| **重甲兵** armored | 正面盾挡 | 无子弹，**正面免疫子弹** | 1 | — | — |
| **锻造者** forge | 地刺 | 地面预警 → 地面喷刺 | 1 | 1.2s | 4.0s |
| **镜像体** mirror | 复制玩家弹 | 发射与玩家当前武器相同 | 1 | 0.8s | 3.0s |
| **精英冲锋兵** elite | 冲撞 + 三连射 | 冲撞后追加三发 | 2 | 1.0s | 4.0s |

### 3.1 特殊敌人的说明

**重甲兵**（`armoredFront: true` 已有此字段）

正面免疫子弹，必须绕后或跳劈。这不新增机制，只是**激活了已有字段**。

**镜像体**（mirror）

发射与玩家当前武器相同的子弹 —— 这是「镜像」设定的直接体现，
也是全局最有趣的敌人：玩家用散弹就被散弹打。

**锻造者**（forge）

地面预警线 → 喷刺。是唯一需要地面提示的敌人。

### 3.2 敌人武器数据

```ts
// packages/game-core/src/data/enemyWeapons.ts
export interface EnemyWeapon {
  readonly id: string
  readonly kind: 'straight' | 'spread' | 'homing' | 'lobbed' | 'ground-spike' | 'melee'
  readonly damage: number
  /** Seconds of warning before the shot. */
  readonly telegraphSeconds: number
  /** Seconds between shots. */
  readonly cooldownSeconds: number
  readonly bulletSpeed: number
  readonly bulletCount: number
  /** Spread in degrees, total across all bullets. */
  readonly spreadDeg: number
  /** Whether the shot follows the player. */
  readonly homing: boolean
  /** Bullet gravity; 0 for a straight line. */
  readonly gravity: number
  /** Uses the player's current weapon instead of its own. */
  readonly mirrorsPlayer: boolean
}
```

## 4. Boss 招式修复

### 4.1 缺陷说明

`data/bosses.ts` 里每个 Boss 都有招式定义：

```ts
{ id: 'audit-beam', damage: 2, telegraphSeconds: 1.2, cooldownSeconds: 3 },
{ id: 'clause-chain', damage: 1, telegraphSeconds: 0.8, cooldownSeconds: 2.4 },
```

但 `core.ts:stepBossOnce()` 只消费了 `phaseChanged` 和 `gravityFlipped`，
**`resolved`（招式命中）和 `telegraphed`（预警开始）被完全丢弃**。

所以 Boss 现在**只会移动，不会攻击**。数据写好了，从未被使用。

### 4.2 修复方式

在 `stepBossOnce` 中消费两个字段：

```ts
if (result.telegraphed !== null) {
  this.eventQueue.push({
    type: 'bossTelegraph',
    bossId: boss.definition.id as BossId,
    moveId: result.telegraphed,
  })
}

if (result.resolved !== null) {
  this.applyBossMove(result.resolved, boss)
}
```

`applyBossMove` 按 `moveId` 执行对应攻击（生成子弹 / 造成伤害）。

### 4.3 Boss 招式表

| Boss | 形态 | 招式 | 伤害 | 预告 | 冷却 | 表现 |
| --- | --- | --- | --- | --- | --- | --- |
| **Claude 审计者** | I | audit-beam | 2 | 1.2s | 3.0s | 横扫光束，横向弹幕 |
| | I | clause-chain | 1 | 0.8s | 2.4s | 条款锁链，定向追踪弹 |
| | II | audit-beam | 2 | **0.9s** | 2.2s | 同上，**窗口缩短** |
| | II | clause-chain | 1 | **0.6s** | 1.8s | 同上，**频率加快** |
| **Claude 改写者** | I | rewrite-sweep | 2 | 1.1s | 2.8s | 全屏扇形扫射 |
| | I | redline-lance | 1 | 0.7s | 2.2s | 红色数据流穿刺 |
| | II | rewrite-sweep | 3 | **0.8s** | 2.0s | **伤害提升** |
| | II | redline-lance | 2 | **0.5s** | 1.6s | 更快更密 |
| **GPT 语料** | I | corpus-swarm | 1 | 1.0s | 2.6s | 大量小弹从四面来 |
| | I | harvest-vines | 2 | 1.2s | 3.2s | 地面藤蔓（范围） |
| | II | corpus-swarm | 2 | **0.7s** | 2.0s | **数量加倍** |
| | II | harvest-vines | 2 | **0.9s** | 2.6s | 窗口缩短 |
| **GPT 涌现** | I | emergence-burst | 2 | 1.0s | 2.4s | 崩解粒子爆散 |
| | I | reaper-scythe | 3 | 1.3s | 3.4s | 巨镰横扫（高伤） |
| | II | emergence-burst | 3 | **0.7s** | 1.8s | **更快更密** |
| | II | reaper-scythe | 4 | **1.0s** | 2.8s | **高伤且更快** |

**形态 II 一律更难**：更短预告、更短冷却、更高伤害。

## 5. 预警的表现方式

预告必须**看得见**，不只是数据。

| 形式 | 实现 | 用途 |
| --- | --- | --- |
| 枪口闪光 | 敌人 sprite 上叠加一个亮点，0.3s | 直射类 |
| 红色瞄准线 | 从敌人到玩家的细线，预告时长 = 预警 | 瞄准射击 |
| 地面预警带 | 地面上一条红色发光带 | 锻造者地刺 |
| 屏幕边缘闪光 | Boss 蓄力时屏幕边缘泛光 | Boss 招式 |
| 屏幕震动 | 强度与招式伤害挂钩 | 重击 |

**红色是通用预警色**（`PALETTE.alert` = `#d6452c`），与 Riso 风格一致。

## 6. 实现顺序

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| **1** | 修复 Boss 招式被丢弃（`core.ts`） | Boss 能造成伤害，玩家会被打到 |
| **2** | 敌人攻击框架（`enemyWeapons.ts` + 发射逻辑） | 巡逻兵能直射 |
| **3** | 其余 9 种敌人的武器配置 | 每种敌人都有独特攻击 |
| **4** | 预警表现（枪口闪光 / 瞄准线 / 地面带） | 每次攻击前都有可见预告 |
| **5** | 平衡（幕内同时开火数上限） | 幕 I 不超过 1 个敌人开火 |

**先修 Boss**，因为那是**已有数据被丢弃**，属于缺陷而非新功能，成本最低、收益最直接。

## 7. 验收标准

| 项 | 标准 |
| --- | --- |
| Boss 会攻击 | 进 Boss 关后玩家会被打到，且有预警 |
| 敌人会攻击 | 10 种敌人各自用不同方式攻击 |
| **可躲避** | 每次攻击前都有 ≥0.5s 的可见预告（**最重要**） |
| 不伤公平 | 幕 I 同时开火敌人 ≤ 1 |
| 帧率 | 60fps 不下降（弹幕是主要性能风险点） |
| 测试 | 规则层测试覆盖「敌人开火 → 玩家掉心」全链路 |

## 8. 战斗表现素材（敌人与 Boss 攻击必需）

> **可直接复制的完整提示词见 [战斗素材提示词](/game/design/combat-prompts)** ——
> 那一篇把 32 张素材的提示词逐条列出，含尺寸标注与生成顺序。

> **这一节是补漏**：原设计只写了敌人「有什么技能」，
> 却没写「攻击时画面上出现什么」。没有这部分，
> 玩家看到的就是敌人凭空消失子弹凭空出现。

### 8.1 敌人武器（需要新画武器的敌人）

**只有 5 种敌人需要武器**，其余 5 种的武器已画在精灵里：

| 敌人 | 精灵现状 | 攻击方式 | 是否需要武器素材 |
| --- | --- | --- | --- |
| **巡逻兵** patrol | 无人机，**无武器** | 直射瞄准 | ✅ **需要** |
| **运载虫** carrier | 背负货箱，**无武器** | 追踪弹 | ✅ **需要** |
| **守卫者** warden | 持盾，**无攻击武器** | 扇形散射 | ✅ **需要** |
| **镜像体** mirror | 人形，**无武器** | 复制玩家弹 | ✅ **需要** |
| **固定炮台** turret | 双管炮台，**已有炮管** | 三发散射 | ⚠️ 仅需炮口闪光 |
| 冲锋兵 charger | 四足兽 | 冲撞 | ❌ 不需要 |
| 飞行体 flyer | 飞龙，有爪 | 抛掷 | ❌ 用爪 |
| 重甲兵 armored | 机械兵 | 正面免疫 | ❌ 不需要 |
| 锻造者 forge | 锤臂机械 | 地刺 | ❌ 用锤 |
| 精英冲锋兵 elite | 精英冲撞兽 | 冲撞+三连射 | ⚠️ 仅需炮口闪光 |

### 8.2 敌人武器提示词

```text
small weapon prop for a game enemy, {WEAPON}, side view, mounted on the enemy,
chunky readable silhouette, dark teal metal with rust and glowing accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 配套敌人 | {WEAPON} | 尺寸 |
| --- | --- | --- |
| patrol | compact energy pulse gun with a glowing blue muzzle | 24×16 |
| carrier | missile launcher pod with a purple lens | 28×20 |
| warden | heavy industrial scatter cannon, five barrel muzzle | 40×24 |
| mirror | human energy caster, hand-held glowing emitter | 20×24 |

> **第 11 关的「镜像体」用玩家武器的外观**：发射玩家当前武器的弹道，
> 弹道本身已有 10 张素材，不需另画。

### 8.3 炮口闪光（5 种敌人共用）

```text
energy weapon muzzle flash, {FLASH}, side view, bright glowing burst,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 文件 | {FLASH} | 颜色 | 用于 |
| --- | --- | --- | --- |
| `muzzle-blue.webp` | sharp blue-white cross flash | `#4a9eff` | patrol |
| `muzzle-purple.webp` | purple flare with inner ring | `#a78bfa` | carrier |
| `muzzle-orange.webp` | wide orange cone burst | `#ff9f1c` | warden、turret、elite |
| `muzzle-white.webp` | hot white star | `#e8e4dc` | 通用 |

**尺寸 32×32**。

### 8.4 预警提示（关键）

**没有预警的攻击不做。** 这类素材是「公平性」的载体。

```text
telegraph warning indicator, {WARNING}, side view, semi transparent glow,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 文件 | {WARNING} | 尺寸 | 用途 |
| --- | --- | --- | --- |
| `aim-line.webp` | thin horizontal energy line with bright tip | 64×4 | 瞄准线（水平拉伸） |
| `ground-warn.webp` | horizontal glowing strip along the ground | 64×16 | 地面预警带 |
| `charge-aura.webp` | pulsing ring of energy, charging up | 48×48 | 冲锋兵蓄力 |
| `charge-spark.webp` | bright impact point on the ceiling | 32×32 | 锻造者地刺起点 |

**颜色统一用 `#d6452c`（朱红）**，与 Riso 风格的警示色一致。

### 8.5 命中与爆炸特效

```text
impact effect sprite, {EFFECT}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {EFFECT} | 尺寸 | 用途 |
| --- | --- | --- | --- |
| `impact-small.webp` | small bright spark burst | 32×32 | 脉冲、连射命中 |
| `impact-med.webp` | medium explosion with debris | 64×64 | 散弹、榴弹命中 |
| `impact-big.webp` | large fiery blast with shockwave ring | 128×128 | 集束弹命中 |
| `impact-pierce.webp` | piercing slash mark, bright white streak | 48×48 | 穿甲弹命中 |
| `impact-laser.webp` | glowing light spot, soft edge | 48×48 | 激光、棱弹命中 |

### 8.6 Boss 招式特效

每个 Boss 招式需要一个**专属特效**，让玩家一眼知道要躲什么。

```text
boss attack effect, {BOSS_EFFECT}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {BOSS_EFFECT} | 尺寸 | 对应招式 |
| --- | --- | --- | --- |
| `boss-beam.webp` | horizontal energy beam, white core with red edges | 128×32 | audit-beam 横扫光束 |
| `boss-chain.webp` | chain link projectile with glowing lock | 48×48 | clause-chain 条款锁链 |
| `boss-sweep.webp` | wide fan-shaped shockwave | 128×128 | rewrite-sweep 全屏扫射 |
| `boss-lance.webp` | piercing data spear, sharp and thin | 96×32 | redline-lance 数据流穿刺 |
| `boss-swarm.webp` | cluster of small orbs spreading out | 96×96 | corpus-swarm 弹幕群 |
| `boss-vines.webp` | spreading root-like tendrils on the ground | 128×64 | harvest-vines 地藤 |
| `boss-burst.webp` | shattering particle burst, magenta and white | 128×128 | emergence-burst 崩解 |
| `boss-scythe.webp` | huge crescent slash arc | 160×160 | reaper-scythe 巨镰 |

### 8.7 敌人子弹（按攻击类型）

敌人子弹与玩家子弹**分开**，因为形状不同（敌人更粗、更慢、更易读）。

```text
enemy projectile sprite, {ENEMY_BULLET}, side view, glowing, threatening shape,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

| 文件 | {ENEMY_BULLET} | 颜色 | 用于 |
| --- | --- | --- | --- |
| `enemy-pulse.webp` | slow glowing orb, simple and readable | 蓝 | patrol |
| `enemy-pellet.webp` | short fat pellet, shotgun slug | 橙 | turret、warden |
| `enemy-homing.webp` | missile with a curved smoke trail | 紫 | carrier |
| `enemy-lobbed.webp` | round grenade-like sphere | 褐 | flyer |
| `enemy-mirror.webp` | plain neutral orb, copies player shape | 白 | mirror |
| `enemy-spike.webp` | ground spike erupting upward | 朱红 | forge |
| `enemy-heavy.webp` | large heavy projectile for the elite | 深灰 | elite-charger |

### 8.8 素材总量

| 类别 | 数量 |
| --- | --- |
| 敌人武器 | 4 |
| 炮口闪光 | 4 |
| 预警提示 | 4 |
| 命中特效 | 5 |
| Boss 招式特效 | 8 |
| 敌人子弹 | 7 |
| **合计** | **32** |

### 8.9 交付路径

```text
docs/game/requirements/assets/
  enemy-weapons/   pulse-gun.webp launcher-pod.webp scatter-cannon.webp caster.webp
  effects/         muzzle-blue.webp muzzle-purple.webp muzzle-orange.webp muzzle-white.webp
                   aim-line.webp ground-warn.webp charge-aura.webp charge-spark.webp
                   impact-small.webp impact-med.webp impact-big.webp
                   impact-pierce.webp impact-laser.webp
  boss-effects/    boss-beam.webp boss-chain.webp boss-sweep.webp boss-lance.webp
                   boss-swarm.webp boss-vines.webp boss-burst.webp boss-scythe.webp
  projectiles/     enemy-pulse.webp enemy-pellet.webp enemy-homing.webp
                   enemy-lobbed.webp enemy-mirror.webp enemy-spike.webp enemy-heavy.webp
```

### 8.10 验收标准

| 项 | 标准 |
| --- | --- |
| **预告可见** | 每次攻击前 ≥0.5s，画面上**看得见**预告（**最重要**） |
| 武器对位 | 武器挂在敌人身上的位置合理，不悬空 |
| 特效尺寸 | 严格按上表 |
| 透明 | 全部透明背景 |
| 画风统一 | 与角色、敌人精灵同属平涂赛璐璐 |
| 水印 | 无 |
| 方向 | 一律朝右（代码翻转复用） |

### 8.11 分阶段

| 阶段 | 内容 | 数量 | 理由 |
| --- | --- | --- | --- |
| **A** | 敌人子弹 7 + 炮口闪光 4 | 11 | 攻击能看见的前提 |
| **B** | 预警提示 4 | 4 | **公平性保障，最优先** |
| **C** | 命中特效 5 + Boss 特效 8 | 13 | 打击感 |
| **D** | 敌人武器 4 | 4 | 可最后做，武器缺失也能攻击 |

> **B 阶段优先级最高**：没有预警，即使有子弹和武器，
> 玩家依然会觉得被偷袭。

## 9. 追溯

本文件实现：需求「敌人与 Boss 需要武器和技能」与「技能所需的美术资源」

相关：[敌人与 Boss 数据](/game/design/data-model) · [GDD 战斗系统](/game/requirements/gdd) · [场景生成提示词](/game/design/scene-prompts) · [M6 里程碑](/game/tasks/m6-variants-motion)
