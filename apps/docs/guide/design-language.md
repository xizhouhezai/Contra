---
title: 设计语言
description: Riso 技术手册风格的设计系统
---

# 设计语言

这套文档采用 **Riso 技术手册** 风格——灵感来自 50 年代丝网印刷工艺的
技术说明书：暖白纸面、双色油墨、细规则线、等宽标签，以及一点点套印不准的
手工感。

## 色彩

### 浅色主题

| 角色 | 色值 | 用途 |
| --- | --- | --- |
| 纸面 | `#f4efe6` | 页面底色 |
| 抬升纸面 | `#fbf7f0` | 卡片、代码块浮层 |
| 墨色 | `#1a1714` | 正文、标题 |
| 朱红 | `#d6452c` | 品牌色、强调、印章 |
| 青碧 | `#1f6f6b` | 提示、代码块左线 |
| 赭黄 | `#c8901f` | 警告 |

### 深色主题

深色不是浅色的反相，而是重新编排的一套纸墨关系：

| 角色 | 色值 |
| --- | --- |
| 纸面 | `#14120f` |
| 抬升纸面 | `#1e1b17` |
| 墨色 | `#f0e9dd` |
| 朱红 | `#f2705a` |
| 青碧 | `#5fb3ac` |
| 赭黄 | `#d9a83f` |

## 字体

| 用途 | 字体 | 理由 |
| --- | --- | --- |
| 展示 | Instrument Serif | 高对比衬线，带手写感，用于大标题 |
| 正文 | IBM Plex Sans | 工程感强，中文回退到苹方 / 微软雅黑 |
| 等宽 | IBM Plex Mono | 代码、标签、版本号 |

字体通过 `@fontsource` 自托管，不依赖 Google Fonts，
**离线构建也不会掉字**。

## 纹理

页面叠了两层纹理：

1. **颗粒噪点** — 固定定位的 SVG `feTurbulence`，浅色用 `multiply` 混合，
   深色用 `screen`，模拟纸张纤维。
2. **蓝图网格** — 用于封面与分节处的细网格线。

## 几何

- 圆角一律为 `0`。丝网印刷里没有圆角。
- 分隔用 1px 规则线，首页主标题用 3px 粗线。
- 卡片悬停时位移 2px，并露出 4px 硬阴影（`box-shadow: 4px 4px 0`），
   像纸张被轻轻抬起。

## 动效

克制，且尊重系统的减少动效偏好：

```css
@media (prefers-reduced-motion: reduce) {
  .riso-stamp { animation: none; }
}
```

首页的圆形印章从 `rotate(-24deg) scale(1.3)` 落到 `rotate(-11deg) scale(1)`，
模拟盖章动作。

## 主题实现

所有样式集中在 `apps/docs/.vitepress/theme/style.css`，
用 CSS 变量承载配色，因此切换明暗主题不需要额外的 JS。

新增组件时，优先复用已有的变量：

```css
.my-component {
  color: var(--riso-ink);
  border: var(--riso-rule);
  box-shadow: var(--riso-shadow-print);
}
```
