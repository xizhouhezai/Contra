---
title: 素材署名
description: 本项目使用的全部外部素材的作者与许可证
---

# 素材署名

> CC BY-NC-SA 4.0 要求**署名原作者**。本页是完整清单，
> 游戏内「关于」页也应链接到此处。

## 本项目性质

**非商业同人作品。** 不收费、无内购、无广告、无众筹、无平台分成发行。
这条前提是所有 CC BY-NC-SA 素材可用性的基础 —— **一旦转为商业用途即失效**。

## 角色立绘

| 素材 | 作者 | 来源 | 许可证 |
| --- | --- | --- | --- |
| 蓝鲸娘（DeepSeek）原始形象 | @上善无形 | 原创角色「溟月」 | CC BY-NC-SA 4.0 |
| 蓝鲸娘 / Qwen / GLM / Kimi 立绘 | **ZipZipPipe** | B 站 UID 4168597 | CC BY-NC-SA 4.0 |
| Gemini / 各角色 Q 萌图 | 梗鲸档案馆收录，各作者 | `aigengtu.com` | 多为未声明 |
| 豆包形象 | 字节跳动 | `doubao.com` 官方素材 | 商标，非商业引用 |

## 音频

| 素材 | 作者 | 许可证 |
| --- | --- | --- |
| 战斗/数字/冲击音效（19 个） | **Kenney**（kenney.nl） | CC0 |
| BGM（6 首） | OpenGameArt 社区作者 | CC0 |

## 背景

| 素材 | 作者 | 许可证 |
| --- | --- | --- |
| 工业视差背景 4 层 | **Luis Zuno**（@ansimuz） | CC0 |

## 引擎与工具

| 项目 | 许可证 |
| --- | --- |
| Phaser 3 | MIT |
| VitePress | MIT |
| TypeScript / Biome / Vitest | Apache-2.0 / MIT / MIT |

## 无法确认作者的部分

`unknown-a05-cat-stars.webp`、`unknown-a06-sunflower.webp` 及部分梗鲸批量图
**无法确认原作者**。保留 `unknown-` 前缀而非猜测归属。

如果原作者看到并希望调整署名方式或移除，请通过仓库 issue 联系。

## 相同方式共享

依 CC BY-NC-SA 的 SA 条款，本项目的**角色美术与相关设定文档**
同样以 **CC BY-NC-SA 4.0** 提供。

代码部分不受此限（继承仓库原有许可证）。

## 追溯

本文件实现：CC BY-NC-SA 4.0 的署名义务

相关：[美术风格指南](/game/design/art-style) · [角色视觉参考](/game/requirements/character-references)

## 免费动画角色（CC BY 4.0）

项目需要真实动画帧时下载的素材。这是仓库里**唯一**有完整动作序列的角色。

| 项 | 值 |
| --- | --- |
| 素材 | Free Greek Character II 2D Animation |
| 作者 | **Krinwolf.com - Tony Puglieso** |
| 许可证 | **CC BY 4.0**（可商用，需署名） |
| 来源 | https://opengameart.org/content/free-greek-character-ii-2d-animation |
| 存放 | `docs/game/requirements/assets/free-animated/` |

### 包含的动作

| 动作 | 帧数 | 单帧尺寸 |
| --- | --- | --- |
| Idle | 18 | 362×586 |
| Walk | 12 | 423×577 |
| Attack | 8 | 1026×597 |
| Jump-Start | 11 | 455×759 |
| Die | 12 | 781×873 |

原包用 DragonBones 5.6.3 制作，含 `.dbproj` 工程文件（已一并归档）。
但 `.dbproj` 是 DragonBones 私有二进制格式，**无法在代码中解析**，
必须用其编辑器打开。因此项目实际使用的是导出好的 PNG 序列帧，
并已打包为精灵表。

> **重要限制**：这是持剑的希腊战士，**不是六个 AI 娘角色之一**。
> 它的作用是验证动画管线可行——证明角色可以真正攻击而不只是滑动。
> 若要换成 AI 娘，需要重画这套动作帧，不是改代码。
