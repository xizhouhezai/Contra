---
title: 示例
description: 动手改造这套文档系统
---

# 示例

这些页面演示如何扩展默认主题。每一页都对应一个可运行的文件，
改完刷新就能看到效果。

## 目录

- [自定义主题组件](/examples/custom-theme) — 在首页插槽里挂自定义 Vue 组件

## 开发循环

```bash
pnpm docs:dev
```

VitePress 会热更新。改 `.md` 立即生效；改 `.vue` 或 `.css` 会触发组件重载。

## 相关

- [编写文档](/guide/docs-system) — 添加页面的流程
- [设计语言](/guide/design-language) — 可复用的样式变量
