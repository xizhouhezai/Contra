---
title: 贡献流程
description: 参与 Contra 项目的入口与提交前检查
---

# 贡献流程

本页是**参与入口**。完整的强制性规范见 [协作规范](/guide/conventions) ——
分支模型、版本发布、提交格式、文档纪律都在那里，不重复。

## 开始之前

```bash
git clone git@github.com:xizhouhezai/Contra.git
cd Contra
corepack enable
corepack use pnpm@11.28.5
pnpm install
```

## 一次典型的贡献

```text
1. 从 develop 切出 feature/optimize/fix 分支
2. 在分支上开发并提交（Conventional Commits，关联任务编号）
3. pnpm verify 四项全绿
4. 合入 develop 与 main
5. 切 release/vX.Y.Z 打 tag 并推送
6. 删除本地工作分支
```

每一步的命令细节见 [协作规范 §1](/guide/conventions)。

## 提交前检查

```bash
pnpm verify
```

这条命令依次执行 lint、类型检查、测试与构建。
**四项全绿再提 PR。**

| 命令 | 覆盖内容 |
| --- | --- |
| `pnpm lint` | Biome 静态检查与格式 |
| `pnpm typecheck` | 全工作区 TypeScript 类型检查 |
| `pnpm test` | 各包 vitest 单测 |
| `pnpm build` | 各包构建 + 文档站构建 |

改了 `docs/` 下的内容时，额外跑一次文档构建确认没有断链：

```bash
pnpm docs:build
```

VitePress 在构建时会检查内部链接，指向已删除页面的链接会直接让构建失败。

## 文档变更

文档遵循 [SDD 规范](/game/sdd-guide)：先改规格，再改实现。

| 你要改什么 | 改哪份文档 |
| --- | --- |
| 玩法、角色、关卡、数值 | [需求层](/game/requirements/) |
| 架构、模块、数据结构 | [技术架构](/game/design/architecture) |
| 里程碑与任务 | [任务拆解](/game/tasks/backlog) |
| 工具链与工程结构 | `docs/guide/` |

## 追溯

本文件实现：参与入口；强制规则见 [协作规范](/guide/conventions)

相关：[协作规范](/guide/conventions) · [SDD 规范](/game/sdd-guide) · [Monorepo 结构](/guide/monorepo)
