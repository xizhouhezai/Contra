---
title: 生图提示词总集
description: 本项目的全部生图需求、提示词与验收标准
---

# 生图提示词总集

> 用途：在**可生图的 agent** 中生成项目所需素材
> 关联：[动作帧提示词](/game/design/sprite-prompts) · [素材署名](/game/design/credits)

## 0. 通用规范（所有提示词共用）

```
chibi anime style, flat cel shading, clean lineart, no gradients,
solid pure white background, centered, full body visible
```

**负向词**（若 agent 支持）：

```
blurry, watermark, signature, text, logo, extra limbs, deformed hands,
realistic photo, 3d render, gradient background, drop shadow, cropped
```

**为什么强调 flat cel shading**：现有素材是平涂赛璐璐，
带渐变或 3D 渲染的图放进去会像贴错图。

**为什么强调 pure white background**：需要抠图。纯白最好处理，
复杂背景抠不干净。

---

## 1. 六角色的动作帧（最高优先级）

### 1.1 DeepSeek · 蓝色大肥鱼

**设定**：深蓝长发过腰、呆毛、鲸鱼头鳍、鲸尾、白女仆头饰、蓝裙白围裙、围裙鲸鱼印花

```
chibi anime girl, exactly 2-head-tall proportions, long deep blue hair past waist,
single ahoge on top, small whale fin on head, whale tail, white frilled maid headdress,
blue dress with white apron, small whale print on apron,
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

| 动作 | 帧数 | `{POSE}` |
| --- | --- | --- |
| Idle | 3 | `standing idle, arms relaxed at sides` |
| Walk | 4 | `walking forward, left leg forward, right arm forward` |
| Attack | 4 | `holding a glowing energy cannon with both hands, aiming forward, recoil pose` |
| Jump | 2 | `jumping upward, knees bent, arms raised` |
| Hurt | 1 | `staggering back, head tilted, one arm up defensively` |

### 1.2 Qwen · 千问

**设定**：淡紫蓝发、编发、折扇、蓝白旗袍、六角花徽章

```
chibi anime girl, exactly 2-head-tall proportions, pale lavender-blue hair in braids,
holding a folding fan, blue-and-white qipao dress, hexagonal flower emblem on chest,
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

Attack 姿势换成持扇释放能量：`fanning the folding fan forward, energy arc from the fan`

### 1.3 豆包 · DouBao

**设定**：深棕短发、圆润 Q 版、大眼、亲和神情（官方 3D 形象，但游戏内用 2D 化）

```
chibi anime girl, exactly 2-head-tall proportions, short dark brown bob hair,
large round eyes, friendly expression, simple casual outfit {COLOR},
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

`{COLOR}` 填 `in orange and white`（对应现有配色）。

### 1.4 GLM · 哥林姆

**设定**：黑发猫耳、铃铛、黑白女仆装、Z 铭牌、书本

```
chibi anime girl, exactly 2-head-tall proportions, long black hair with cat ears,
small bell on collar, black-and-white maid dress, Z badge on chest, holding a book,
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

### 1.5 Kimi · 月读

**设定**：银白长发、月牙发饰、K 徽章、星空披风

```
chibi anime girl, exactly 2-head-tall proportions, long silver-white hair,
crescent moon hair ornament, K badge, starry night cape,
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

### 1.6 Gemini · 双子

**设定**：蓝紫渐变发、猫耳、四色星芒、白短裙、渐变飘带

```
chibi anime girl, exactly 2-head-tall proportions, blue-purple gradient long hair,
cat ears, four-color starburst ornament, white short skirt, gradient ribbons,
{POSE}, side view facing right, feet visible, flat cel shading, clean lineart,
solid pure white background, game sprite, centered
```

---

## 2. 敌人（10 种）

统一模板，替换 `{TYPE}`：

```
small game enemy sprite, {TYPE}, menacing but cute, chibi proportions,
side view facing left, flat cel shading, clean lineart,
solid pure white background, centered, game sprite
```

| 类型 | `{TYPE}` |
| --- | --- |
| 巡逻兵 | `small floating robot drone with one glowing eye` |
| 炮台 | `stationary turret with two barrels and a red core` |
| 运载者 | `floating carrier with a container on its back` |
| 冲锋者 | `armored quadruped charging forward with horns` |
| 飞行者 | `winged creature with sharp talons` |
| 守卫 | `heavy armored guard with a shield` |
| 装甲兵 | `armored soldier with plated chest` |
| 锻造者 | `mechanical forge unit with a hammer arm` |
| 镜像 | `mirror copy of the player, translucent and glitchy` |
| 精英冲锋者 | `elite charger, larger and with glowing horns` |

---

## 3. 背景（工业风视差层）

现有 4 层 CC0 背景可用，若要重做：

```
industrial cyberpunk cityscape, {LAYER}, pixel art style,
limited palette of dark teal and warm ochre, no characters, seamless horizontal tiling
```

| 层 | `{LAYER}` |
| --- | --- |
| 天空 | `distant sky with clouds, no buildings` |
| 远景建筑 | `far background silhouette buildings, low detail` |
| 中景建筑 | `midground factory buildings with windows` |
| 前景 | `foreground pipes and girders, high detail, dark` |

---

## 4. 界面素材

### 4.1 角色头像（HUD 用）

```
chibi anime character portrait, {CHARACTER_DESCRIPTION}, head and shoulders,
flat cel shading, clean lineart, solid pure white background, square composition
```

### 4.2 Boss 立绘

```
anime villain portrait, {BOSS_DESCRIPTION}, dramatic pose, half body,
flat cel shading, clean lineart, solid pure white background
```

| Boss | 描述 |
| --- | --- |
| Claude 审计者 | `silver-white long hair, orange flower ornament, maid outfit, orange eyes` |
| Claude 改写者 | 同上，配色转红：`same character, crimson red accents, rule patterns` |
| GPT 语料 | `blonde twin tails, demon horns and wings, black-gold long dress, X emblem` |
| GPT 涌现 | 同上，暗化：`same character, darkened, dissolving outline` |

---

## 5. 验收标准

### 一致性检查（最关键）

同一角色的所有帧逐条核对：

- [ ] 发色**同一色值**（不是接近）
- [ ] 头身比一致（都是 2 头身）
- [ ] 标志性配件都在（呆毛/头鳍/鲸尾、折扇、猫耳等）
- [ ] 线稿粗细一致
- [ ] 全部面朝右
- [ ] 角色高度占画面 80%

**最容易崩的是头身比**：换动作时模型倾向把角色画「成熟」。
出现就加强：

```
very important: exactly 2-head-tall chibi proportions, small body, large head
```

### 技术规格

| 项 | 要求 |
| --- | --- |
| 分辨率 | 动作帧 512×512 |
| 背景 | 纯白 #FFFFFF |
| 格式 | PNG（需透明通道时后处理抠图） |
| 朝向 | 一律面朝右 |

---

## 6. 交付与接入

放到这个结构：

```
docs/game/requirements/assets/animated/
  deepseek/idle-00.png ...
  qwen/idle-00.png ...
  ...
```

代码侧已就绪：

| 文件 | 作用 |
| --- | --- |
| `assets/animated.ts` | 动画帧表与状态映射 |
| `assets/animatedSheets.ts` | 贴图加载 |
| `scripts/pack-sprites.py` | 打包成精灵表（待写） |

图到位后我会打包并替换掉当前的希腊战士。

---

## 7. 备选：不生成也能改善

如果生图一致性始终不达标，有两条退路：

**退路 A**：用已有 57 张梗图做**表情状态切换**（站立/开火/受伤各一张），
约 40 行代码，不需要新素材，效果不如真动画但强于静止贴图。

**退路 B**：保留程序化动效（呼吸/后坐/倾斜），这是当前已实现并验证的，
角色已经会动，只是没有逐帧动作。

## 8. 追溯

本文件实现：REQ-GUN-001 的素材产出规范

相关：[动作帧提示词](/game/design/sprite-prompts) · [形象与骨骼调研](/game/design/animation-research) · [角色规格](/game/requirements/characters)
