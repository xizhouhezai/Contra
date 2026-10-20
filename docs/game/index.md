---
title: 游戏规格
description: Contra 游戏项目的 SDD 规格集 —— 需求、设计、任务三层
---

# Contra 游戏规格

本页是 **Contra** 游戏的 **SDD（Spec-Driven Development，规格驱动开发）** 规格集入口。

SDD 的核心主张：**规格文档是唯一事实源**。代码是规格的实现，规格是代码的依据。
任何设计变更都必须先改规格，再改实现 —— 否则实现就成了新的事实源，文档随即腐烂。

## 三层结构

```text
需求层  requirements/   玩家要什么、关卡长什么样、角色能做什么
   │                     —— 定义「做什么」，不含「怎么做」
   ▼
设计层  design/         用什么技术做、模块怎么切、数据怎么存
   │                     —— 定义「怎么做」，每条设计都回指需求编号
   ▼
任务层  tasks/           按什么顺序把设计变成可运行的代码
                         —— 里程碑与任务，每个任务回指设计条目
```

追溯链是 SDD 的价值所在：改一条玩法 → 找到影响的设计 → 找到受影响的任务。
没有这条链，规格就只是三份互不相干的文档。

## 导航

### 需求层

| 文档 | 内容 | 需求编号前缀 |
| --- | --- | --- |
| [愿景与设计支柱](/game/requirements/vision) | 产品定位、核心体验、设计原则 | `REQ-VIS` |
| [玩法规格](/game/requirements/gameplay) | 核心机制、操作、战斗、武器、状态 | `REQ-PLY` |
| [角色规格](/game/requirements/characters) | 4 可选角色 + 4 终极 Boss | `REQ-CHR` |
| [关卡规格](/game/requirements/stages) | 12 关 3 幕、场景、Boss、机制 | `REQ-STG` |
| [游戏策划文档](/game/requirements/gdd) | 美术、音频、数值、流程、发行 | `REQ-GDD` |
| [非功能需求](/game/requirements/nonfunctional) | 性能、兼容、可访问性、隐私 | `REQ-NFR` |

### 设计层

| 文档 | 内容 |
| --- | --- |
| [技术架构](/game/design/architecture) | 分层、技术选型、运行时结构 |
| [模块设计](/game/design/modules) | 包划分、职责、接口边界 |
| [数据模型](/game/design/data-model) | 角色/关卡/武器/敌人的数据结构 |
| [跨端策略](/game/design/cross-platform) | Web 优先与移动端隔离 |
| [架构决策记录](/game/design/adr) | ADR-0001 ~ ADR-0005 |

### 任务层

| 文档 | 内容 |
| --- | --- |
| [里程碑](/game/tasks/milestones) | M0 ~ M5 的目标与出口标准 |
| [任务拆解](/game/tasks/backlog) | 按里程碑组织的可执行任务 |

## 已锁定的设计决策

以下决策已确认并记录在 [ADR](/game/design/adr) 中，后续规格变更需先改 ADR。

| 决策 | 结论 |
| --- | --- |
| 规格方法 | SDD 三层：需求 → 设计 → 任务 |
| Web 端技术栈 | Phaser 3 + TypeScript |
| 移动端 | 共享纯逻辑层 + 平台适配层，引擎可换 |
| 美术风格 | 二次元立绘 + 序列帧 |
| 阵容 | 4 可选角色（DeepSeek / Qwen / 豆包 / GLM）+ 4 终极 Boss（Claude / GPT 各两形态） |
| 关卡规模 | 12 关 / 3 幕 |
| 武器系统 | 4 槽共享 + 角色专属初始武器 |
| 联机 | 单人为主，双人合作机制预留但不在首发启用 |
| 文档位置 | `docs/game/`，与工程文档分区并列 |

## 与工程文档的关系

`docs/game/` 讲的是**游戏这个产品**；`docs/guide/` 讲的是**这个工作区本身**。
两者共用同一套工具链（TypeScript / Vite / Biome / vitest），但关注点不同。
