---
title: 自定义主题组件
description: 在首页插槽中挂载自定义 Vue 组件
---

# 自定义主题组件

VitePress 的默认主题允许通过 **布局插槽** 注入自定义内容。
Contra 的首页就用到了两处插槽。

## 主题入口

`apps/docs/.vitepress/theme/index.ts`：

```ts
import { h, type Theme } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeHeroMark from './components/HomeHeroMark.vue'
import PackageTopology from './components/PackageTopology.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-info-before': () => h(HomeHeroMark),
      'home-features-after': () => h(PackageTopology),
    }),
} satisfies Theme
```

关键点：

- `extends: DefaultTheme` 保留默认主题的全部能力。
- `Layout` 用 `h()` 渲染，返回一个函数式组件。
- 插槽名以 `home-` 为前缀的属于首页专属。

## 可用插槽

| 插槽 | 位置 |
| --- | --- |
| `home-hero-info-before` | 标题区之前 |
| `home-hero-info` | 标题区 |
| `home-hero-actions-after` | 按钮组之后 |
| `home-hero-image` | 封面图位置 |
| `home-features-before` | 特性列表之前 |
| `home-features-after` | 特性列表之后 |

## 写一个组件

组件用 Vue SFC，放在 `theme/components/`：

```vue
<script setup lang="ts">
const pillars = ['类型安全', '可组合', '文档即代码']
</script>

<template>
  <div class="riso-kicker">
    <div class="riso-kicker__row">
      <span v-for="pillar in pillars" :key="pillar">
        {{ pillar }}
      </span>
    </div>
  </div>
</template>
```

样式建议用 `scoped` 局部隔离，或直接用设计语言里的全局变量：

```css
.riso-kicker__tag {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  background: var(--riso-ink);
  color: var(--riso-paper);
}
```

## 全局样式

`theme/style.css` 是全局样式表，在 `index.ts` 里用 `import './style.css'` 引入。
它承载了整套配色变量与组件样式，是本设计语言的单一来源。

## 试试看

把 `HomeHeroMark.vue` 里的 `pillars` 数组改掉，
首页标题上方的标签会立刻变化。
