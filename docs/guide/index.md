---
title: 概览
description: Contra 工作区的整体形态与设计取舍
---

# 概览

Contra 是一个 **pnpm monorepo 工作区**。它把三类通常各自为政的资产收拢到同一棵树里：

| 目录 | 包名 | 角色 |
| --- | --- | --- |
| `packages/core` | `@contra/core` | 类型契约的源头：Result、语义化版本、事件总线 |
| `packages/cli` | `@contra/cli` | 消费 core 的命令行工具 |
| `docs` | `@contra/docs` | 由 VitePress 驱动的文档系统 |

## 为什么是 monorepo

三个包的版本必须一起走。CLI 依赖 core 的**类型**，文档描述 core 的**行为**——
一旦它们分仓，任何一次 core 的签名变更都会立刻变成一次跨仓发布协调。

放在同一个工作区里：

- 类型变更由 TypeScript 项目引用（project references）沿依赖链传播，改动范围一眼可见。
- 版本号统一，文档站与被文档的代码不可能对不上。
- CI 只需一条命令：`pnpm verify`。

## 依赖方向

```text
@contra/cli  ──────▶  @contra/core
@contra/docs ──────▶  全部包
```

依赖是单向的。core 不认识 cli，docs 不被任何包依赖。
这条规则让 core 保持为纯粹的类型与逻辑层，可以被任何数量的上层复用。

## 核心约定

### 失败用 Result 表达，不用异常

`Result<T, E>` 是一个判别联合。调用方必须写出失败分支，
`if (result.ok)` 之外的路无法被静默跳过。

```ts
import { isOk, ok, err } from '@contra/core'

const parsed = parse(input)
if (!isOk(parsed)) {
  // 这里必须处理失败
  return err(parsed.error)
}
```

### 包的入口只有一个

每个包通过 `exports` 字段声明唯一入口。深层导入（`@contra/core/src/result.ts`）
不是公开 API，跨包引用只走 `@contra/core`。

### 文档与代码同仓

文档站位于 `docs`，作为工作区的一个包参与构建与校验。
文档里出现的每一个包名、每一个脚本命令，都应该是真实可执行的。

## 下一步

- [快速开始](/guide/getting-started) — 五分钟跑起来
- [Monorepo 结构](/guide/monorepo) — 目录与配置的逐项说明
- [协作规范](/guide/conventions) — 分支模型、版本发布、提交与文档纪律
- [编写文档](/guide/docs-system) — 如何给这个系统加一页
