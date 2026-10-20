---
title: 快速开始
description: 从零到构建出完整工作区的最短路径
---

# 快速开始

## 环境要求

| 工具 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | `>= 20.19.0` | 需支持 `--experimental-strip-types` 相关的现代运行时特性 |
| pnpm | `>= 9.0.0` | 本仓库锁定 `pnpm@11.28.5`，见 `package.json` 的 `packageManager` |
| Git | 任意近期版本 | 提交历史与分支管理 |

> **提示** — 推荐使用 [corepack](https://nodejs.org/api/corepack.html) 跟随仓库锁定的 pnpm 版本：
> ```bash
> corepack enable
> corepack use pnpm@11.28.5
> ```

## 克隆与安装

```bash
git clone <your-repo-url> contra
cd contra
pnpm install
```

`pnpm install` 会在 `pnpm-workspace.yaml` 定义的范围内安装所有依赖，
并把 `@contra/core` 以工作区链接的方式挂到 `packages/cli` 上——
**不需要** `npm link`，也不需要发布到 registry。

## 跑起来

```bash
# 启动文档开发服务器（默认 http://localhost:5173）
pnpm docs:dev

# 运行全部测试
pnpm test

# 类型检查
pnpm typecheck

# 完整校验：lint + typecheck + test + build
pnpm verify
```

## 试一试 CLI

```bash
# 通过工作区过滤器运行
pnpm --filter @contra/cli exec node dist/index.js version

# 或者先构建，再直接执行
pnpm --filter @contra/cli run build
node packages/cli/dist/index.js doctor
```

预期输出：

```text
contra 0.1.0
```

`doctor` 子命令会打印运行时诊断信息：

```text
contra doctor
node: v24.21.0
workspace: pnpm
```

## 目录速查

```text
contra/
├── apps/
│   └── docs/              # VitePress 文档系统
├── packages/
│   ├── core/              # @contra/core
│   └── cli/               # @contra/cli
├── package.json           # 工作区根
├── pnpm-workspace.yaml    # 包拓扑定义
└── tsconfig.base.json     # 共享编译选项
```

## 下一步

- 想了解每个配置文件的作用 → [Monorepo 结构](/guide/monorepo)
- 想给文档加一页 → [编写文档](/guide/docs-system)
