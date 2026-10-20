---
title: 常见问题
description: 安装、构建与协作中的高频问题
---

# 常见问题

## `pnpm install` 报 `ERR_PNPM_OUTDATED_LOCKFILE`

锁文件与 `package.json` 不同步。删掉锁文件重装，或执行：

```bash
pnpm install --no-frozen-lockfile
```

## `@contra/core` 找不到模块

多半是工作区链接没建立：

```bash
pnpm install
```

如果用了 `--filter` 安装，确保装的是全部包而不是单个包，
否则 cli 的 `workspace:*` 依赖无法被链接。

## 类型检查报 `Cannot find module '@contra/core'`

core 还没构建，`dist/index.d.ts` 不存在：

```bash
pnpm --filter @contra/core run build
```

或者一次性：

```bash
pnpm build
```

## 端口被占用

```bash
pnpm docs:dev --port 5174
```

## 文档图片不显示

图片必须放在 `docs/public/` 下，并用根路径引用：

```md
![图](/images/foo.png)
```

放在 `guide/` 目录下的图片**不会**被 VitePress 自动复制到产物。

## 怎么只跑某一个包的测试

```bash
pnpm --filter @contra/core test
```

或进入目录直接跑 vitest：

```bash
cd packages/core && pnpm vitest
```

## 构建产物在哪里

| 包 | 产物目录 |
| --- | --- |
| `@contra/core` | `packages/core/dist/` |
| `@contra/cli` | `packages/cli/dist/` |
| `@contra/docs` | `docs/.vitepress/dist/` |

前两个已在 `.gitignore` 中忽略；文档站的构建产物同理。

## 如何本地预览构建后的文档站

```bash
pnpm docs:build
pnpm docs:preview
```
