---
title: 贡献流程
description: 分支模型、提交规范与合并路径
---

# 贡献流程

## 分支模型

```text
master
  ├── develop
  │     ├── feature/xxx   → develop
  │     └── fix/xxx       → develop
  └── release/1.0.0       ← develop
```

- `master` —— 只接受来自 `release/*` 的合并，始终可发布。
- `develop` —— 集成分支，新功能与修复的默认目标。
- `feature/*`、`fix/*` —— 从 `develop` 切出。
- `release/*` —— 从 `develop` 切出，只接受修复。

## 提交规范

使用 Conventional Commits：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档变更 |
| `refactor` | 不改变行为的重构 |
| `test` | 测试 |
| `chore` | 构建、依赖、杂项 |

示例：

```text
feat(core): add compareVersions for semver ordering

Implements semver.org rule 11 so a prerelease sorts before its release.
```

## 提交前检查

```bash
pnpm verify
```

这条命令依次执行 lint、类型检查、测试与构建。
**四项全绿再提 PR。**

## 文档变更

改到 `docs/` 的内容时，单独跑一次文档构建确认没有断链：

```bash
pnpm docs:build
```

VitePress 在构建时会检查内部链接，指向已删除页面的链接会直接让构建失败。
