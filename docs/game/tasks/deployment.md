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

| 项 | 大小 | 预算 |
| --- | --- | --- |
| 游戏首包 | **7.14 MB** | ≤ 8 MB ✅ |
| ├ 音频 | 5.62 MB | |
| ├ JS | 1.26 MB | |
| └ 美术 | 0.26 MB | |

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
