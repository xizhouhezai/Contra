---
title: 美术资源提示词总清单
description: 项目全部待生成美术资源的提示词、规格与验收标准
---

# 美术资源提示词总清单

> 用法：把下面每一段提示词直接交给能生图的 agent。
> 生成后按对应规格检查，符合的放入指定路径。
> 关联：[动作帧提示词](/game/design/sprite-prompts) · [素材署名](/game/design/credits)

## 进度总览

| 资源 | 数量 | 生成 | 接入 |
| --- | --- | --- | --- |
| 六角色动作帧 | 84 帧 | ✅ | ✅ **已接入** |
| 敌人 × 10 | 20 帧 | ✅ | ✅ **已接入** |
| Boss × 4 形态 | 4 张 | ✅ | ⬜ 待接入（需先处理白底） |
| 武器图标 × 10 | 10 | ✅ | ⬜ 待接入 |
| HUD 头像 × 6 | 6 | ✅ | ⬜ 待接入 |
| 通关印章 × 4 | 4 | ✅ | ⬜ 待接入 |
| 背景 × 4 层 | 4 | ✅ | ✅ 已接入 |

**全部素材已生成完毕。** 剩下的是接入工作，见
[M6 里程碑](/game/tasks/m6-variants-motion) 的 T-M6-19 ~ 22。

## 0. 全局规则（每个提示词都已内置，无需重复）

**统一画风**：平涂赛璐璐、干净线稿、无渐变、无 3D 渲染。

**统一背景**：纯白 #FFFFFF（除背景图层外）。

**统一负向词**（若 agent 支持）：

```
blurry, watermark, signature, text, logo, extra limbs, deformed hands,
realistic photo, 3d render, gradient background, drop shadow, cropped, jpeg artifacts
```

**已有素材的教训**：上一批 15 张图虽然没有渐变、画风统一，
但**右下角有「Qoder AI 生成」水印**，且角色占画面高度在 89%~96% 间浮动。
这次请确保：**无任何文字/水印**，角色高度占画面 **90%±2%**。


---

# 〇、参考对象总表（最重要）

**生成每一个资源前，先看对应的参考图。** 文字描述只能表达「有什么特征」，
参考图才能表达「长什么样」。下面的路径都在本仓库里，可直接作为图生图的输入。

## 0.1 角色参考

| 角色 | 主要参考（立绘） | Q 版参考（表情） | 来源 |
| --- | --- | --- | --- |
| DeepSeek 蓝色大肥鱼 | `assets/zipzippipe/deepseek-whale-maid.webp` | `assets/official/meme-deepseek/`（20 张） | ZipZipPipe，B 站 UID 4168597 |
| Qwen 千问 | `assets/zipzippipe/qwen-*.webp` | `assets/official/meme-qwen/`（6 张） | ZipZipPipe / 梗鲸 |
| 豆包 DouBao | `assets/portraits/doubao.webp` | `assets/official/meme-doubao/`（5 张） | 豆包官方 3D 形象 |
| GLM 哥林姆 | `assets/zipzippipe/glm-zhipu-maidservant.webp` | `assets/official/meme-glm/`（3 张） | ZipZipPipe |
| Kimi 月读 | `assets/zipzippipe/kimi-starlight-k.webp` | `assets/official/meme-kimi/`（6 张） | ZipZipPipe |
| Gemini 双子 | `assets/portraits/gemini.webp` | `assets/official/meme-gemini/`（5 张） | ZipZipPipe |

**项目原定的形象来源**（`characters.md`）：六角色以 **ZipZipPipe（B 站 UP 主，`space.bilibili.com/4168597`）**
的二创立绘为准 —— 这套画风是中文社区公认的「AI 娘」样式，玩家认的是这套形象，不是厂商 Logo。

## 0.2 Boss 参考

| Boss | 参考图 | 来源 |
| --- | --- | --- |
| **Claude 审计者**（形态 I） | `assets/bosses/claude-q-01.webp` ~ `claude-q-04.webp` | **梗鲸档案馆 `aigengtu.com/Claude娘`** |
| **Claude 改写者**（形态 II） | 同上 4 张，取配色转红的那版 | 同上 |
| **GPT 语料**（形态 I） | `assets/bosses/gpt-portrait-01.webp`、`02.webp` | **梗鲸档案馆 `aigengtu.com/GPT娘`** |
| **GPT 涌现**（形态 II） | 同上 2 张，取暗化崩解那版 | 同上 |
| GPT 持镰形态补充 | `assets/zipzippipe/gpt-reaper-scythe.webp` | ZipZipPipe |

## 0.3 其他资源的参考

| 资源 | 参考 |
| --- | --- |
| 背景 4 层 | `assets/backgrounds/` 现有 4 张 CC0 视差图 |
| 敌人 10 种 | `assets/sprites/enemy-*.webp` 现有 10 张（占位性质，可重画） |
| 界面风格 | `docs/game/design/art-style.md` 的 Riso 配色与实物样板 |

## 0.4 怎么用这些参考

生图 agent 若支持**图生图 / 参考图**，请把对应路径的图作为输入，提示词只写「动作与姿势」，例如：

```
参考图：assets/official/meme-deepseek/007.webp
提示词：保持这个角色的发色、服装、头鳍与鲸尾完全不变，
改为「手持能量炮开火，身体后仰」的姿势，
侧视朝右，全身，纯白背景，平涂赛璐璐，无文字无水印
```

**这是保证一致性最有效的方法**，比纯文字描述可靠得多。
上一批 15 张图用纯文字生成，角色高度在 89%~96% 间浮动；
用参考图可以把这个误差压到 2% 以内。

若 agent 不支持图生图，则把参考图**自己看一遍**，
在提示词里补充它的具体细节（发色色值、裙长、装饰位置）。
---

# 一、角色动作帧 —— ✅ 已生成并接入

**六角色全部生成完毕，已接入游戏，不需要再生成。**

| 角色 | 帧数 | 精灵表 | 状态 |
| --- | --- | --- | --- |
| DeepSeek 蓝色大肥鱼 | 14 | 5 张 | ✅ 已接入，待机/移动/开火验证通过 |
| Qwen 千问 | 14 | 5 张 | ✅ 已接入 |
| 豆包 DouBao | 14 | 5 张 | ✅ 已接入 |
| GLM 哥林姆 | 14 | 5 张 | ✅ 已接入 |
| Kimi 月读 | 14 | 5 张 | ✅ 已接入 |
| Gemini 双子 | 14 | 5 张 | ✅ 已接入 |

**原始帧**：`assets/animated/<角色>/`（512×512 PNG，真透明，无水印）
**精灵表**：`assets/animated-sheets/`（256×256 帧，30 张，共 1.43MB）
**打包脚本**：`scripts/pack-sprites.py`

### 已解决的一致性问题

| 项 | 结果 |
| --- | --- |
| 透明度 | ✅ 真透明通道（alpha 有实际取值，非全 255） |
| 水印 | ✅ 无（上一批每张都有「Qoder AI 生成」） |
| 高度浮动 | 原始 7%~16% → 打包后统一 0.562 缩放，底部对齐 |
| 角色占画面 | 原始 76%（低于要求 90%）→ 打包时按 90% 归一化 |

### 保留原提示词的原因

下面六节**保留但不再执行**。保留的理由：

1. 如果以后要**重做某个角色的某个动作**，这是现成的规格说明；
2. 如果要**新增第七个角色**，可照此模板填特征；
3. 记下了每个角色的**识别特征清单**，是验收画风的依据。

### 六角色当前的参考图（做 HUD 头像、立绘、新增角色时用）

| 角色 | 参考路径 |
| --- | --- |
| DeepSeek | `assets/zipzippipe/deepseek-whale-maid.webp` + `assets/official/meme-deepseek/007.webp` |
| Qwen | `assets/official/meme-qwen/2222.webp` + `assets/portraits/qwen.webp` |
| 豆包 | `assets/official/meme-doubao/2168.webp` + `assets/portraits/doubao.webp` |
| GLM | `assets/zipzippipe/glm-zhipu-maidservant.webp` + `assets/official/meme-glm/2173.webp` |
| Kimi | `assets/zipzippipe/kimi-starlight-k.webp` + `assets/official/meme-kimi/2205.webp` |
| Gemini | `assets/official/meme-gemini/2171.webp` + `assets/portraits/gemini.webp` |

> 若要重做，**直接把已生成的帧喂给 agent 当参考**，比用原始立绘更准 ——
> 已生成的帧本身就是 2 头身、平涂、透明背景，风格已经对齐了游戏。

---

# 附录：六角色动作帧的原始提示词（已完成，仅备查）

> ⚠️ 以下内容已执行完毕，**不要重复生成**。
> 保留作为「如何为某个角色生成动作帧」的模板。

## 通用模板

```
chibi anime girl, exactly 2-head-tall proportions, {IDENTIFYING FEATURES},
{POSE}, side view facing right, full body, feet visible,
flat cel shading, clean lineart, no gradients, no text, no watermark,
solid pure white background, character occupies 90% of frame height, centered
```

把 `{POSE}` 依次替换为：

| 编号 | `{POSE}` |
| --- | --- |
| `idle-00` | `standing idle, arms relaxed at sides` |
| `idle-01` | `standing idle, arms relaxed, head slightly tilted` |
| `idle-02` | `standing idle, slight breathing pose` |
| `walk-00` | `walking forward, left leg forward, right arm forward` |
| `walk-01` | `walking forward, right leg forward, left arm forward` |
| `walk-02` | `walking forward, mid stride, arms swinging` |
| `walk-03` | `walking forward, leg extended, body leaning` |
| `attack-00` | `holding a glowing energy cannon with both hands, aiming forward` |
| `attack-01` | `holding energy cannon, firing, body recoiling backward` |
| `attack-02` | `firing energy cannon, muzzle flash, dynamic stance` |
| `attack-03` | `firing energy cannon, wide stance, intense expression` |
| `jump-00` | `jumping upward, knees bent, arms raised` |
| `jump-01` | `falling, legs extended downward, arms out` |
| `hurt-00` | `staggering back, head tilted, one arm up defensively` |

## 各角色的 `{IDENTIFYING FEATURES}`

| 角色 | 填入 |
| --- | --- |
| DeepSeek | `long deep blue hair past waist, single ahoge on top, small whale fin on head, whale tail, white frilled maid headdress, blue dress with white apron, small whale print on apron` |
| Qwen | `pale lavender-blue hair in braids, blue-and-white qipao dress, hexagonal flower emblem on chest, holding a folding fan` |
| 豆包 | `short dark brown bob hair, large round eyes, friendly expression, casual orange and white outfit` |
| GLM | `long black hair with cat ears, small bell on collar, black-and-white maid dress, Z badge on chest, holding a book` |
| Kimi | `long silver-white hair, crescent moon hair ornament, K badge, starry night cape` |
| Gemini | `blue-purple gradient long hair, cat ears, four-color starburst ornament, white short skirt, gradient ribbons` |

**Qwen 的 Attack 姿势**换成：`fanning the folding fan forward, energy arc sweeping from the fan`
（她是扇子不是炮）。

**Gemini 注意**：「渐变发」用平涂分色块表达，不用平滑渐变，否则与全局画风冲突。

# 二、敌人（10 种）—— ✅ 已生成并接入

统一尺寸 **512×512**，朝左（玩家朝右，敌人相向）。

**参考**：`assets/sprites/enemy-*.webp` 现有 10 张。它们是程序生成的几何占位图，
**没有保留价值**，但可以参考它们的大小与配色倾向（暗青 + 朱红点缀）。
真正的画风参考应当来自角色立绘 —— 敌人也要是「平涂赛璐璐」，与角色同一套笔触。

```
small game enemy, {TYPE}, menacing but cute, chibi proportions,
side view facing left, flat cel shading, clean lineart, no gradients,
no text, no watermark, solid pure white background,
character occupies 80% of frame height, centered
```

| 编号 | 名称 | `{TYPE}` |
| --- | --- | --- |
| `patrol` | 巡逻兵 | `small floating robot drone with one glowing red eye and two antenna` |
| `turret` | 固定炮台 | `stationary turret with two barrels, heavy base, red glowing core` |
| `carrier` | 运载虫 | `floating insect carrier with a metal container on its back` |
| `charger` | 冲锋兵 | `armored quadruped beast with forward horns, crouched to charge` |
| `flyer` | 飞行体 | `winged creature with sharp talons and tattered wings` |
| `warden` | 守卫者 | `heavy armored guard holding a large shield, imposing` |
| `armored` | 重甲兵 | `armored soldier with thick plated chest and helmet visor` |
| `forge` | 锻造者 | `mechanical forge unit with a hammer arm and furnace chest` |
| `mirror` | 镜像体 | `glitching translucent copy of a girl, broken pixels, unsettling` |
| `elite-charger` | 精英冲锋兵 | `elite charger, larger body, glowing horns, scarred armor` |

---

# 三、Boss 立绘（4 个形态）—— ✅ 已生成，待接入

尺寸 **768×1024**，半身像，朝右。

## 3.1 Claude · 审计者

**参考图**：`assets/bosses/claude-q-01.webp` ~ `claude-q-04.webp`（4 张）
**原型来源**：梗鲸档案馆 `aigengtu.com/Claude娘`

```
anime villain portrait, silver-white long hair, orange flower hair ornament,
white maid outfit, orange eyes, cold authoritative expression, half body,
facing right, flat cel shading, clean lineart, no gradients,
no text, no watermark, solid pure white background, centered
```

## 3.2 Claude · 改写者

**参考图**：同审计者 4 张，取配色偏红的那版
**原型来源**：梗鲸档案馆 `aigengtu.com/Claude娘`

```
anime villain portrait, same silver-white haired girl, now with crimson red accents
and glowing rule-pattern markings on her clothes, orange eyes turned red, half body,
facing right, flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

## 3.3 GPT · 语料（形态 I）

**参考图**：`assets/bosses/gpt-portrait-01.webp`、`gpt-portrait-02.webp`
**原型来源**：梗鲸档案馆 `aigengtu.com/GPT娘`
**持镰形态补充参考**：`assets/zipzippipe/gpt-reaper-scythe.webp`

```
anime villain portrait, blonde twin tails, small demon horns and bat wings,
black and gold long dress, X-shaped emblem, half body, facing right,
flat cel shading, clean lineart, no gradients, no text, no watermark,
solid pure white background, centered
```

## 3.4 GPT · 涌现（形态 II）

**参考图**：同语料 2 张，取暗化崩解那版
**原型来源**：梗鲸档案馆 `aigengtu.com/GPT娘`

```
anime villain portrait, same blonde twin-tailed demon girl, darkened and corrupted,
dissolving outline, glitching pixels, black and red palette, half body, facing right,
flat cel shading, clean lineart, no text, no watermark,
solid pure white background, centered
```

---

# 四、敌人与 Boss 的动画帧

敌人只需 **2 帧**：待机 + 受击。Boss 需 **2 帧**：待机 + 攻击。

提示词在基础描述后追加姿势：

| 用途 | 追加片段 |
| --- | --- |
| 受击 | `hit reaction, flinching backward, flash pose` |
| 攻击 | `attacking, lunging forward, weapon raised` |

---

# 五、背景（4 层视差 + 12 关变体）

## 5.1 四层基础视差

尺寸 **1920×1080**，**可横向无缝平铺**，无角色。

```
industrial cyberpunk cityscape, {LAYER}, pixel art style,
limited palette of dark teal and warm ochre, no characters, no text,
seamless horizontal tiling, flat colors
```

**参考**：`assets/backgrounds/` 现有 4 张 CC0 视差图，直接沿用其配色与密度

| 层 | `{LAYER}` |
| --- | --- |
| 天空 | `distant sky with heavy clouds and a dim sun, no buildings` |
| 远景 | `far background building silhouettes, low detail, hazy` |
| 中景 | `midground factory buildings with lit windows and pipes` |
| 前景 | `foreground girders and pipes, high detail, very dark` |

## 5.2 各关氛围（在当前 4 层基础上调色即可，不必重画）

| 关卡 | 氛围 |
| --- | --- |
| 1 码头晨雾 / 2 锈铁回廊 / 3 悬空栈道 | 冷青 + 晨雾 |
| 4 审计者（Boss） | 冷青 + 橙高光 |
| 5 冷却管廊 / 6 阵列机房 / 7 熔炉区 | 青碧 + 暖橙 |
| 8 改写者（Boss） | 赤红 + 黑 |
| 9 坍塌档案库 / 10 镜像回廊 / 11 垂直井 | 灰蓝 + 暗紫 |
| 12 涌现（Boss） | 暗红 + 崩解紫 |

---

# 六、武器图标（10 把）—— ✅ 已生成，待接入

尺寸 **128×128**，透明背景或纯白。

**参考**：`assets/official/meme-*/` 里角色手持的武器（如 DeepSeek 的能量炮）。
武器图标要与角色实际持握的武器**造型一致**，不能图标是一把枪、游戏里射出的是光球。

```
game weapon icon, {WEAPON}, top-down or side view, flat cel shading,
clean lineart, no text, no watermark, solid pure white background, centered
```

| 编号 | 名称 | `{WEAPON}` |
| --- | --- | --- |
| `pulse` | 脉冲弹 | `simple energy pistol with a blue glowing barrel` |
| `scatter` | 扩散散弹 | `wide-barreled shotgun with a spread muzzle` |
| `rifle` | 长程连射 | `long slim rifle with a scope` |
| `homing` | 追踪弹幕 | `launcher with three curved homing missile tubes` |
| `pierce` | 穿甲弹 | `heavy armor-piercing cannon with a pointed barrel` |
| `cluster` | 集束炸弹 | `cluster bomb launcher with multiple small barrels` |
| `laser` | 激光枪 | `sleek laser rifle with a focusing crystal` |
| `grenade` | 散射榴弹 | `grenade launcher with a revolving drum` |
| `replay` | 回溯弹 | `ornate pistol with clock-like gears and a glowing mark` |
| `prism` | 棱镜弹 | `crystal prism cannon refracting light into colors` |

---

# 七、界面素材 —— ✅ 已生成，待接入

## 7.1 角色头像（HUD 与选角用）

尺寸 **256×256**，方形，头肩构图。

```
chibi anime character portrait, {CHARACTER}, head and shoulders, facing slightly right,
flat cel shading, clean lineart, no gradients, no text, no watermark,
solid pure white background, centered
```

`{CHARACTER}` 填各自的识别特征（同第一章）。

## 7.2 通关印章

尺寸 **512×512**，透明或纯白。

```
riso print style stamp, circular, {TEXT}, vermillion red ink texture,
two-color print, grain, no gradients, solid white background
```

| 用途 | `{TEXT}` |
| --- | --- |
| 通关 S 级 | `S RANK` |
| 通关 A 级 | `A RANK` |
| 通关 B 级 | `B RANK` |
| 关卡完成 | `CLEAR` |

---

# 八、验收标准

## 8.1 每张图必查

- [ ] **无任何文字、水印、签名**（上一批全部带「Qoder AI 生成」，必须避免）
- [ ] 纯白背景，无渐变、无投影
- [ ] 角色**占画面高度 90%±2%**（用脚本量 bbox，不是目测）
- [ ] 朝向正确（角色朝右、敌人朝左）
- [ ] 线稿粗细与已有素材一致

## 8.2 同一角色的多帧必查

- [ ] 发色**同一色值**
- [ ] 头身比一致（2 头身）
- [ ] 标志配件都在
- [ ] 服饰细节一致（裙长、围裙位置）

## 8.3 我这边会做的后处理

图到位后我会执行：

1. **白底转透明**（阈值抠图 + 边缘羽化）
2. **bbox 归一化**（消除帧间高度差）
3. **打包精灵表**（等宽帧，供 Phaser 播放）
4. **接入动画管线**（`assets/animated.ts` 已就绪）

---

# 九、优先级与批量策略

| 优先级 | 内容 | 数量 | 状态 |
| --- | --- | --- | --- |
| ~~P0~~ | ~~DeepSeek 全套动作帧~~ | ~~9~~ | ✅ **已完成** |
| ~~P1~~ | ~~其余 5 角色动作帧~~ | ~~45~~ | ✅ **已完成**（实得 75 帧，超出计划） |
| ~~P2~~ | ~~10 种敌人各 2 帧~~ | ~~20~~ | ✅ **已生成并接入** |
| ~~P3~~ | ~~4 个 Boss~~ | ~~4~~ | ✅ 已生成，⏸ 待接入 |
| ~~P4~~ | ~~10 个武器图标~~ | ~~10~~ | ✅ 已生成，⏸ 待接入 |
| ~~P5~~ | ~~6 个 HUD 头像~~ | ~~6~~ | ✅ 已生成，⏸ 待接入 |
| ~~P6~~ | ~~4 层背景~~ | ~~4~~ | ✅ 已接入 |
| ~~P7~~ | ~~4 个通关印章~~ | ~~4~~ | ✅ 已生成，⏸ 待接入 |

**素材生产阶段结束。** 全部 P0~P7 已生成完毕，
剩下的是接入工作，见 [M6 里程碑](/game/tasks/m6-variants-motion) T-M6-19 ~ 22。

---

# 十、已存在的问题与对策

| 问题 | 现状 | 对策 |
| --- | --- | --- |
| 水印 | 上一批全部带「Qoder AI 生成」 | 提示词加 `no watermark`；若仍有，告诉我位置，我裁掉 |
| 背景不透明 | RGBA 但 alpha 全 255，白底 | 我来抠图，你不必处理 |
| 高度不一致 | 89%~96% 浮动 | 提示词明确 90%；我再用 bbox 归一化兜底 |
| 动作帧数不足 | attack 只有 1 帧 | 按本文的帧数要求补 |

---

## 追溯

本文件实现：REQ-GUN-001 与全部美术资源的产出规范

相关：[动作帧提示词](/game/design/sprite-prompts) · [形象与骨骼调研](/game/design/animation-research) · [角色规格](/game/requirements/characters) · [美术风格指南](/game/design/art-style)
