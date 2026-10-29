---
title: 待生成美术交付单 · 幕 II/III 中段小 Boss（8 只 × 4 帧）
description: 可直接交给生图 agent 的自包含作业单，含完整负向词、逐只外形否定项与验收标准
---

# 待生成美术交付单 · 幕 II/III 中段小 Boss

> **这份文档是自包含的。** 生图 agent 只需要拿到本文，不需要再翻其它文档。
> 每只的提示词块都可直接复制，负向词已写全（不写「见某节」）。

## 0. 先看这一段（给生图 agent）

你要画的是**八个 Boss 级敌人，每个四帧**，共 32 张图。

| 项 | 值 |
| --- | --- |
| 尺寸 | **360 × 360 像素**，四帧尺寸完全相同 |
| 帧数 | 每只 **4 帧**：`q-01` `q-02` `q-03` `q-04` |
| 背景 | **纯白 `#ffffff`**（后续脚本按白底抠图） |
| 输出 | 每只 4 个文件，命名见每只的「交付」行 |
| 主体占比 | 主体墨黑（`#1a1a1a`）**≥ 70%**，这是硬指标，会被脚本检测 |

### 四帧各自画什么

| 帧 | 语义 | 要求 |
| --- | --- | --- |
| `q-01` | 待机 | 站定，武器/肢体在自然垂放位置 |
| `q-02` | **起手（预警）** | 最能说明「要打过来了」的蓄力姿态。**这是玩家的反应窗口，必须一眼可读** |
| `q-03` | 出手 | 该只的招式正在打出，方向与判定一致 |
| `q-04` | 受击 | 后仰/错位/散架，看得出被打中了 |

### 三条硬约束（违反会被退回重画）

1. **主体必须够黑。** 墨黑占主体面积 ≥ 70%，纸色只做边缘高光。
   上一批因为没写死这条，四只敌人全部返工成了纸白色。
   → 每只的 `[配色]` 里已写死占比，照做。
2. **四帧必须同锚点。** 四帧的**脚底（或悬浮体的底缘）必须在同一行**，
   主体大小一致。只有上半身/手臂/武器可以有动作变化。
   否则武器一变大，本体就显得缩水，看起来像换了尺寸。
3. **零圆角。** 全部直角与锐角多边形；圆只允许出现在表盘、指示灯、网点上。

### 全局负向词（**每只都必须完整追加这一段**）

```text
no photorealistic, no 3D render, no glossy plastic, no soft blur,
no gradient mesh, no anime moe eyes on mechanical parts,
no text, no letters, no watermark, no logo, no signature,
no border, no frame, no drop shadow on the white background,
no rounded corners, no chibi proportions, no cute face
```

### 风格锚点

```text
Riso 印刷风：二次元立绘 + 硬边工业感 + 限量色
纸色 #f4f1ea / 墨黑 #1a1a1a / 朱红 #d6452c / 青碧 #1f6f6b / 赭黄 #c8901f
零圆角，粗黑描边，网点渐变，印刷错位感
```

> **已完成的参考**：幕 I 的四只中段小 Boss 用的就是这套规格，可直接对比风格。
> 它们的文件在 `docs/game/requirements/assets/minibosses/` 下：
> `miniboss-dock-foreman-q-0*.webp`、`miniboss-pipe-warden-q-0*.webp`、
> `miniboss-scaffold-crane-q-0*.webp`、`miniboss-audit-clerk-q-0*.webp`
> （各 22~48KB/帧）。新图应与它们并排看不出是两批人画的。

---

## 1. miniboss-coolant-overseer · 冷却监工

用在第 5 关「冷却管廊」。设计意图：**压力在积累**，压力表是它「要爆了」的可见化。

### 提示词

```text
[主体] 一点四倍人形的重型巡检员，胸前一具硕大的圆形压力表，
       背后拖两根粗冷却软管，右手是带阀门的扳手钳
[配色] 机体墨黑 #1a1a1a 占七成以上，压力表盘面赭黄 #c8901f、
       指针与超压区朱红 #d6452c，软管接口青碧 #1f6f6b，
       纸色 #f4f1ea 只做边缘高光与表盘刻度
[动作] 4 帧：
       q-01 待机（阀门半握，表针在绿区）
       q-02 起手（压力表指针打到红区，两根软管绷直鼓起）
       q-03 出手（双臂前推，软管喷口敞开）
       q-04 受击（后仰，软管脱手甩开）
[特征] 压力表的指针位置随四帧推进（绿→红），是它的「将要开打」信号
[外形否定] NOT a diver, no helmet glass, no round diving helmet,
       no oxygen tank backpack
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-coolant-overseer-q-01.webp
miniboss-coolant-overseer-q-02.webp
miniboss-coolant-overseer-q-03.webp
miniboss-coolant-overseer-q-04.webp
```

---

## 2. miniboss-array-warden · 阵列巡守

用在第 6 关「阵列机房」。设计意图：**从上方打**——它是浮着的，必须能看出没有腿。

### 提示词

```text
[主体] 悬浮的机架守卫：一个横置的刀片服务器阵列构成躯干，
       两侧伸出成排的短刃臂，下方没有腿，靠底部冷光悬浮
[配色] 机架墨黑 #1a1a1a 占七成以上，指示灯排用青碧 #1f6f6b，
       刃口与锁定光朱红 #d6452c，纸色只做机架面板的细边
[动作] 4 帧：
       q-01 待机（悬浮，刃臂收拢贴身）
       q-02 起手（正面指示灯全亮成一条横线，刃臂向外张开）
       q-03 出手（刃臂横扫掠过画面，带出朱红刃光）
       q-04 受击（机架倾斜，指示灯散乱）
[特征] 四帧都必须看得出「浮着」：躯干略微倾斜、下方有冷光/网点暗示悬停
[外形否定] NO legs, no feet, no standing pose, no ground contact,
       no shadow under the body, NOT a humanoid robot standing upright
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-array-warden-q-01.webp
miniboss-array-warden-q-02.webp
miniboss-array-warden-q-03.webp
miniboss-array-warden-q-04.webp
```

---

## 3. miniboss-forge-master · 熔炉匠长

用在第 7 关「熔炉区」。设计意图：**招式从上方落下**，起手帧要抬头就看见。

### 提示词

```text
[主体] 重型锻造师：上身粗壮的机械臂膀，右手持一柄长杆浇勺，
       左手提着一具小铁砧，腰以下接在轨道底座上（不走路，沿轨道平移）
[配色] 机体墨黑 #1a1a1a 占七成以上，浇勺里的熔液朱红 #d6452c
       到赭黄 #c8901f 的网点渐变，铁砧受热面赭黄，纸色只做高光
[动作] 4 帧：
       q-01 待机（浇勺垂地，熔液在勺内微微晃动）
       q-02 起手（举勺过头顶，熔液高举）
       q-03 出手（倾勺，熔液成柱向下浇落）
       q-04 受击（炉体后挫，熔液溅出）
[特征] 起手帧的勺位必须比待机帧明显抬高——玩家抬头就要看到它举起来了
[外形否定] NOT a blacksmith at a forge, no anvil in front on the ground,
       no hammer and tongs, no leather apron, no bare human face
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-forge-master-q-01.webp
miniboss-forge-master-q-02.webp
miniboss-forge-master-q-03.webp
miniboss-forge-master-q-04.webp
```

---

## 4. miniboss-redline-clerk · 红线书记

用在第 8 关「改写室」，紧接关底 Boss「改写者」。设计意图：
**它是改写者的同系统缩小版**，动作语言必须与之一致，不能画成杂兵。

### 提示词

```text
[主体] 瘦高的书记官：身披及踝长外套，右手一支巨型的红色批改笔
       （笔身比手臂长），左手托一本翻开的卷宗，宽檐帽的帽檐压住上半张脸
[配色] 外套与卷宗封面墨黑 #1a1a1a 占七成以上，批改笔与划出的红线
       朱红 #d6452c，卷宗纸页纸色 #f4f1ea，帽徽青碧 #1f6f6b
[动作] 4 帧：
       q-01 待机（笔尖悬在卷宗上方，帽檐阴影遮脸）
       q-02 起手（笔尖压到纸上，红线起笔，笔尖有朱红网点光）
       q-03 出手（一笔自左向右横贯画面，红线拉长）
       q-04 受击（卷宗散页，帽檐压低，身体后弓）
[特征] 体态是「克制、笔直、居高临下」，靠长外套与巨型笔建立压迫感
[外形否定] NOT a soldier, no rifle, no gun, no armor, no helmet visor,
       no school uniform, no pretty boy face, do not look like a common mob
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters on the scroll, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-redline-clerk-q-01.webp
miniboss-redline-clerk-q-02.webp
miniboss-redline-clerk-q-03.webp
miniboss-redline-clerk-q-04.webp
```

---

## 5. miniboss-archive-keeper · 档案看守

用在第 9 关「坍塌档案库」。设计意图：**两招都往脚下打**，
起手帧要让玩家看出「这块地不能站了」。

### 提示词

```text
[主体] 佝偻的看守：背部隆起如一座书架，脊上斜插着一排卷宗，
       双手各抓一叠待归档的厚纸页，脚踝拖着锁链
[配色] 躯体墨黑 #1a1a1a 占七成以上，卷宗切口青碧 #1f6f6b，
       锁链与封蜡朱红 #d6452c，纸页纯纸色 #f4f1ea
[动作] 4 帧：
       q-01 待机（纸页垂在身侧，背脊的卷宗整齐）
       q-02 起手（双臂高举过头，脊上卷宗离架浮起，重心下沉）
       q-03 出手（整叠纸页向下拍出，砸向脚下）
       q-04 受击（脊上卷宗散落，锁链绷直）
[特征] 体重感要重：重心低、动作向下。起手帧就能看出它要砸地
[外形否定] NOT a bookshelf, no furniture, no cabinet with doors,
       no treasure chest, no curved lid, no lock on a box body
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no readable text on the pages, no letters, no watermark, no logo,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

> **这条外形否定项是从返工里学来的**：幕 I 的「审计书记」是悬浮卷宗柜，
> 第一版被画成了宝箱（与宝箱房的图标混淆），加上
> 「NOT a treasure chest, no curved lid, no lock」才回到立式柜。

### 交付

```text
miniboss-archive-keeper-q-01.webp
miniboss-archive-keeper-q-02.webp
miniboss-archive-keeper-q-03.webp
miniboss-archive-keeper-q-04.webp
```

---

## 6. miniboss-mirror-lieutenant · 镜像副官

用在第 10 关「镜像回廊」。设计意图：**它会复制玩家的火力**，
起手帧要在镜面里映出第二道身影作为预告。

### 提示词

```text
[主体] 全身由镜面甲片拼成的人形副官，头盔是一整面无框镜面，
       右手持一柄极薄的直刃，甲片缝隙间透出撕裂的反光
[配色] 甲片墨黑 #1a1a1a 占七成以上，镜面反射用冷白与淡紫 #7b6cc4，
       刃口朱红 #d6452c，纸色只做镜面高光条
[动作] 4 帧：
       q-01 待机（刃垂手侧，镜面平静无裂）
       q-02 起手（镜面出现裂纹，镜中映出第二道模糊身影）
       q-03 出手（刃自右上向左下横扫，过处留下镜屑）
       q-04 受击（甲片错位，反光折断成几段）
[特征] q-02 的「镜中第二道身影」是它复制火力的视觉预告，必须能看出来
[外形否定] NOT a mirror on a wall, no ornate picture frame around the body,
       no knight in plate armor, no cape, no visible human skin
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-mirror-lieutenant-q-01.webp
miniboss-mirror-lieutenant-q-02.webp
miniboss-mirror-lieutenant-q-03.webp
miniboss-mirror-lieutenant-q-04.webp
```

---

## 7. miniboss-shaft-gaoler · 井道看守

用在第 11 关「垂直井」。设计意图：**全战役唯一纵向战斗**——
朝向是上下，不是左右。钩爪指向画面下缘，玩家在它脚下。

### 提示词

```text
[主体] 攀在井壁上的狱卒：四臂（上方两臂抓缆索，下方两臂持钩爪），
       躯干被一圈垂下的铁链缠住，整体呈纵向悬挂姿态
[配色] 躯体墨黑 #1a1a1a 占七成以上，缆索与铁链赭黄 #c8901f，
       钩爪与腰间的警示环朱红 #d6452c，纸色只做链节高光
[动作] 4 帧：
       q-01 待机（四臂张开稳住，钩爪收在胸前）
       q-02 起手（身体上提，钩爪向内收紧蓄力）
       q-03 出手（钩爪朝画面下方猛伸，铁链绷成直线）
       q-04 受击（链条甩开，一臂脱手）
[特征] 构图的动作轴是**竖向**：主体向上提、攻击向下打。
       不要画成横向站立的姿态
[外形否定] NOT a spider, no eight legs, no web, no insect body,
       no humanoid standing on the ground, no horizontal combat pose
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-shaft-gaoler-q-01.webp
miniboss-shaft-gaoler-q-02.webp
miniboss-shaft-gaoler-q-03.webp
miniboss-shaft-gaoler-q-04.webp
```

---

## 8. miniboss-emergence-herald · 涌现先驱

用在第 12 关「涌现」，是终局 Boss 前的最后一战。设计意图：
**全战役最强的小 Boss**，体量感要压过前面七只。

### 提示词

```text
[主体] 由悬浮立方体拼装的先驱：头是一枚缓慢自转的立方，
       躯干由更小的方块按网格聚拢，四肢是拉长的方框线框
[配色] 主体墨黑 #1a1a1a 占七成以上，方块边缘与线框青碧 #1f6f6b，
       接缝处的过载光朱红 #d6452c，不稳定处淡紫 #7b6cc4
[动作] 4 帧：
       q-01 待机（方块咬合紧密，体量收拢）
       q-02 起手（一块方块移位露出内部空隙，边角开始泛朱红）
       q-03 出手（方块向外增殖，体量撑大一圈，青碧线框扩张）
       q-04 受击（网格错位，边角碎片化飘离）
[特征] 体量是它的身份：比前面七只更厚重、更复杂。
       q-03 增殖帧显得比待机更大，但**底缘锚点不动**，不要整只往上飘
[外形否定] NOT a Rubik's cube, no colored sticker faces, no toy,
       no floating brain, no constellation map, no star field
[规格] 360×360 每帧，纯白底
[风格] Riso 印刷风，粗黑描边，零圆角
[负向] no photorealistic, no 3D render, no glossy plastic, no soft blur,
       no gradient mesh, no anime moe eyes on mechanical parts,
       no text, no letters, no watermark, no logo, no signature,
       no border, no frame, no drop shadow on the white background,
       no rounded corners, no chibi proportions, no cute face
```

### 交付

```text
miniboss-emergence-herald-q-01.webp
miniboss-emergence-herald-q-02.webp
miniboss-emergence-herald-q-03.webp
miniboss-emergence-herald-q-04.webp
```

---

## 9. 验收标准（交付方自检，也用于审图）

| 检查项 | 标准 | 怎么查 |
| --- | --- | --- |
| 尺寸 | 每帧严格 360×360 | 图像属性 |
| 帧数 | 每只 4 帧齐，文件名完全一致 | 对文件名 |
| 背景 | 纯白或透明，无灰底无渐变底 | 看四角 |
| **主体够黑** | 墨黑占主体 ≥ 70% | 肉眼 + 本仓 `scripts/report-miniboss-art.py` |
| **四帧同锚点** | 底缘同一行、主体缩放一致 | 四帧并排看 |
| 起手帧可读 | `q-02` 一眼看出要出手 | 遮住其它三帧单看 |
| 无文字 | 卷宗/纸页上不能有可读文字 | 放大看 |
| 无圆角 | 主体轮廓无圆角 | 看轮廓 |
| 每帧体积 | 应明显大于 5KB（占位图是 2~5KB，真图 22~41KB） | 文件属性 |

> 本仓有一键自检脚本，把图放到位后运行即可：
> ```bash
> python scripts/report-miniboss-art.py
> ```
> 它会逐只报 `painted` 还是 `placeholder`，12 只全部 `painted` 即通过。

## 10. 交付到哪里

把 32 个文件按上面的名字放进：

```text
docs/game/requirements/assets/minibosses/
```

**不需要改任何代码。** 该目录已被游戏按 `miniboss-<id>-q-0N` 的规则加载，
放进去即生效；`q-01`..`q-04` 对应待机/起手/出手/受击，
代码按序号取帧，不解析语义。

## 11. 追溯

本文件实现：REQ-STG-009（中段小 Boss 的正式美术目标）· REQ-GDD-001（美术方向）

相关：[批次 1 提示词](/game/design/stage-art-prompts-batch1) ·
[批次 2/3 提示词](/game/design/stage-art-prompts-batch23) ·
[美术风格指南](/game/design/art-style) ·
[美术资源总索引](/game/design/asset-index)
