---
title: 部署说明
description: 静态站自托管部署步骤与产物结构
---

# 部署说明

> 追溯：T-M5-08 ｜ 约束：**资源全部自托管，不依赖第三方 CDN**（REQ-NFR-021）

本项目产出**两个独立的静态站**，都只需一个 HTTP 静态服务即可运行，无需后端。

## 产物结构

| 站点 | 命令 | 产物目录 | 说明 |
| --- | --- | --- | --- |
| 文档站 | `pnpm docs:build` | `docs/.vitepress/dist/` | 规格文档、指南 |
| 游戏 | `pnpm --filter @contra/game-web build` | `packages/game-web/dist/` | 可玩游戏 |

两者可部署到同一个域名下的不同路径，也可分开部署。

## 构建

```bash
# 全量校验（提交前必跑）
pnpm check

# 分别构建
pnpm docs:build
pnpm --filter @contra/game-web build
```

## 体积现状

**产物总体积**（`packages/game-web/dist/`，2026-10-30 实测）：

| 类型 | 大小 | 文件数 | 何时下载 |
| --- | --- | --- | --- |
| 全部产物 | **47.47 MB** | 406 | — |
| ├ 美术 `.webp` | 24.19 MB | 263 | 按需（进关卡才取对应关卡的四层视差） |
| ├ 音频 `.ogg` | 21.72 MB | 35 | 按需（音乐在进关卡时才入队） |
| └ JS | 1.56 MB | 106 | 按需（动态 import 的场景代码） |

**首包**（启动必需，进标题页前强制下载的部分）：

| 项 | 大小 | 预算 |
| --- | --- | --- |
| 首包合计 | **3.86 MB** | ≤ 8 MB ✅ |
| ├ 美术 | 3.05 MB | |
| ├ JS | 0.56 MB | |
| └ 音频 | 0.25 MB | |

> 两个数字都要看：**首包 3.86MB 是玩家等���的量**，47.47MB 是玩家最终可能下载的总量
> （12 关全部玩过 + 每关的音乐 + 梗图）。口径由 `scripts/check-first-load.mjs` 给出，
> 它数的是 index.html 的 ESM 静态导入图，不是目录大小。

**sourcemap 默认不生成**。需要调试时：

```bash
CONTRA_SOURCEMAP=1 pnpm --filter @contra/game-web build
```

## 部署方式

任何静态文件服务都可以。三种常见做法：

### 1. 本地预览

```bash
pnpm docs:preview
pnpm --filter @contra/game-web preview
```

### 2. 静态托管（Vercel / Netlify / Cloudflare Pages）

| 项 | 文档站 | 游戏 |
| --- | --- | --- |
| 构建命令 | `pnpm docs:build` | `pnpm --filter @contra/game-web build` |
| 输出目录 | `docs/.vitepress/dist` | `packages/game-web/dist` |

两个站若在同一个项目里，把它们分别部署为两个目标即可。

### 3. 自建 Nginx

```nginx
server {
  listen 80;
  server_name contra.example.com;

  # 文档站
  location / {
    root /var/www/contra/docs;
    try_files $uri $uri/ /index.html;
  }

  # 游戏
  location /game/ {
    alias /var/www/contra/game/;
    try_files $uri $uri/ /game/index.html;
  }

  # 音频与图片体积较大，开启长缓存
  location ~* \.(ogg|webp|png|mp3)$ {
    root /var/www/contra;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

> **不要**把音频或图片外链到任何 CDN。
> 全部资源已由 `import.meta.glob` 打包进产物，外链会同时违反 REQ-NFR-021 和隐私要求（REQ-NFR-006）。

## 自托管核验

每次发布前跑一次，确认没有引入外部依赖：

```bash
node scripts/check-selfhosted.mjs
```

该脚本扫描 `packages/*/src` 下全部源码，列出所有非本地的 http(s) 链接。
输出 `OK: 无第三方 CDN 依赖` 才算通过。

## 跨浏览器核验

发布到静态托管前，各浏览器引擎都要跑一遍关键路径：

```bash
node scripts/check-browsers.mjs
```

它用同一段脚本（进关卡 → 触发波次 → 战斗）在每个引擎上跑，收集
console 错误、pageerror、未处理的 Promise 拒绝与失败请求。

| 引擎 | 来源 | 覆盖 |
| --- | --- | --- |
| Chromium（Chrome） | 本机 | ✅ |
| Chromium（Edge） | 本机 | ✅ |
| WebKit（Safari 内核） | `npx playwright install webkit` | ✅ |
| Gecko（Firefox） | `npx playwright install firefox` | 视机器 |

> **跳过的引擎不算通过。** 脚本会明确列出跳过了哪些、以及缺什么条件，
> 避免「本机只有 Chromium」被当成「四浏览器已验证」。
>
> Firefox / WebKit 的浏览器本体不在 Playwright 的 npm 包里，要单独下载；
> 仓库依赖里不包含 Playwright，脚本直接去 pnpm 的虚拟存储里找它，
> 以免为了一个检查工具给项目加一条依赖。

## MIME 类型

静态服务必须正确返回 `.ogg` 为 `audio/ogg`，否则部分浏览器不播放：

```nginx
types {
  audio/ogg ogg;
  image/webp webp;
}
```

## 缓存策略

| 资源 | 策略 | 理由 |
| --- | --- | --- |
| `index.html` | `no-cache` | 必须拿到新版本 |
| `assets/*`（带 hash） | `immutable, 30d` | 文件名含内容 hash，可永久缓存 |

## 未做的事

- **CI 未配置** —— 用户明确要求暂不处理。当前 `pnpm check` 需手动执行
- **自动化部署未配置** —— 上表的构建命令可接任何平台的 Git 集成

## 追溯

本文件实现：T-M5-08 部署与发布

相关：[协作规范](/guide/conventions) · [非功能核对](/game/tasks/nfr-checklist)
