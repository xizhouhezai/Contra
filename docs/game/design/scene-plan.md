---
title: 场景与表现资源规划 · 十二关
description: 每关独立的场景、背景音与武器弹道视觉方案
---

# 场景与表现资源规划 · 十二关

> **需求来源**：玩家反馈「场景太单一」「不同场景要有不同背景音」「不同武器子弹应不同」
> **目标**：每关有独立的视觉与听觉识别，每把武器有独立弹道外观。

## 1. 现状与问题

| 资源 | 现状 | 问题 |
| --- | --- | --- |
| 场景背景 | 12 关共用 4 套视差图 | 第 1、2、3 关画面完全相同 |
| 背景音乐 | 仅 6 首 `bgm-01~06` | 两关共用一首，听感重复 |
| 子弹外观 | **全部用同一张灰盒贴图** `graybox-bullet` | 10 把武器打出的子弹一模一样 |
| 地面 | 纯色矩形 | 玩家反馈「太假」 |

**判定标准**：只看截图能认出是哪一关；只听背景音能听出换了一关；
只看弹道能猜出用的是什么武器。

---

## 2. 三幕结构

不是三个割裂的主题，而是**从地表打进核心**的纵向旅程。

```
幕 I   破晓边境 ── 地表 · 港口与栈道 · 潮湿、开阔、天光
   ↓
幕 II  硅基深处 ── 地下 · 管道与机房 · 闷热、封闭、人造光源
   ↓
幕 III 推理之巅 ── 核心 · 档案与镜面 · 失重、抽象、非现实
```

**三重递进**：光源（自然光→人造光→自发光）、
空间（开阔→封闭→失重）、材质（锈铁→硅与液冷→光与数据）。

---

## 3. 十二关方案（视觉 + 听觉）

每关包含：**视觉锚点 / 配色 / 场景提示词 / 音乐风格 / 音乐提示词**。

---

### 第 1 关 · 码头晨雾（幕 I）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 破晓逆光，集装箱成剪影 |
| **主色** | `#2a3f52` 雾蓝 + `#c8901f` 晨光橙 |
| **地面** | 湿水泥 + 铁轨，反光 |
| **障碍物** | 集装箱、系船柱、货箱堆 |

**场景提示词**

```text
dawn shipping port, container yard, heavy sea fog, backlit rising sun,
container stacks in silhouette, wet concrete with rail tracks reflecting light,
cranes and mooring bollards, cool blue fog with warm orange rim light,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：慢速、开阔、带海风感

```text
calm industrial ambient, slow tempo 70bpm, distant foghorn, gentle wind,
muted synth pads, sparse piano notes, lonely but hopeful, loopable game bgm,
no vocals
```

---

### 第 2 关 · 锈铁回廊（幕 I）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 会弹射子弹的锈蚀钢板墙 |
| **主色** | `#5a4632` 锈褐 + `#1f3a5f` 靛蓝 |
| **地面** | 锈蚀钢板 + 铆钉 |
| **障碍物** | **弹跳钢板**、断裂管道 |

**场景提示词**

```text
abandoned steel corridor, heavy rust and corrosion, riveted iron plates,
broken pipes with dripping water, light shafts through gaps in the roof,
warm rust brown against cold blue shadows, side-scrolling game background,
flat cel shading, clean lineart, no characters, no text, no watermark,
seamless horizontal tiling
```

**音乐**：中速、金属敲击、紧张感上升

```text
industrial percussion driven, 100bpm, metallic clangs and hammered steel,
low pulsing bass, tense atmosphere, rhythmic machinery, loopable game bgm,
no vocals
```

**弹跳墙素材**

```text
reflective energy wall panel, industrial frame, glowing cyan energy surface,
warning chevron stripes, side view, flat cel shading, clean lineart,
no text, no watermark, solid pure white background, centered
```

---

### 第 3 关 · 悬空栈道（幕 I）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 云海 + 摇晃的钢索吊桥 |
| **主色** | `#3d4f63` 高空蓝 + `#e8e4dc` 云白 |
| **地面** | 木板 + 钢索，缝隙见云 |
| **障碍物** | 断桥、钢索桩、风向标 |

**场景提示词**

```text
suspension rope bridge high above the clouds, wooden planks with steel cables,
sea of clouds below, distant industrial towers piercing the cloud layer,
high altitude blue sky with warm sunlight, side-scrolling game background,
flat cel shading, clean lineart, no characters, no text, no watermark,
seamless horizontal tiling
```

**音乐**：高空感、飘、风声

```text
airy atmospheric, 90bpm, strong wind ambience, high reverb synth,
floating arpeggios, sense of vertigo and height, loopable game bgm, no vocals
```

---

### 第 4 关 · 审计者（Boss · 幕 I 终）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 巨型天平、成排档案柜、探照灯 |
| **主色** | `#1a1a1a` 墨黑 + `#d6452c` 朱红 |
| **地面** | 抛光黑石，反光 |
| **氛围** | 空旷、对称、压迫 |

**场景提示词**

```text
vast judgment hall, symmetrical composition, towering filing cabinets,
giant scales of justice silhouette, harsh spotlight beams from above,
polished black stone floor with reflections,
black and vermillion red palette, oppressive atmosphere,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：Boss 战，压迫、庄严、有威胁

```text
boss battle theme, 130bpm, ominous choir, heavy low brass, driving percussion,
vermillion warning tones, authoritative and threatening, loopable game bgm,
no vocals
```

---

### 第 5 关 · 冷却管廊（幕 II）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 透明管道里的发光冷却液 |
| **主色** | `#0d1f1e` 深青黑 + `#4fd6c0` 磷光青 |
| **地面** | 金属格栅，下面积液发光 |
| **障碍物** | 阀轮、管道接口、泄漏点 |

**场景提示词**

```text
underground coolant pipe corridor, transparent tubes with glowing cyan liquid,
metal grating floor with luminous puddles below, steam vents, valve wheels,
dense industrial piping overhead, dark teal darkness with phosphorescent glow,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：闷热、液体流动、低频压迫

```text
subterranean ambience, 85bpm, liquid dripping and flowing sounds,
deep sub bass rumble, muffled machinery, claustrophobic, loopable game bgm,
no vocals
```

---

### 第 6 关 · 阵列机房（幕 II）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 成排指示灯如星河 |
| **主色** | `#101a24` 机房黑 + `#4a9eff` 指示蓝 |
| **地面** | 防静电地板，方块拼接 |
| **障碍物** | 机柜、线缆束、散热风扇 |

**场景提示词**

```text
massive server farm, endless rows of server racks with blinking indicator lights,
blue and cyan LED constellations in darkness, cable bundles overhead,
raised anti-static floor tiles, cold air haze, deep perspective,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：数据流、电子、精密

```text
electronic data center ambience, 110bpm, server fan whir, blinking data blips,
arpeggiated synth sequences like data packets, cold and precise,
loopable game bgm, no vocals
```

---

### 第 7 关 · 熔炉区（幕 II）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 熔融金属瀑布 |
| **主色** | `#1a0f0a` 焦黑 + `#ff7a1f` 熔橙 |
| **地面** | 耐热砖，缝隙透红 |
| **障碍物** | 熔炉口、铁水槽、冷却塔 |

**场景提示词**

```text
industrial furnace chamber, molten metal waterfall pouring down,
glowing orange and yellow heat, heat haze distortion, scorched brick walls,
cooling towers and slag channels, embers floating in the air,
charred black with intense orange glow,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：高温、猛烈、有爆发力

```text
intense industrial, 140bpm, roaring furnace fire, hammering metal,
distorted power chords, aggressive percussion, overwhelming heat and pressure,
loopable game bgm, no vocals
```

---

### 第 8 关 · 改写者（Boss · 幕 II 终）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 悬浮错位建筑块、红色数据流 |
| **主色** | `#2a0f14` 暗红黑 + `#ff2d55` 改写红 |
| **地面** | 崩解黑石，边缘化数据流 |
| **氛围** | 失序、错位、不稳定 |

**场景提示词**

```text
corrupted data temple, floating misaligned architecture blocks,
red data streams flowing like blood through the walls, glitching geometry,
crumbling stone edges dissolving into particles, unstable ground planes,
dark crimson and black palette with bright red accents, reality breaking down,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：错拍、失真、崩解

```text
corrupted boss theme, 135bpm with irregular time signature, distorted glitch synths,
broken rhythms, alarm sirens, reality fracturing, aggressive and unstable,
loopable game bgm, no vocals
```

---

### 第 9 关 · 坍塌档案库（幕 III）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 悬浮的破碎文件页 |
| **主色** | `#c9c2b4` 旧纸白 + `#4a4340` 墨灰 |
| **地面** | 堆叠的书与文件，不平整 |
| **障碍物** | 倒塌书架、散落档案箱 |

**场景提示词**

```text
infinite archive library collapsing, towering bookshelves leaning and falling,
thousands of loose paper documents floating in the air, index card cabinets,
dust motes in shafts of cold light, paper white and ink grey palette,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：空灵、纸页翻动、失落

```text
melancholic ambient, 75bpm, rustling paper pages, distant echo,
sparse celesta and glass harmonica, fading memories, quiet desolation,
loopable game bgm, no vocals
```

---

### 第 10 关 · 镜像回廊（幕 III）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 镜中倒影层层叠叠 |
| **主色** | `#b8c4d0` 镜银 + `#6b4a8f` 紫晕 |
| **地面** | 镜面地板，倒映上方 |
| **障碍物** | 镜柱、破碎镜面、棱镜 |

**场景提示词**

```text
infinite mirror corridor, endless reflections receding into darkness,
mirror-polished floor reflecting the ceiling, prismatic light refraction,
broken mirror shards floating, iridescent purple sheen on silver surfaces,
disorienting symmetrical depth,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：镜像延迟、回声、迷离

```text
mirror dimension ambience, 95bpm, layered echo delays,
reversed reverb tails, glass harmonica, disorienting harmonic shifts,
sense of infinite recursion, loopable game bgm, no vocals
```

---

### 第 11 关 · 垂直井（幕 III · 唯一纵向卷轴）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 向下的深渊 + 向上消失的光 |
| **主色** | `#0a0d12` 深井黑 + `#7fd6ff` 数据青 |
| **地面** | 悬浮的数据平台 |
| **障碍物** | 井壁凸起、断裂梯子、数据流 |

**场景提示词**

```text
bottomless vertical data shaft, looking down into infinite darkness,
glowing data streams flowing along the walls, floating platform fragments,
faint light source far above fading into black, vertical depth perspective,
deep black with cyan data glow,
game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless vertical tiling
```

> 本关纵向卷轴，用 `seamless vertical tiling`。

**音乐**：下坠、空旷、逐渐远去

```text
descending into the abyss, 80bpm, long reverb, falling sensation,
distant echoes growing fainter, deep drone, vertigo, loopable game bgm,
no vocals
```

---

### 第 12 关 · 涌现（终局 Boss）

| 项 | 内容 |
| --- | --- |
| **视觉锚点** | 世界解构为光粒子 |
| **主色** | `#1a0a1f` 虚空紫黑 + `#ff6b9d` 品红 + `#a78bfa` 紫 |
| **地面** | 碎片化的光，无确定边界 |
| **氛围** | 宏大、超现实、终局 |

**场景提示词**

```text
reality dissolving into light particles, fragmented geometry floating in void,
everything deconstructing and reforming, brilliant magenta and violet energy,
white light bursting from cracks in space, cosmic scale,
no stable ground plane, overwhelming and transcendent,
side-scrolling game background, flat cel shading, clean lineart,
no characters, no text, no watermark, seamless horizontal tiling
```

**音乐**：浩然、终局、升华

```text
final boss theme, 145bpm, orchestral and electronic fusion,
soaring strings, massive choir, explosive climax, cosmic scale,
sense of ending and transcendence, loopable game bgm, no vocals
```

---

## 4. 背景音乐总表

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
| 9 档案库 | 空灵失落 | 75 | 2:00 | `bgm-09-archive.ogg` |
| 10 镜像回廊 | 回声迷离 | 95 | 2:00 | `bgm-10-mirror.ogg` |
| 11 垂直井 | 下坠空旷 | 80 | 2:00 | `bgm-11-abyss.ogg` |
| 12 涌现 | 终局升华 | 145 | 3:00 | `bgm-12-emergence.ogg` |

**现有 `bgm-01~06.ogg` 保留为备用，新曲按上表命名。**

### 音乐通用要求

| 项 | 要求 |
| --- | --- |
| 格式 | OGG Vorbis，128kbps |
| **可循环** | 首尾必须能无缝衔接（**最关键**） |
| 长度 | 2:00~3:00，太短会听腻 |
| 人声 | 无 |
| 风格 | 电子 + 工业，可用合成器，不用真实乐器录音 |

---

## 5. 武器弹道视觉

### 5.1 现状

10 把武器**全部使用同一张 `graybox-bullet`**，外观完全相同。

### 5.2 各武器的弹道设计

| 武器 | 弹道形态 | 主色 | 提示词 |
| --- | --- | --- | --- |
| 脉冲弹 pulse | 小型圆弹 | `#4a9eff` 蓝 | `small round energy bolt, blue glow, simple orb` |
| 扩散散弹 scatter | 多颗小弹丸 | `#ff9f1c` 橙 | `small pellet projectile, orange trail, shotgun pellet` |
| 长程连射 rifle | 细长条 | `#7fd6ff` 青 | `thin elongated energy dart, cyan streak, high velocity` |
| 追踪弹幕 homing | 弯曲尾迹弹 | `#a78bfa` 紫 | `homing missile, purple with curved smoke trail, seeking` |
| 穿甲弹 pierce | 尖锐锥形 | `#e8e4dc` 白 | `sharp armor-piercing spike, white hot tip, pointed` |
| 集束炸弹 cluster | 大弹体 | `#d6452c` 红 | `cluster bomb shell, red with segmented body` |
| 激光枪 laser | 光束 | `#ff2d55` 品红 | `thin laser beam, magenta, continuous beam segment` |
| 散射榴弹 grenade | 圆榴弹 | `#8b6f47` 褐 | `grenade projectile, olive green, arc trajectory, spinning` |
| 回溯弹 replay | 环形弹 | `#c8901f` 金 | `ornate clockwork bullet, golden rings, time motif` |
| 棱镜弹 prism | 彩虹折射 | `#ffffff` 白+彩虹 | `prism crystal shard, refracting rainbow colors` |

### 5.3 弹道素材提示词模板

```text
game projectile sprite, {WEAPON_BULLET}, side view, glowing energy,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, 64x64, centered
```

**要求**

| 项 | 值 |
| --- | --- |
| 尺寸 | **64×64** |
| 背景 | 纯白（需抠图） |
| 朝向 | 一律**朝右**（代码翻转复用） |
| 发光 | 允许外发光，但不要模糊到看不清形状 |

### 5.4 命中特效

| 武器 | 命中效果 |
| --- | --- |
| 脉冲/连射 | 小火花 |
| 散弹/榴弹 | 中等爆炸 |
| 激光/棱镜 | 光斑 |
| 集束 | 大爆炸 |
| 穿甲 | 穿透无特效 |

---

## 6. 交付路径

```text
docs/game/requirements/assets/
  scenes/
    s01-dock/     sky.webp far.webp mid.webp near.webp  props/*.webp
    s02-corridor/ ...
    ... s12-emergence/
  audio/
    bgm/  bgm-01-dock.ogg ... bgm-12-emergence.ogg
  projectiles/
    pulse.webp scatter.webp rifle.webp ... prism.webp   (各 64x64)
```

---

## 7. 验收标准

### 场景

| 项 | 标准 |
| --- | --- |
| **辨识度** | 遮住 UI 和角色，只看背景认得出关卡（**最重要**） |
| 三幕区分 | 三幕主色相差距明显 |
| 无缝 | 横向（1~10、12 关）或纵向（11 关） |
| 尺寸 | 每层 1920×1080 |

### 音乐

| 项 | 标准 |
| --- | --- |
| **可循环** | 首尾无缝衔接（**最关键**） |
| 差异化 | 12 首互相能听出区别 |
| 情绪匹配 | 与关卡氛围一致 |

### 子弹

| 项 | 标准 |
| --- | --- |
| **可辨识** | 只看弹道猜得出武器（**最重要**） |
| 尺寸 | 64×64 |
| 朝向 | 朝右 |

---

## 8. 分阶段实施

| 阶段 | 内容 | 理由 |
| --- | --- | --- |
| **1** | 第 1、2、3 关场景 + 3 首音乐 | 先验证辨识度标准 |
| **2** | 10 张子弹贴图 | 独立于场景，可并行 |
| **3** | 第 5、6、7 关 + 音乐 | 验证三幕区分 |
| **4** | 第 9、10、11 关 + 音乐 | 最抽象 |
| **5** | 4 个 Boss 关 + 4 首 Boss 曲 | 可复用主关素材 |

**不要一次生成全部。** 先做阶段 1，接入后确认"能认出是哪一关"，再继续。

## 追溯

本文件实现：需求「每关不同场景」「不同背景音」「不同武器子弹」

相关：[美术资源提示词总清单](/game/design/art-prompt-catalogue) · [GDD](/game/requirements/gdd) · [关卡设计](/game/requirements/stages)
