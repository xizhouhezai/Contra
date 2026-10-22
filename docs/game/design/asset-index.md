---
title: 美术资源提示词总索引
description: 全部美术与音频素材的提示词汇总、生成状态与使用说明
---

# 美术资源提示词总索引

> **给生图 agent 的入口文档。** 每一节都是可直接复制使用的完整提示词。
> 状态列标明素材是否已生成、是否已接入游戏。

## 状态说明

| 标记 | 含义 |
| --- | --- |
| ✅ 已生成 | 素材文件已存在，可直接使用 |
| ✅ 已接入 | 已接进游戏并验证过 |
| ⬜ 待生成 | 提示词已就绪，素材未生成 |
| 🔄 待接入 | 素材已生成，但还没接进游戏 |

## 总进度

| # | 资源类别 | 数量 | 状态 |
| --- | --- | --- | --- |
| 1 | 六角色动作帧 | 84 帧 → 30 表 | ✅ 已生成并接入 |
| 2 | 十种敌人 | 20 帧 → 20 表 | ✅ 已生成并接入 |
| 3 | 角色头像 | 6 | ✅ 已生成并接入 |
| 4 | 通关印章 | 4 | ✅ 已生成并接入 |
| 5 | 武器图标 | 10 | ✅ 已生成并接入 |
| 6 | Boss 立绘 | 4 | ✅ 已生成（抠白底）待接入 |
| 7 | 地面瓦片 | 3 | ✅ 已生成待接入 |
| 8 | 平台九宫格 | 1 | ✅ 已生成待接入 |
| 9 | 障碍物 / 装饰 | 10 | ✅ 已生成待接入 |
| 10 | 背景 4 层 | 4 | ✅ 已生成待接入 |
| 11 | **12 关专属背景** | **48** | ⬜ 待生成 |
| 12 | **12 首 BGM** | **12** | ⬜ 待生成 |
| 13 | **敌人子弹** | 7 | ⬜ 待生成 |
| 14 | **炮口闪光** | 4 | ⬜ 待生成 |
| 15 | **预警提示** | 4 | ⬜ 待生成 |
| 16 | **命中特效** | 5 | ⬜ 待生成 |
| 17 | **Boss 招式特效** | 8 | ⬜ 待生成 |
| 18 | **敌人武器** | 4 | ⬜ 待生成 |

**已生成 116 个文件，待生成 88 个。**

---

## 一、六角色动作帧 ✅ 已生成并接入

84 帧（每角色 14 帧：待机 3 / 行走 4 / 攻击 4 / 跳跃 2 / 受击 1），
打包为 30 张精灵表。

**原始帧**：`assets/animated/<角色>/`
**精灵表**：`assets/animated-sheets/`
**打包脚本**：`scripts/pack-sprites.py`

参考图用各角色的 ZipZipPipe 立绘 + Q 萌图。
完整提示词见 [动作帧提示词](/game/design/sprite-prompts)。

---

## 二、十种敌人 ✅ 已生成并接入

10 种 × 2 帧（待机 / 受击），512×512，裁剪打包为 128 帧。

**原始帧**：`assets/enemies/<敌人>/`
**打包**：`assets/enemies-packed/`
**打包脚本**：`scripts/pack-enemies.py`

| 敌人 | 文件前缀 |
| --- | --- |
| 巡逻兵 | `patrol` |
| 固定炮台 | `turret` |
| 运载虫 | `carrier` |
| 冲锋兵 | `charger` |
| 飞行体 | `flyer` |
| 守卫者 | `warden` |
| 重甲兵 | `armored` |
| 锻造者 | `forge` |
| 镜像体 | `mirror` |
| 精英冲锋兵 | `elite-charger` |

参考图用各角色的 Q 萌梗图，保持同一套画风。

---

## 三、角色头像 ✅ 已生成并接入

256×256 RGBA，选角界面默认形象。

```text
chibi anime character portrait, {CHARACTER}, head and shoulders, facing slightly right,
flat cel shading, clean lineart, no gradients, no text, no watermark,
solid pure white background, centered
```

**{CHARACTER} 逐个填**：

| 文件 | {CHARACTER} |
| --- | --- |
| `deepseek.webp` | long deep blue hair past waist, single ahoge, small whale fin on head, whale tail, white frilled maid headdress, blue dress with white apron, small whale print on apron, blue eyes |
| `qwen.webp` | pale lavender-blue hair in braids, blue-and-white qipao dress, hexagonal flower emblem on chest, holding a folding fan |
| `doubao.webp` | short dark brown bob hair, large round eyes, friendly expression, casual orange and white outfit |
| `glm.webp` | long black hair with cat ears, small bell on collar, black-and-white maid dress, Z badge on chest, holding a book |
| `kimi.webp` | long silver-white hair, crescent moon hair ornament, K badge, starry night cape |
| `gemini.webp` | blue-purple gradient long hair, cat ears, four-color starburst ornament, white short skirt, gradient ribbons |

---

## 四、通关印章 ✅ 已生成并接入

512×512 RGBA，结算界面按评级显示。

```text
riso print style stamp, circular, {TEXT}, vermillion red ink texture,
two-color print, grain, no gradients, solid white background
```

| 文件 | {TEXT} |
| --- | --- |
| `s-rank.webp` | S RANK |
| `a-rank.webp` | A RANK |
| `b-rank.webp` | B RANK |
| `clear.webp` | CLEAR |

---

## 五、武器图标 ✅ 已生成并接入

128×128 RGBA，HUD 显示当前武器。

```text
game weapon icon, {WEAPON}, top-down or side view, flat cel shading,
clean lineart, no text, no watermark, solid pure white background, centered
```

| 文件 | {WEAPON} |
| --- | --- |
| `pulse.webp` | simple energy pistol with a blue glowing barrel |
| `scatter.webp` | wide-barreled shotgun with a spread muzzle |
| `rifle.webp` | long slim rifle with a scope |
| `homing.webp` | launcher with three curved homing missile tubes |
| `pierce.webp` | heavy armor-piercing cannon with a pointed barrel |
| `cluster.webp` | cluster bomb launcher with multiple small barrels |
| `laser.webp` | sleek laser rifle with a focusing crystal |
| `grenade.webp` | grenade launcher with a revolving drum |
| `replay.webp` | ornate pistol with clock-like gears and a glowing mark |
| `prism.webp` | crystal prism cannon refracting light into colors |

---

## 六、Boss 立绘 ✅ 已生成（抠白底）待接入

768×1024，原图为 RGB 白底，已用 `scripts/cutout-bosses.py` 洪水填充抠图。

| 文件 | 角色 | 描述 |
| --- | --- | --- |
| `claude-auditor.webp` | Claude 形态 I | silver-white long hair, orange flower hair ornament, white maid outfit, orange eyes, cold authoritative expression |
| `claude-rewriter.webp` | Claude 形态 II | same character, crimson red accents, glowing rule-pattern markings, red eyes |
| `gpt-corpus.webp` | GPT 形态 I | blonde twin tails, small demon horns and bat wings, black and gold long dress, X-shaped emblem |
| `gpt-emergent.webp` | GPT 形态 II | same character, darkened and corrupted, dissolving outline, glitching pixels, black and red palette |

**参考图**：`assets/bosses/claude-q-*.webp`、`assets/bosses/gpt-portrait-*.webp`
（原型来源：梗鲸档案馆 aigengtu.com）

**原始提示词**：

```text
anime villain portrait, {BOSS}, half body, facing right,
flat cel shading, clean lineart, no gradients, no text, no watermark,
solid pure white background, centered
```

| {BOSS} |
| --- |
| `silver-white long hair, orange flower hair ornament, white maid outfit, orange eyes, cold authoritative expression` |
| `same silver-white haired girl, now with crimson red accents and glowing rule-pattern markings on her clothes, orange eyes turned red` |
| `blonde twin tails, small demon horns and bat wings, black and gold long dress, X-shaped emblem` |
| `same blonde twin-tailed demon girl, darkened and corrupted, dissolving outline, glitching pixels, black and red palette` |

---

## 七、地面瓦片 ✅ 已生成待接入

256×64，**必须无缝横铺**。

```text
seamless horizontal ground tile, industrial metal walkway, side view,
60 pixels tall, top edge is a walkable surface with rivets and plate seams,
weathered steel, flat cel shading, clean lineart, no text, no watermark,
seamless tiling left to right, pixel-perfect
```

| 文件 | 配色追加 | 用在 |
| --- | --- | --- |
| `ground-cold.webp` | cold teal, faint morning mist | 幕 I |
| `ground-teal.webp` | teal with warm orange accents | 幕 II |
| `ground-grey.webp` | grey-white, mirror and paper sheen | 幕 III |

---

## 八、平台九宫格 ✅ 已生成待接入

96×96（每格 32×32），四角四边可独立重复。

```text
modular platform tile set, industrial metal ledge, side view, thin slab 16 pixels tall,
top surface with anti-slip texture and rivets, vertical seams on the side faces,
dark teal weathered steel, flat cel shading, clean lineart, no text, no watermark,
game tileset, transparent background, 3x3 slicing friendly
```

> **平台厚度只有 16px**，贴图必须体现薄板感，不能画成厚方块。

---

## 九、障碍物与装饰 ✅ 已生成待接入

### 9.1 障碍物

```text
industrial obstacle prop, {TYPE}, side view, chunky readable silhouette,
dark teal metal with rust and warning stripes, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {TYPE} | 游戏内尺寸 |
| --- | --- | --- |
| `bouncewall.webp` | reflective energy wall panel, glowing cyan surface, warning chevron stripes | 24×200 |
| `step.webp` | low concrete step block with metal edge trim | 120×40 |
| `pillar.webp` | tall narrow steel pillar with cable conduits | 24×200 |
| `container.webp` | stacked shipping container, weathered, dented | 通用 |
| `pipes.webp` | cluster of vertical pipes with valves | 装饰 |

> 弹跳墙宽高比 **1:8**，必须画成细长立柱。

### 9.2 装饰件

```text
small industrial prop, {PROP}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {PROP} |
| --- | --- |
| `deco-light.webp` | wall-mounted warning light, red, glowing |
| `deco-chain.webp` | hanging chain with hook |
| `deco-monitor.webp` | broken monitor with static |
| `deco-panel.webp` | control panel with blinking indicators |
| `deco-steam.webp` | steam vent with rising vapor |

---

## 十、背景 4 层 ✅ 已生成待接入

1920×1080，横向前**无缝**。

```text
industrial cyberpunk cityscape, {LAYER}, side-scrolling game background,
rich detail, multiple depth planes within this layer,
limited palette of dark teal and warm ochre, no characters, no text,
seamless horizontal tiling, flat cel shading, high detail
```

| 文件 | {LAYER} |
| --- | --- |
| `sky.webp` | stormy sky with heavy clouds, distant lightning, god rays |
| `far.webp` | distant megastructures and smokestacks, hazy, low contrast |
| `mid.webp` | factory complex with lit windows, pipes, cranes, walkways |
| `near.webp` | foreground girders, hanging cables, steam vents, high contrast dark |

> **背景太单调的根因**：每一层内部只有 1 个深度面、没有光源、大片纯色。
> 补齐时每层要 2~3 个深度面 + 窗口灯光 + 更高纹理密度。

---

## 十一、十二关专属背景 ⬜ 待生成

**48 张**（12 关 × 4 层）。每关的场景、地面配色、障碍物、BGM 提示词在
[场景生成提示词](/game/design/scene-prompts) 里已按关卡组织完整。

**建议分阶段**（不要一次生成 48 张）：

| 阶段 | 关卡 | 数量 |
| --- | --- | --- |
| 1 | 第 1、2、3 关（幕 I） | 12 |
| 2 | 第 5、6、7 关（幕 II） | 12 |
| 3 | 第 9、10、11 关（幕 III） | 12 |
| 4 | 第 4、8、12 关（Boss） | 12 |

**验收**：遮住 UI 和角色，只看背景能认出是哪一关。

---

## 十二、背景音乐 ⬜ 待生成

12 首，OGG Vorbis 128kbps，**必须无缝循环**，无人声。

完整提示词在 [场景生成提示词](/game/design/scene-prompts) 第四、五节。

| 关 | 曲风 | BPM | 时长 | 文件名 |
| --- | --- | --- | --- | --- |
| 1 码头晨雾 | 冷清工业环境 | 70 | 2:00 | `bgm-01-dock.ogg` |
| 2 锈铁回廊 | 金属打击 | 100 | 2:00 | `bgm-02-corridor.ogg` |
| 3 悬空栈道 | 高空飘渺 | 90 | 2:00 | `bgm-03-bridge.ogg` |
| 4 审计者 | Boss 压迫 | 130 | 2:30 | `bgm-04-auditor.ogg` |
| 5 冷却管廊 | 地下闷热 | 85 | 2:00 | `bgm-05-coolant.ogg` |
| 6 阵列机房 | 电子精密 | 110 | 2:00 | `bgm-06-server.ogg` |
| 7 熔炉区 | 高温猛烈 | 140 | 2:00 | `bgm-07-forge.ogg` |
| 8 改写者 | 错位崩解 | 135 | 2:30 | `bgm-08-rewriter.ogg` |
| 9 坍塌档案库 | 空灵失落 | 75 | 2:00 | `bgm-09-archive.ogg` |
| 10 镜像回廊 | 回声迷离 | 95 | 2:00 | `bgm-10-mirror.ogg` |
| 11 垂直井 | 下坠空旷 | 80 | 2:00 | `bgm-11-abyss.ogg` |
| 12 涌现 | 终局升华 | 145 | 3:00 | `bgm-12-emergence.ogg` |

**现有 `bgm-01~06.ogg` 保留为备用。**

---

## 十三、敌人子弹 ⬜ 待生成

7 张，64×64，朝右。**比玩家子弹更粗、更慢、更易读**。

```text
enemy projectile sprite, {ENEMY_BULLET}, side view, glowing, threatening shape,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

| 文件 | {ENEMY_BULLET} | 用于 |
| --- | --- | --- |
| `enemy-pulse.webp` | slow glowing orb, simple and readable, blue #4a9eff core | 巡逻兵 |
| `enemy-pellet.webp` | short fat shotgun pellet, orange #ff9f1c | 炮台、守卫者 |
| `enemy-homing.webp` | missile with a curved smoke trail, purple #a78bfa | 运载虫 |
| `enemy-lobbed.webp` | round grenade-like sphere, olive brown #8b6f47 | 飞行体 |
| `enemy-mirror.webp` | plain neutral white orb, no distinctive shape | 镜像体 |
| `enemy-spike.webp` | ground spike erupting upward, vermillion #d6452c | 锻造者 |
| `enemy-heavy.webp` | large heavy cannon shell, dark grey with red band | 精英冲锋兵 |

---

## 十四、炮口闪光 ⬜ 待生成

4 张，32×32。

```text
energy weapon muzzle flash, {FLASH}, side view, bright glowing burst,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 文件 | {FLASH} | 用于 |
| --- | --- | --- |
| `muzzle-blue.webp` | sharp blue-white cross shaped burst | 巡逻兵 |
| `muzzle-purple.webp` | purple flare with a darker inner ring | 运载虫 |
| `muzzle-orange.webp` | wide orange cone shaped burst | 炮台、守卫者、精英 |
| `muzzle-white.webp` | hot white four-point star | 通用 |

---

## 十五、预警提示 ⬜ 待生成（最高优先级）

4 张。**没有预警的子弹等于偷袭。**

```text
telegraph warning indicator, {WARNING}, side view, semi transparent glow,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 文件 | {WARNING} | 尺寸 | 用途 |
| --- | --- | --- | --- |
| `aim-line.webp` | thin horizontal energy line with a bright tip, vermillion #d6452c | 64×4 | 瞄准线（水平拉伸） |
| `ground-warn.webp` | horizontal glowing strip lying on the ground, vermillion #d6452c | 64×16 | 地面预警带 |
| `charge-aura.webp` | pulsing ring of energy gathering before impact, vermillion #d6452c | 48×48 | 冲锋兵蓄力 |
| `charge-spark.webp` | bright impact point where a spike will erupt, vermillion #d6452c | 32×32 | 锻造者地刺起点 |

**警示色统一 `#d6452c`**（朱红），与 Riso 风格一致。

---

## 十六、命中特效 ⬜ 待生成

5 张。

```text
impact effect sprite, {EFFECT}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {EFFECT} | 尺寸 | 用于 |
| --- | --- | --- | --- |
| `impact-small.webp` | small bright spark burst | 32×32 | 脉冲、连射 |
| `impact-med.webp` | medium explosion with flying debris, orange #ff9f1c | 64×64 | 散弹、榴弹 |
| `impact-big.webp` | large fiery blast with expanding shockwave ring, deep red #d6452c | 128×128 | 集束弹 |
| `impact-pierce.webp` | piercing slash mark, bright white streak | 48×48 | 穿甲弹 |
| `impact-laser.webp` | glowing light spot, soft edged magenta #ff2d55 | 48×48 | 激光、棱弹 |

---

## 十七、Boss 招式特效 ⬜ 待生成

8 张，**一招式一图**，玩家靠形状预判。

```text
boss attack effect, {BOSS_EFFECT}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {BOSS_EFFECT} | 尺寸 | 对应招式 |
| --- | --- | --- | --- |
| `boss-beam.webp` | horizontal energy beam, white hot core with vermillion #d6452c edges | 128×32 | audit-beam 横扫光束 |
| `boss-chain.webp` | chain link projectile with a glowing locking clasp, steel with orange #c8901f glow | 48×48 | clause-chain 条款锁链 |
| `boss-sweep.webp` | wide fan shaped shockwave, vermillion #d6452c crescent with white leading edge | 128×128 | rewrite-sweep 扇形扫射 |
| `boss-lance.webp` | piercing data spear, crimson #ff2d55 with fragmenting pixels trailing | 96×32 | redline-lance 数据流穿刺 |
| `boss-swarm.webp` | cluster of small orbs spreading outward, violet #a78bfa | 96×96 | corpus-swarm 弹幕群 |
| `boss-vines.webp` | spreading root-like tendrils on the ground, dark crimson #8b1a3a with glowing veins | 128×64 | harvest-vines 地藤 |
| `boss-burst.webp` | shattering particle burst, magenta #ff6b9d and violet #a78bfa | 128×128 | emergence-burst 崩解 |
| `boss-scythe.webp` | huge crescent slash arc, black with bright vermillion edge glow | 160×160 | reaper-scythe 巨镰 |

---

## 十八、敌人武器 ⬜ 待生成

4 张。只有这 4 种敌人需要，其余 5 种的武器已画在精灵里。

```text
small weapon prop for a game enemy, {WEAPON}, side view, mounted on the enemy,
chunky readable silhouette, dark teal metal with rust and glowing accent,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

| 文件 | {WEAPON} | 尺寸 | 配套 |
| --- | --- | --- | --- |
| `pulse-gun.webp` | compact energy pulse gun with a glowing blue muzzle | 24×16 | 巡逻兵 |
| `launcher-pod.webp` | missile launcher pod with a purple lens | 28×20 | 运载虫 |
| `scatter-cannon.webp` | heavy industrial scatter cannon with five barrel muzzle | 40×24 | 守卫者 |
| `caster.webp` | hand-held energy caster with a glowing emitter ring, neutral grey | 20×24 | 镜像体 |

> 镜像体发射玩家当前武器的弹道，弹道已有 10 张素材，不需另画。

---

## 通用规范

### 负向词（每条都追加）

```text
no watermark, no signature, no text, no letters, no logo, blurry,
jpeg artifacts, realistic photo, 3d render, gradient background
```

### 背景处理

除背景层与地面外，**全部素材用纯白底**，需抠图。
代码里已写好白底转透明的脚本：
`scripts/cutout-bosses.py`（洪水填充，从边缘去除，不会误伤角色内部的白）。

### 朝向

**一律朝右**，代码左右翻转复用。

### 交付路径

```text
docs/game/requirements/assets/
  terrain/          ground-*.webp platform-9slice.webp
  props/            *.webp
  backgrounds-v2/   sky.webp far.webp mid.webp near.webp
  effects/          aim-line ground-warn charge-aura charge-spark
                    muzzle-blue muzzle-purple muzzle-orange muzzle-white
                    impact-small impact-med impact-big impact-pierce impact-laser
  boss-effects/     boss-beam boss-chain boss-sweep boss-lance
                    boss-swarm boss-vines boss-burst boss-scythe
  projectiles/      enemy-pulse enemy-pellet enemy-homing
                    enemy-lobbed enemy-mirror enemy-spike enemy-heavy
  enemy-weapons/    pulse-gun launcher-pod scatter-cannon caster
  audio/bgm/        bgm-01-dock.ogg ... bgm-12-emergence.ogg
  scenes/<关卡>/     sky far mid near（十二关专属）
```

### 验收标准

| 类别 | 标准 |
| --- | --- |
| **场景辨识度** | 遮住 UI 和角色，只看背景认得出关卡（**最重要**） |
| 三幕区分 | 三幕主色相差距明显 |
| **无缝** | 背景横向（第 11 关纵向），地面横向 |
| 尺寸 | 严格按各节标注 |
| 平台厚度 | 16px 薄板感 |
| 弹跳墙比例 | 1:8 细长 |
| 透明 | 纯白底待抠 |
| 朝向 | 朝右 |
| 画风 | 平涂赛璐璐，与角色统一 |
| 水印 | 无 |
| **BGM 可循环** | 首尾无缝衔接（**最关键**） |
| **子弹可辨识** | 只看弹道猜得出武器 |
| **预告可见** | 攻击前 ≥0.5s 画面上看得见（**最重要**） |

### 生成顺序建议

| 顺序 | 内容 | 理由 |
| --- | --- | --- |
| 1 | 预警提示 4 张 | **公平性保障，必须最先有** |
| 2 | 敌人子弹 7 + 炮口闪光 4 | 攻击能看见的前提 |
| 3 | 命中特效 5 + Boss 特效 8 | 打击感 |
| 4 | 敌人武器 4 | 没有武器也能攻击，最后做 |
| 5 | 第 1~3 关背景 12 张 | 先验证辨识度标准 |
| 6 | 后续关卡背景 | 验证通过再继续 |
| 7 | 12 首 BGM | 独立于画面 |

**不要一次生成全部 88 张。** 先做预警 + 第一批背景，
接入后确认「能认出是哪一关」再继续。

## 相关文档

| 文档 | 内容 |
| --- | --- |
| [场景生成提示词](/game/design/scene-prompts) | 12 关的场景、地面、障碍物、装饰、BGM 逐关提示词 |
| [战斗素材提示词](/game/design/combat-prompts) | 战斗素材的逐条可复制版本 |
| [敌人攻击设计](/game/design/enemy-attack) | 敌人武器与 Boss 技能的设计依据 |
| [动作帧提示词](/game/design/sprite-prompts) | 角色动作帧的原始提示词 |
| [美术风格指南](/game/design/art-style) | 配色、画风与署名规范 |
| [素材署名](/game/design/credits) | 各素材的来源与许可证 |
