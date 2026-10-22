---
title: 场景生成提示词 · 含全部美术资源
description: 十二关的场景、地面、平台、障碍物、装饰、BGM 与弹道的完整生成提示词
---

# 场景生成提示词 · 含全部美术资源

> **需求来源**：「美术资源生成的提示词加入到场景生成提示词中」
> **目标**：每一关的提示词 = 该关需要的**全部**素材，生成一次即可装齐该关。

## 0. 使用方式

每一关是一份**完整的素材清单**。把该关的提示词整段交给生图 agent，
产出的素材按指定路径放好，我写脚本接入。

**路径约定**（全项目统一）：

```text
docs/game/requirements/assets/
  backgrounds-v2/
    sky.webp  far.webp  mid.webp  near.webp      每层 1920x1080
  terrain/
    ground-cold.webp  ground-teal.webp  ground-grey.webp   各 256x64
    platform-9slice.webp                            96x96 九宫格
  props/
    <道具名>.webp                                   透明背景
  audio/bgm/
    bgm-01-dock.ogg ... bgm-12-emergence.ogg
  projectiles/
    pulse.webp ... prism.webp                       各 64x64
```

## 1. 关卡几何实测（提示词据此定制）

从 `packages/game-core/src/data/campaign.ts` 与 `act3.ts` 实测：

| 关卡 | 可站平台 | 窄柱/弹跳墙 | 特殊 |
| --- | --- | --- | --- |
| 1 码头晨雾 | 120×40 矮台阶 | — | |
| 2 锈铁回廊 | — | **24×200 ×2** | 弹跳墙 |
| 3 悬空栈道 | 140×16 ×3、160×16 | — | 高空 |
| 4 审计者 | 120×16 ×2 | — | Boss |
| 5 冷却管廊 | 160×16 | — | |
| 6 阵列机房 | — | — | 纯地面关 |
| 7 熔炉区 | 200×16 | — | |
| 8 改写者 | 140×16 ×2 | — | Boss |
| 9 坍塌档案库 | 160×16 ×2 | — | |
| 10 镜像回廊 | 140×16 ×3 | — | |
| 11 垂直井 | 300×16 ×6、900×20 | — | **纵向卷轴** |
| 12 涌现 | 160×16 ×2 | — | 终局 Boss |

**关键**：平台**厚度只有 16px**，所以平台贴图必须是**薄板**，
不能画成有厚度的方块，否则会看起来悬空或穿模。

**弹跳墙 24×200 极窄**，必须画成**细长立柱**，宽高比 1:8。

## 2. 全局负向词

每个提示词都追加：

```text
no watermark, no signature, no text, no letters, no logo,
blurry, jpeg artifacts, realistic photo, 3d render, gradient background
```

**除地面与背景外，其余素材一律 `solid pure white background`**（需抠图）。

## 3. 通用素材（只生成一次，全 12 关共用）

### 3.1 地面瓦片

```text
seamless horizontal ground tile, industrial metal walkway, side view,
60 pixels tall, top edge is a walkable surface with rivets and plate seams,
weathered steel, flat cel shading, clean lineart, no text, no watermark,
seamless tiling left to right, pixel-perfect
```

| 幕 | 文件 | 配色追加 |
| --- | --- | --- |
| I | `ground-cold.webp` | cold teal, faint morning mist |
| II | `ground-teal.webp` | teal with warm orange accents |
| III | `ground-grey.webp` | grey-white, mirror and paper sheen |

**尺寸 256×64**，顶部 60px 为地面。

### 3.2 平台九宫格

```text
modular platform tile set, industrial metal ledge, side view, thin slab 16 pixels tall,
top surface with anti-slip texture and rivets, vertical seams on the side faces,
dark teal weathered steel, flat cel shading, clean lineart, no text, no watermark,
game tileset, transparent background, 3x3 slicing friendly
```

**尺寸 96×96**（每格 32×32），四角四边可独立重复。

### 3.3 弹跳墙

```text
reflective energy wall panel, industrial frame, glowing cyan energy surface,
warning chevron stripes, tall narrow pillar 24 by 200 pixels, side view,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

**尺寸 24×200**，宽高比 1:8。

### 3.4 矮台阶

```text
low industrial step block, 120 by 40 pixels, side view,
concrete and metal edge trim, worn surface, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

**尺寸 120×40**。

### 3.5 出口门

```text
exit gate marker, 40 by 120 pixels, vertical frame with glowing chevrons,
industrial finish, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

**尺寸 40×120**，全 12 关共用。

### 3.6 装饰件（可复用，摊到各关）

```text
small industrial prop, {PROP}, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

| 文件 | {PROP} | 用在 |
| --- | --- | --- |
| `deco-light.webp` | wall-mounted warning light, red, glowing | 全部 |
| `deco-chain.webp` | hanging chain with hook | 1、2、3 |
| `deco-monitor.webp` | broken monitor with static | 6、9 |
| `deco-panel.webp` | control panel with blinking indicators | 5、6 |
| `deco-steam.webp` | steam vent with rising vapor | 5、7 |

### 3.7 子弹（10 张，与场景无关）

```text
game projectile sprite, {BULLET}, side view, glowing energy,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

| 文件 | {BULLET} | 主色 |
| --- | --- | --- |
| `pulse.webp` | small round energy bolt, simple orb | 蓝 `#4a9eff` |
| `scatter.webp` | small pellet projectile, shotgun pellet | 橙 `#ff9f1c` |
| `rifle.webp` | thin elongated energy dart, high velocity streak | 青 `#7fd6ff` |
| `homing.webp` | homing missile, curved smoke trail | 紫 `#a78bfa` |
| `pierce.webp` | sharp armor-piercing spike, white hot tip | 白 `#e8e4dc` |
| `cluster.webp` | cluster bomb shell, segmented body | 红 `#d6452c` |
| `laser.webp` | thin laser beam segment, continuous | 品红 `#ff2d55` |
| `grenade.webp` | grenade projectile, spinning, arc trajectory | 褐 `#8b6f47` |
| `replay.webp` | ornate clockwork bullet, golden rings | 金 `#c8901f` |
| `prism.webp` | prism crystal shard, refracting rainbow | 白+虹彩 |

---

## 4. 十二关完整素材清单

以下每一节就是**该关一次生成所需的全部提示词**。

---

### 第 1 关 · 码头晨雾

**背景（4 层，各 1920×1080）**

```text
dawn shipping port, container yard, heavy sea fog, backlit rising sun,
container stacks in silhouette, wet concrete with rail tracks reflecting light,
cranes and mooring bollards, cool blue fog with warm orange rim light,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | heavy clouds with dawn light breaking through, low sun |
| far | distant cranes and container gantries in fog, hazy, low contrast |
| mid | stacked shipping containers, wet reflective ground, warm lamps |
| near | foreground bollards and rope, very dark, high detail |

**地面**：`ground-cold.webp`（冷青 + 晨雾）

**障碍物**：`step-120x40.webp`（矮台阶）

```text
low industrial step block, 120 by 40 pixels, side view,
concrete and metal edge trim, wet from sea mist, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

**装饰**：`deco-light.webp`、`deco-chain.webp`

**音乐**

```text
calm industrial ambient, slow tempo 70bpm, distant foghorn, gentle wind,
muted synth pads, sparse piano notes, lonely but hopeful, loopable game bgm,
no vocals
```

---

### 第 2 关 · 锈铁回廊

**背景**

```text
abandoned steel corridor, heavy rust and corrosion, riveted iron plates,
broken pipes with dripping water, light shafts through gaps in the roof,
warm rust brown against cold blue shadows, side-scrolling game background,
flat cel shading, clean lineart, no characters, no text, no watermark,
seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | dim light through broken roof panels, dust motes |
| far | receding corridor arches, hazy rust |
| mid | riveted wall panels, broken pipes, dripping |
| near | foreground girders and cable bundles, very dark |

**地面**：`ground-cold.webp`（锈褐变体：rust brown emphasis）

**障碍物**：`bouncewall-24x200.webp` ×2

```text
reflective energy wall panel, industrial frame, glowing cyan energy surface,
warning chevron stripes, tall narrow pillar 24 by 200 pixels, side view,
rusty and weathered, flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

**装饰**：`deco-light.webp`、`deco-chain.webp`

**音乐**

```text
industrial percussion driven, 100bpm, metallic clangs and hammered steel,
low pulsing bass, tense atmosphere, rhythmic machinery, loopable game bgm,
no vocals
```

---

### 第 3 关 · 悬空栈道

**背景**

```text
suspension rope bridge high above the clouds, wooden planks with steel cables,
sea of clouds below, distant industrial towers piercing the cloud layer,
high altitude blue sky with warm sunlight, side-scrolling game background,
flat cel shading, clean lineart, no characters, no text, no watermark,
seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | vast bright sky with sun and towering cumulus clouds |
| far | distant industrial spires rising above the cloud layer, hazy |
| mid | suspension cables and distant bridge towers |
| near | foreground rope bridge planks and thick cables, dark |

**地面**：`ground-cold.webp`（木板质感变体：wooden plank texture）

**障碍物**：`platform-140x16.webp`（用九宫格拉伸）、`platform-160x16.webp`

**装饰**：`deco-light.webp`、`deco-chain.webp`

**音乐**

```text
airy atmospheric, 90bpm, strong wind ambience, high reverb synth,
floating arpeggios, sense of vertigo and height, loopable game bgm, no vocals
```

---

### 第 4 关 · 审计者（Boss）

**背景**

```text
vast judgment hall, symmetrical composition, towering filing cabinets,
giant scales of justice silhouette, harsh spotlight beams from above,
polished black stone floor with reflections,
black and vermillion red palette, oppressive atmosphere,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | cavernous ceiling with a single harsh spotlight cone |
| far | towering filing cabinets receding, symmetric |
| mid | scales of justice silhouette, red warning lights |
| near | foreground spotlight beams and black polished floor |

**地面**：`ground-grey.webp`（抛光黑石变体：polished black stone）

**障碍物**：`platform-120x16.webp`

**装饰**：`deco-light.webp`（红色警示）

**音乐**

```text
boss battle theme, 130bpm, ominous choir, heavy low brass, driving percussion,
vermillion warning tones, authoritative and threatening, loopable game bgm,
no vocals
```

---

### 第 5 关 · 冷却管廊

**背景**

```text
underground coolant pipe corridor, transparent tubes with glowing cyan liquid,
metal grating floor with luminous puddles below, steam vents, valve wheels,
dense industrial piping overhead, dark teal darkness with phosphorescent glow,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | dark ceiling with pipes, faint cyan glow from above |
| far | receding pipe bundles, dim phosphorescent haze |
| mid | transparent coolant tubes with flowing glowing liquid |
| near | foreground valve wheels and dripping condensation |

**地面**：`ground-teal.webp`（金属格栅变体：metal grating with glow beneath）

**障碍物**：`platform-160x16.webp`

**装饰**：`deco-steam.webp`、`deco-panel.webp`、`deco-light.webp`

**音乐**

```text
subterranean ambience, 85bpm, liquid dripping and flowing sounds,
deep sub bass rumble, muffled machinery, claustrophobic, loopable game bgm,
no vocals
```

---

### 第 6 关 · 阵列机房

**背景**

```text
massive server farm, endless rows of server racks with blinking indicator lights,
blue and cyan LED constellations in darkness, cable bundles overhead,
raised anti-static floor tiles, cold air haze, deep perspective,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | dark ceiling with cable trays and ventilation |
| far | endless server rows, LED constellations fading into darkness |
| mid | server racks with thousands of blinking lights |
| near | foreground cable bundles and cooling units, very dark |

**地面**：`ground-teal.webp`（防静电地板变体：raised anti-static floor tiles）

**障碍物**：无（纯地面关）

**装饰**：`deco-monitor.webp`、`deco-panel.webp`、`deco-light.webp`

**音乐**

```text
electronic data center ambience, 110bpm, server fan whir, blinking data blips,
arpeggiated synth sequences like data packets, cold and precise,
loopable game bgm, no vocals
```

---

### 第 7 关 · 熔炉区

**背景**

```text
industrial furnace chamber, molten metal waterfall pouring down,
glowing orange and yellow heat, heat haze distortion, scorched brick walls,
cooling towers and slag channels, embers floating in the air,
charred black with intense orange glow,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | furnace ceiling vents with orange glow, heat shimmer |
| far | distant cooling towers silhouetted against furnace light |
| mid | molten metal waterfall pouring down the wall |
| near | foreground slag channel with glowing orange liquid |

**地面**：`ground-teal.webp`（耐热砖变体：heat resistant brick with glowing cracks）

**障碍物**：`platform-200x16.webp`

**装饰**：`deco-steam.webp`、`deco-light.webp`

**音乐**

```text
intense industrial, 140bpm, roaring furnace fire, hammering metal,
distorted power chords, aggressive percussion, overwhelming heat and pressure,
loopable game bgm, no vocals
```

---

### 第 8 关 · 改写者（Boss）

**背景**

```text
corrupted data temple, floating misaligned architecture blocks,
red data streams flowing like blood through the walls, glitching geometry,
crumbling stone edges dissolving into particles, unstable ground planes,
dark crimson and black palette with bright red accents, reality breaking down,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | fractured ceiling with red light bleeding through cracks |
| far | misaligned floating structures, unstable |
| mid | red data streams flowing down the walls |
| near | foreground crumbling blocks dissolving into pixels |

**地面**：`ground-grey.webp`（崩解变体：crumbling edges dissolving into particles）

**障碍物**：`platform-140x16.webp`

**装饰**：`deco-light.webp`（红色）

**音乐**

```text
corrupted boss theme, 135bpm with irregular time signature, distorted glitch synths,
broken rhythms, alarm sirens, reality fracturing, aggressive and unstable,
loopable game bgm, no vocals
```

---

### 第 9 关 · 坍塌档案库

**背景**

```text
infinite archive library collapsing, towering bookshelves leaning and falling,
thousands of loose paper documents floating in the air, index card cabinets,
dust motes in shafts of cold light, paper white and ink grey palette,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | vaulted ceiling with cold light shafts through dust |
| far | leaning bookshelves receding, papers swirling |
| mid | index card cabinets and floating documents |
| near | foreground collapsed shelves and scattered paper |

**地面**：`ground-grey.webp`（纸堆变体：stacked books and documents, uneven）

**障碍物**：`platform-160x16.webp`

**装饰**：`deco-monitor.webp`、`deco-chain.webp`

**音乐**

```text
melancholic ambient, 75bpm, rustling paper pages, distant echo,
sparse celesta and glass harmonica, fading memories, quiet desolation,
loopable game bgm, no vocals
```

---

### 第 10 关 · 镜像回廊

**背景**

```text
infinite mirror corridor, endless reflections receding into darkness,
mirror-polished floor reflecting the ceiling, prismatic light refraction,
broken mirror shards floating, iridescent purple sheen on silver surfaces,
disorienting symmetrical depth,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | mirrored ceiling repeating infinitely, purple sheen |
| far | receding mirror frames, diminishing reflections |
| mid | prismatic light refraction across silver panels |
| near | foreground broken mirror shards, prismatic edges |

**地面**：`ground-grey.webp`（镜面变体：mirror polished surface with reflections）

**障碍物**：`platform-140x16.webp`

**装饰**：`deco-light.webp`

**音乐**

```text
mirror dimension ambience, 95bpm, layered echo delays,
reversed reverb tails, glass harmonica, disorienting harmonic shifts,
sense of infinite recursion, loopable game bgm, no vocals
```

---

### 第 11 关 · 垂直井（纵向卷轴）

**背景**

```text
bottomless vertical data shaft, looking down into infinite darkness,
glowing data streams flowing along the walls, floating platform fragments,
faint light source far above fading into black, vertical depth perspective,
deep black with cyan data glow,
game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless vertical tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | faint light far above, fading into black |
| far | shaft walls receding downward, cyan data streams |
| mid | floating platform fragments, vertical depth |
| near | foreground data flows and broken ladders |

**地面**：`ground-grey.webp`（悬浮数据板变体：floating data platform）

**障碍物**：`platform-300x16.webp`、`platform-900x20.webp`（纵向排列）

**装饰**：`deco-light.webp`、`deco-chain.webp`

**音乐**

```text
descending into the abyss, 80bpm, long reverb, falling sensation,
distant echoes growing fainter, deep drone, vertigo, loopable game bgm, no vocals
```

---

### 第 12 关 · 涌现（终局 Boss）

**背景**

```text
reality dissolving into light particles, fragmented geometry floating in void,
everything deconstructing and reforming, brilliant magenta and violet energy,
white light bursting from cracks in space, cosmic scale,
no stable ground plane, overwhelming and transcendent,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

| 层 | 追加描述 |
| --- | --- |
| sky | void with light particles and cracks of white light |
| far | fragmented structures deconstructing into motes |
| mid | magenta and violet energy masses reforming |
| near | foreground light shards, no solid edges |

**地面**：`ground-grey.webp`（光碎片变体：fragmented light, no definite edge）

**障碍物**：`platform-160x16.webp`

**装饰**：`deco-light.webp`

**音乐**

```text
final boss theme, 145bpm, orchestral and electronic fusion,
soaring strings, massive choir, explosive climax, cosmic scale,
sense of ending and transcendence, loopable game bgm, no vocals
```

---

## 5. 分阶段生成顺序

| 阶段 | 生成内容 | 数量 | 理由 |
| --- | --- | --- | --- |
| **1** | 通用素材：地面 ×3、九宫格 ×1、弹跳墙、矮台阶、出口门、装饰 ×5 | 11 | 全项目共用，先备好 |
| **2** | 子弹 ×10 | 10 | 与场景无关，可并行 |
| **3** | 第 1、2、3 关背景 ×4 层 + 各自道具 | 12+ | 先验证辨识度 |
| **4** | 第 5、6、7 关 | 12+ | 验证三幕区分 |
| **5** | 第 9、10、11 关 | 12+ | 最抽象 |
| **6** | 第 4、8、12 关（Boss） | 12+ | 可复用主关素材变体 |
| **7** | 12 首 BGM | 12 | 独立于画面 |

**不要一次生成全部。** 先做阶段 1 + 阶段 3，接入后确认"能认出是哪一关"。

## 6. 验收标准

| 类别 | 标准 |
| --- | --- |
| **场景辨识度** | 遮住 UI 和角色，只看背景认得出关卡（**最重要**） |
| 三幕区分 | 三幕主色相差距明显 |
| **无缝** | 背景横向（第 11 关纵向），地面横向 |
| 尺寸 | 背景 1920×1080，地面 256×64，平台九宫格 96×96，弹跳墙 24×200，子弹 64×64 |
| 平台厚度 | 平台贴图必须体现 16px 薄板感，不能画成厚方块 |
| 透明 | 平台/障碍物/子弹/装饰必须透明背景 |
| 水印 | 无 |
| **BGM 可循环** | 首尾无缝衔接（**最关键**） |
| **子弹可辨识** | 只看弹道猜得出武器 |

## 7. 追溯

本文件实现：需求「美术资源提示词并入场景提示词」

相关：[场景与音效规划](/game/design/scene-plan) · [美术资源提示词总清单](/game/design/art-prompt-catalogue) · [敌人攻击设计](/game/design/enemy-attack)
