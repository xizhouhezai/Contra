---
title: 战斗表现素材提示词 · 可直接复制
description: 敌人武器、炮口闪光、预警、命中特效、Boss 招式特效、敌人子弹的完整提示词
---

> **完整清单见 [美术资源总索引](/game/design/asset-index)** ——
> 那一篇汇总了全部素材并标注完成状态。


# 战斗表现素材提示词 · 可直接复制

> **配套文档**：[敌人攻击设计](/game/design/enemy-attack) · [场景生成提示词](/game/design/scene-prompts)
> **用法**：下面每一条都是**完整可粘贴**的提示词，复制整段给生图 agent 即可。
> 括号内的 `{尺寸}` 与 `{文件}` 是给你看的标注，生成时删掉。

## 通用负向词（每条都追加）

```text
no watermark, no signature, no text, no letters, no logo, blurry,
jpeg artifacts, realistic photo, 3d render, gradient background
```

**除弹道外的全部素材**：`solid pure white background`（需抠图）。
**一律朝右**，代码里左右翻转复用。

---

## 一、预警提示（4 张）—— 优先级最高

> **为什么第一**：没有预警，子弹就是偷袭。玩家死于看不懂的攻击不是难度，是不公平。

### 1.1 瞄准线 `aim-line.webp`（{尺寸 64×4}）

```text
telegraph warning indicator, thin horizontal energy line with a bright tip,
semi transparent glow, vermillion red #d6452c, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 1.2 地面预警带 `ground-warn.webp`（{尺寸 64×16}）

```text
telegraph warning indicator, horizontal glowing strip lying on the ground,
pulsing vermillion red #d6452c, gritty industrial edges, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 1.3 冲锋蓄力环 `charge-aura.webp`（{尺寸 48×48}）

```text
telegraph warning indicator, pulsing ring of energy gathering before impact,
vermillion red #d6452c with darker core, charging up, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 1.4 地刺起点 `charge-spark.webp`（{尺寸 32×32}）

```text
telegraph warning indicator, bright impact point where a spike will erupt,
concentrated vermillion red #d6452c light, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

## 二、敌人子弹（7 张）

### 2.1 `enemy-pulse.webp`（{尺寸 64×64}）—— 巡逻兵

```text
enemy projectile sprite, slow glowing orb, simple round and readable,
blue #4a9eff core with soft halo, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.2 `enemy-pellet.webp`（{尺寸 64×64}）—— 炮台 / 守卫者

```text
enemy projectile sprite, short fat shotgun pellet, stubby and heavy,
orange #ff9f1c with metal casing, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.3 `enemy-homing.webp`（{尺寸 64×64}）—— 运载虫

```text
enemy projectile sprite, guided missile with a curved smoke trail,
purple #a78bfa body with fins, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.4 `enemy-lobbed.webp`（{尺寸 64×64}）—— 飞行体

```text
enemy projectile sprite, round grenade-like sphere for throwing,
olive brown #8b6f47 with metal band, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.5 `enemy-mirror.webp`（{尺寸 64×64}）—— 镜像体

```text
enemy projectile sprite, plain neutral white orb with no distinctive shape,
designed to be tinted or replaced by the player's weapon shape,
side view, flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.6 `enemy-spike.webp`（{尺寸 64×64}）—— 锻造者

```text
enemy projectile sprite, ground spike erupting upward from the floor,
sharp metal point with vermillion #d6452c warning glow at the base, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

### 2.7 `enemy-heavy.webp`（{尺寸 64×64}）—— 精英冲锋兵

```text
enemy projectile sprite, large heavy cannon shell for an elite unit,
dark grey with red warning band, imposing mass, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

---

## 三、炮口闪光（4 张）

### 3.1 `muzzle-blue.webp`（{尺寸 32×32}）—— 巡逻兵

```text
energy weapon muzzle flash, sharp blue-white cross shaped burst,
blue #4a9eff core with white center, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 3.2 `muzzle-purple.webp`（{尺寸 32×32}）—— 运载虫

```text
energy weapon muzzle flash, purple flare with a darker inner ring,
purple #a78bfa, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 3.3 `muzzle-orange.webp`（{尺寸 32×32}）—— 炮台 / 守卫者 / 精英

```text
energy weapon muzzle flash, wide orange cone shaped burst,
orange #ff9f1c, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 3.4 `muzzle-white.webp`（{尺寸 32×32}）—— 通用

```text
energy weapon muzzle flash, hot white four-point star,
white #e8e4dc, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

## 四、命中特效（5 张）

### 4.1 `impact-small.webp`（{尺寸 32×32}）—— 脉冲 / 连射

```text
impact effect sprite, small bright spark burst,
orange-white sparks radiating outward, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 4.2 `impact-med.webp`（{尺寸 64×64}）—— 散弹 / 榴弹

```text
impact effect sprite, medium explosion with flying debris chunks,
orange #ff9f1c fireball with dark smoke, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 4.3 `impact-big.webp`（{尺寸 128×128}）—— 集束弹

```text
impact effect sprite, large fiery blast with an expanding shockwave ring,
deep red #d6452c with yellow white core, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 4.4 `impact-pierce.webp`（{尺寸 48×48}）—— 穿甲弹

```text
impact effect sprite, piercing slash mark where a spike punched through,
bright white streak with sharp angled edges, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 4.5 `impact-laser.webp`（{尺寸 48×48}）—— 激光 / 棱弹

```text
impact effect sprite, glowing light spot where a beam landed,
soft edged magenta #ff2d55 bloom, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

## 五、Boss 招式特效（8 张）

> **一招式一图**：玩家靠形状预判要躲什么。

### 5.1 `boss-beam.webp`（{尺寸 128×32}）—— 审计者横扫光束

```text
boss attack effect, horizontal energy beam sweeping across the screen,
white hot core with vermillion #d6452c edges, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.2 `boss-chain.webp`（{尺寸 48×48}）—— 条款锁链

```text
boss attack effect, chain link projectile with a glowing locking clasp,
steel links with orange #c8901f glow, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.3 `boss-sweep.webp`（{尺寸 128×128}）—— 全屏扇形扫射

```text
boss attack effect, wide fan shaped shockwave sweeping outward,
vermillion #d6452c crescent with white leading edge, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.4 `boss-lance.webp`（{尺寸 96×32}）—— 数据流穿刺

```text
boss attack effect, piercing data spear, sharp thin and elongated,
crimson #ff2d55 with fragmenting pixels trailing behind, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.5 `boss-swarm.webp`（{尺寸 96×96}）—— 弹幕群

```text
boss attack effect, cluster of small orbs spreading outward from a center,
violet #a78bfa spheres in a radial burst pattern, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.6 `boss-vines.webp`（{尺寸 128×64}）—— 地面藤蔓

```text
boss attack effect, spreading root-like tendrils creeping along the ground,
dark crimson #8b1a3a with glowing vein patterns, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.7 `boss-burst.webp`（{尺寸 128×128}）—— 崩解爆散

```text
boss attack effect, shattering particle burst as reality breaks apart,
magenta #ff6b9d and violet #a78bfa fragments flying outward, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 5.8 oss-scythe.webp`（{尺寸 160×160}）—— 巨镰横扫

```text
boss attack effect, huge crescent slash arc from a giant scythe,
black #1a1a1a crescent with bright vermillion edge glow, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

## 六、敌人武器（4 张，最后做）

> **没有武器敌人也能攻击**，只是少点表现，所以排最后。

### 6.1 `pulse-gun.webp`（{尺寸 24×16}）—— 巡逻兵

```text
small weapon prop for a game enemy, compact energy pulse gun with a glowing blue muzzle,
mounted on a hovering drone, side view, chunky readable silhouette,
dark teal metal with blue #4a9eff accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 6.2 `launcher-pod.webp`（{尺寸 28×20}）—— 运载虫

```text
small weapon prop for a game enemy, missile launcher pod with a purple lens,
mounted on a flying carrier, side view, chunky readable silhouette,
dark teal metal with purple #a78bfa accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 6.3 `scatter-cannon.webp`（{尺寸 40×24}）—— 守卫者

```text
small weapon prop for a game enemy, heavy industrial scatter cannon with five barrel muzzle,
mounted on an armored guard, side view, chunky readable silhouette,
dark teal metal with orange #ff9f1c accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

### 6.4 `caster.webp`（{尺寸 20×24}）—— 镜像体

```text
small weapon prop for a game enemy, hand-held energy caster with a glowing emitter ring,
worn by a human figure, side view, chunky readable silhouette,
neutral grey metal with white #e8e4dc accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

## 交付路径

```text
docs/game/requirements/assets/
  effects/        aim-line.webp ground-warn.webp charge-aura.webp charge-spark.webp
                  muzzle-blue.webp muzzle-purple.webp muzzle-orange.webp muzzle-white.webp
                  impact-small.webp impact-med.webp impact-big.webp
                  impact-pierce.webp impact-laser.webp
  boss-effects/   boss-beam.webp boss-chain.webp boss-sweep.webp boss-lance.webp
                  boss-swarm.webp boss-vines.webp boss-burst.webp boss-scythe.webp
  projectiles/    enemy-pulse.webp enemy-pellet.webp enemy-homing.webp
                  enemy-lobbed.webp enemy-mirror.webp enemy-spike.webp enemy-heavy.webp
  enemy-weapons/  pulse-gun.webp launcher-pod.webp scatter-cannon.webp caster.webp
```

## 生成顺序

| 顺序 | 类别 | 数量 | 理由 |
| --- | --- | --- | --- |
| **1** | 预警提示 | 4 | **公平性保障，必须最先有** |
| 2 | 敌人子弹 | 7 | 攻击能看见的前提 |
| 3 | 炮口闪光 | 4 | 打击感 |
| 4 | 命中特效 | 5 | 打击感 |
| 5 | Boss 招式特效 | 8 | Boss 战可读 |
| 6 | 敌人武器 | 4 | 锦上添花，可最后 |

## 验收标准

| 项 | 标准 |
| --- | --- |
| **预告可见** | 攻击前 ≥0.5s，画面上看得见（**最重要**） |
| 尺寸 | 严格按各条标注 |
| 透明 | 全部纯白底待抠 |
| 朝向 | 一律朝右 |
| 画风 | 与角色、敌人精灵同属平涂赛璐璐 |
| 水印 | 无 |

## 追溯

本文件实现：需求「敌人与 Boss 技能所需的美术资源」

相关：[敌人攻击设计](/game/design/enemy-attack) · [场景生成提示词](/game/design/scene-prompts) · [美术风格指南](/game/design/art-style)
