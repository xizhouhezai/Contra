---
title: Monorepo 结构
description: 目录布局、配置文件职责与构建拓扑
---

# Monorepo 结构

## 目录布局

```text
contra/
├── apps/
│   └── docs/                       # @contra/docs —— VitePress 文档站
│       ├── .vitepress/
│       │   ├── config.mts          # 站点配置：导航、侧边栏、搜索
│       │   └── theme/
│       │       ├── index.ts        # 主题入口，扩展默认主题
│       │       ├── style.css       # 设计语言：纸面、墨色、字体
│       │       └── components/      # 自定义组件
│       ├── public/                 # 静态资源，根路径引用
│       ├── guide/                  # 指南
│       ├── api/                    # API 参考
│       ├── examples/               # 示例
│       └── index.md                # 首页
├── packages/
│   ├── core/                       # @contra/core
│   │   ├── src/                    # 源码，产出 dist/
│   │   ├── test/                   # vitest 测试
│   │   └── tsconfig.typecheck.json # 含测试的全量类型检查
│   └── cli/                        # @contra/cli
│       ├── src/
│       ├── test/
│       └── tsconfig.typecheck.json
├── package.json                    # 根：脚本聚合与共享 devDependencies
├── pnpm-workspace.yaml             # 包发现范围与构建白名单
├── tsconfig.base.json              # 共享编译选项
├── tsconfig.json                   # 根项目引用
├── biome.json                      # lint / format 配置
└── .gitignore
```

## 关键配置文件

### `pnpm-workspace.yaml`

声明哪些目录是工作区成员，以及哪些依赖允许执行安装脚本。

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

allowBuilds:
  esbuild: true
```

::: tip 为什么是 `allowBuilds`
pnpm 10 之后用 `onlyBuiltDependencies`；pnpm 11 改用 `allowBuilds`，
后者能精确到单个包的布尔开关。两者都会被读取，但 `allowBuilds` 优先。
:::

### `tsconfig.base.json`

所有包共享的编译选项。关键几项：

| 选项 | 值 | 原因 |
| --- | --- | --- |
| `module` / `moduleResolution` | `NodeNext` | 强制 ESM 语义与显式 `.js` 扩展名 |
| `strict` | `true` | 全量严格模式 |
| `noUncheckedIndexedAccess` | `true` | 数组下标访问不再假定非空 |
| `exactOptionalPropertyTypes` | `true` | `{ a?: string }` 不接受 `{ a: undefined }` |
| `verbatimModuleSyntax` | `true` | 类型导入必须用 `import type` |
| `composite` | `true` | 开启 project references 增量构建 |

### `tsconfig.json`（根）

只做一件事：把引用指向各个包，供编辑器与 CI 做全图类型检查。

```json
{
  "files": [],
  "references": [{ "path": "./packages/core" }, { "path": "./packages/cli" }]
}
```

### 构建与类型检查分开

每个包有两份 tsconfig：

| 文件 | 用途 | 关键选项 |
| --- | --- | --- |
| `tsconfig.json` | 产出 `dist/` | `composite: true`, `rootDir: src` |
| `tsconfig.typecheck.json` | 检查 `src/` + `test/` | `noEmit: true`, `composite: false` |

类型检查用 `noEmit`，所以 `dist/` 里不会混进测试产物。

### 构建拓扑

`packages/cli/tsconfig.json` 引用了 `packages/core/tsconfig.json`：

```json
{
  "references": [{ "path": "../core" }]
}
```

因此 `tsc -b` 知道依赖顺序：先构建 core，再构建 cli。
**core 改动后，cli 会被自动重建**，不需要手动排序脚本。

## 脚本一览

根 `package.json` 用 `-r`（递归）把脚本分发到所有包：

| 脚本 | 实际执行 | 说明 |
| --- | --- | --- |
| `pnpm build` | `pnpm -r run build` | 按拓扑顺序构建全部包 |
| `pnpm test` | `pnpm -r run test` | 各包跑自己的 vitest |
| `pnpm typecheck` | `pnpm -r run typecheck` | 全工作区类型检查 |
| `pnpm docs:dev` | 过滤到 `@contra/docs` | 启动文档开发服务器 |
| `pnpm docs:build` | 过滤到 `@contra/docs` | 构建静态站点 |
| `pnpm verify` | 串联 lint / typecheck / test / build | CI 入口 |
| `pnpm lint` | `biome check .` | 静态检查 |
| `pnpm format` | `biome format --write .` | 自动格式化 |

## 依赖声明规则

工作区内互相引用时**必须**用 `workspace:` 协议：

```json
{
  "dependencies": {
    "@contra/core": "workspace:*"
  }
}
```

这样 pnpm 永远不会尝试从 registry 下载 `@contra/core`，
发布时 `workspace:*` 会被替换成实际版本号。

::: warning 别把 `workspace:` 用在普通依赖上
`workspace:` 只能用于**工作区里的包**。像 `typescript`、`vitest` 这类
从 registry 安装的第三方依赖必须写具体版本号，否则 pnpm 会报
`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`。
:::
