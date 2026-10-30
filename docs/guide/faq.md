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

## CodeBuddy 模型报「Illegal API invocation from an unapproved channel」

这就是 `400 / code 11128`。它**不是**普通 API 错误，而是上游网关对**出站请求内容**
做字面校验后，判定「不是官方客户端发来的」。本项目的宿主系统提示里有一段会被命中。

先跑健康检查，它会把「是账号问题还是打码问题」区分开：

```bash
node scripts/check-codebuddy.mjs
```

输出分两部分：

```
accounts : 2
  OK   workbuddy (active)   www.workbuddy.cn  1.8s
  FAIL cli                  copilot.tencent.com  HTTP 429 code=6004 …

using    : workbuddy (active) @ https://www.workbuddy.cn

  OK   1. 账号与端点                           1/2 个账号可用，使用 workbuddy
  OK   2. 真实系统提示（已打码）                HTTP 200 1.6s 回答="42"
  OK   3. 对照（不打码，应为 400）              HTTP 400 code=11128 —— 拦截仍在，打码是必需的
```

| 项 | 含义 | 失败说明什么 |
| --- | --- | --- |
| 1. 账号与端点 | 极简请求（与提示词无关） | 凭据过期或服务不可用，**先别怀疑打码** |
| 2. 真实系统提示（已打码） | 用当前会话的真实提示，经插件改写后发送 | 真实场景，历史上就是这项会挂 |
| 3. 对照（不打码，应为 400） | 同一份提示不打码 | 若意外返回 200，说明上游判据变了，插件的打码可能已无必要 |

第 3 项是刻意加的：它证明「打码仍然是在起作用的那一环」，而不是凭感觉假设。

### 本机配了两个账号，所以要逐个试

本机同时配置了 **WorkBuddy** 与 **CodeBuddy CLI** 两个账号，二者：

- **走不同的服务端点**（`www.workbuddy.cn` 与 `copilot.tencent.com`）——
  插件按账号的 `client` 字段分派，不是常量
- **发不同的客户端标识**——用错身份服务端也会受理，但用量会归因到错的客户端
- **独立限流**——其中一个被限流（`429 / code 6004`）时，另一个往往照常可用

所以健康检查会**逐个探测并自动选用可用的那个**。只看活跃账号会得到误导性的结论：
活跃账号在两个之间切换，而被限流的恰好可能是它。

> 2026-10-30 实测：CLI 账号 `429 code=6004`（提示 11:33 重置），
> WorkBuddy 账号正常，检查脚本因此报「1/2 个账号可用」并继续用后者完成第 2、3 项。

### 为什么会这样，以及修法

`~/.dsh/profiles/desktop/node_modules/@tnnevol/dsh-codebuddy/lib/index.js` 里有一组
`maskAtPathNotation` 等改写函数，在把系统提示发出去之前做替换。2026-10-29 定位到
触发点是系统提示里讲 `@path` 语法的那**整段**（单句都不触发，整段才触发）。

**上游换过判据，以后还会换**：10-28 是「ASCII `@`」，10-29 换成了「整段路径说明」。
所以这项检查里写了归因提示和下一步该怎么做。

如果第 2 项失败（打码后仍被拦），用段落二分重新定位，不要从零猜：

```bash
node .tmp/cb-probe.cjs A --users=0 --syspara=0:11 --notools --mt=64
```

把 `0:11` 换成更窄的区间逐步收缩，命中的那一段就是新的触发点，然后改插件的改写规则。

> **不要重装或升级 `@tnnevol/dsh-codebuddy`**。补丁是直接改在 `lib/index.js` 里的，
> 备份是 `index.js.bak-at-path-*`。插件一升级补丁即失效，第 2 项会立刻变红。

### 为什么会有脚本读会话日志

第 2、3 项需要「当前真实的系统提示」，脚本从 `~/.dsh/sessions/` 读最新会话的
`system/message` 事件，这样测的是**今天实际在发的内容**，不是某次复制粘贴后就腐烂的副本。
`--quick` 可跳过这一步，只查账号。
