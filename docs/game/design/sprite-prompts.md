---
title: 动作帧生成提示词
description: 用生图 agent 生成 DeepSeek 娘动作序列帧的提示词与验收标准
---

# 动作帧生成提示词

> 用途：在**可生图的 agent** 里生成 DeepSeek 娘的动作帧，替换临时使用的希腊战士素材
> 追溯：REQ-GUN-001 · [形象与骨骼调研](/game/design/animation-research)

## 为什么需要这份文档

免费 API（Pollinations）能出图，但有两个硬伤：

1. **限流 45 秒/张**，且分辨率固定 512×768，做不了精细控制；
2. **跨动作一致性差** —— 换姿势时发型、配色、服饰细节会漂移。

所以改由能生图的 agent 产出。下面的提示词针对「一致性」这个核心难点设计。

## 角色设定（必须逐条写进提示词）

| 项 | 设定 |
| --- | --- |
| 发色 | 深蓝（接近 #2b5fa8），长发过腰 |
| 头饰 | 白色女仆头饰（frilled white maid headdress） |
| 服饰 | 蓝色连衣裙 + 白色围裙 |
| 特征 | **呆毛（ahoge）**、**鲸鱼头鳍**、**鲸尾**、围裙上的鲸鱼印花 |
| 体型 | Q 版，约 2 头身 |
| 风格 | 平涂赛璐璐，干净线稿，无渐变阴影 |

## 提示词模板

```
chibi anime girl, 2-head-tall proportions, long deep blue hair past waist,
single ahoge on top, small whale fin on head, whale tail, white frilled maid
headdress, blue dress with white apron, small whale print on apron,
{POSE}, side view facing right, full body, feet visible,
flat cel shading, clean lineart, no gradients, no shadow on ground,
solid pure white background, game sprite, centered
```

把 `{POSE}` 替换成下表的姿势。**其余部分一字不改**，这是保持一致性的关键。

## 五个动作的 POSE 片段

| 动作 | 帧数 | `{POSE}` 填写 | 要点 |
| --- | --- | --- | --- |
| Idle | 3（循环） | `standing idle, arms relaxed at sides, slight breathing pose` | 脚并拢，重心居中 |
| Walk | 4（循环） | `walking forward, left leg forward, right arm forward` | 侧身，双腿分开 |
| Attack | 4 | `attacking, swinging a sword horizontally in front, dynamic lunge pose` | **最关键**，见下方说明 |
| Jump | 2 | `jumping upward, knees bent, arms raised` | 离地，无地面接触 |
| Hurt | 1 | `staggering back, head tilted, one arm up defensively` | 仅一帧 |

## Attack 的关键提示

需求是「拿枪动作不同」，但现有武器是**光弹**，没有枪械模型。两种处理：

**方案 1（推荐）**：让角色**手持一把抽象能量炮**，与光弹世界观一致：

```
attacking, holding a glowing energy cannon with both hands, aiming forward,
recoil pose, body leaning back slightly
```

**方案 2**：空手释放能量，靠体态表达动作：

```
attacking, thrusting both palms forward, energy gathering at hands, dynamic lunge
```

不要把武器画成枪械或刀剑 —— 游戏里武器是光弹，画出实体枪会和实际子弹脱节。

## 技术规格

| 项 | 要求 | 原因 |
| --- | --- | --- |
| 分辨率 | 每帧 **512×512** | 游戏内显示约 40×58px，512 足够且不浪费 |
| 背景 | **纯白 #FFFFFF** | 需抠图，纯白最容易 |
| 角色高度 | 占画面 **80%** | 留出摆动余量，多帧拼接时不裁切 |
| 朝向 | **一律面朝右** | 代码里左右翻转复用，不用生成两套 |
| 格式 | PNG | 需透明通道 |

## 一致性检查清单

生成后**逐条核对**，任何一条不符合就重生成该帧：

- [ ] 发色与上一帧完全一致（不是「接近」，是同一色值）
- [ ] 呆毛、头鳍、鲸尾三个特征都在
- [ ] 围裙的鲸鱼印花没丢
- [ ] 头身比一致（都是 2 头身，不能有的 1.5 有的 3）
- [ ] 线稿粗细一致
- [ ] 角色高度占画面比例一致（80%）
- [ ] 全部面朝右

**最容易出问题的是头身比和发色**：换动作时模型倾向于把角色画「成熟」一点。
如果出现，在提示词里加强：`very important: exactly 2-head-tall chibi proportions, small body, large head`。

## 交付方式

把生成的图按这个结构放入仓库：

```
docs/game/requirements/assets/animated/deepseek/
  idle-00.png  idle-01.png  idle-02.png
  walk-00.png  walk-01.png  walk-02.png  walk-03.png
  attack-00.png  attack-01.png  attack-02.png  attack-03.png
  jump-00.png  jump-01.png
  hurt-00.png
```

我会写脚本把它们打包成精灵表，接进现有的动画管线 —— 
代码侧已经就绪（`packages/game-web/src/assets/animated.ts`），只等图。

## 备选：先用 Q 版图库里的现成形象

仓库里已有 57 张梗图（`assets/official/meme-deepseek/`），
其中部分是同一角色的不同表情。如果生图一致性始终不达标，
可以退而求其次：**用这些表情图做「状态切换」而非「动作动画」** ——
站立时是一张，开火时换成表情更凶的一张，受伤时换成哭脸。

这不需要新素材，代码量约 40 行，效果不如真动画但比静止贴图强。

## 追溯

本文件实现：REQ-GUN-001 的素材产出规范

相关：[形象与骨骼调研](/game/design/animation-research) · [素材署名](/game/design/credits) · [角色规格](/game/requirements/characters)
