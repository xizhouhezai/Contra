---
title: 编写文档
description: 如何为这套 VitePress 系统增加页面
---

# 编写文档

## 新增一页指南

1. 在 `docs/guide/` 下创建 `your-page.md`
2. 写好 frontmatter
3. 在 `config.mts` 的 `themeConfig.sidebar` 里加上侧边栏条目

### frontmatter

```yaml
---
title: 快速开始
description: 从零到构建出完整工作区的最短路径
---
```

`title` 决定标签页标题与浏览器标题后缀。
`description` 用于 SEO 与首页摘要，**要写，不要省略**。

## 页面结构

VitePress 的一级标题建议留给 `# 标题`，目录层级从 `##` 开始。
侧边栏的「本页目录」会自动展示 `h2` 与 `h3`。

```md
# 页面标题

一段引言。

## 二级标题

正文。

### 三级标题

更多正文。
```

## 常用 Markdown 扩展

### 代码块

支持行高亮与文件名：

```ts{4-6}
import { isOk } from '@contra/core'

const result = await load()
if (isOk(result)) {
  console.log(result.value)
}
```

### 自定义容器

用三冒号包裹，内容渲染成带色条的提示块。
本套主题为 tip、warning、danger 三种容器配了青碧、赭黄、朱红三种油墨色。

::: tip 提示
在 monorepo 内引用包，用 `workspace:*` 协议。
:::

::: warning 注意
不要在 `main` 或 `develop` 上直接改代码 —— 任何改动都要先切分支。
详见 [协作规范](/guide/conventions)。
:::

::: danger 危险
删除 `pnpm-lock.yaml` 会让所有依赖重新解析，务必确认后再操作。
:::

### 表格

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `cleanUrls` | `boolean` | `false` | 去掉 `.html` 后缀 |
| `lastUpdated` | `boolean` | `false` | 显示最后更新时间 |
| `appearance` | `boolean` | `true` | 允许切换明暗主题 |

### 代码行高亮

在代码块语言的冒号后写出行号区间：

```ts{2}
const a = 1
const b = 2
const c = 3
```

## 侧边栏组织

侧边栏按路径前缀分组，一个前缀对应一棵独立的树：

```ts
sidebar: {
  '/guide/': [
    {
      text: '开始',
      collapsed: false,
      items: [
        { text: '概览', link: '/guide/' },
        { text: '快速开始', link: '/guide/getting-started' },
      ],
    },
  ],
}
```

分组标题里的 `collapsed` 控制初始折叠状态。
一级分组建议保持展开，让读者一眼看到全部章节。

## 搜索

站内搜索已启用（`provider: 'local'`），无需外部服务。
索引在构建时生成，页面内容变化后会自动重建。

自定义文案在 `themeConfig.search.options.translations` 里：

```ts
search: {
  provider: 'local',
  options: {
    translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
    },
  },
}
```

## 静态资源

放在 `docs/public/` 下，通过根路径引用：

```md
![架构图](/images/architecture.png)
```

`public/` 下的文件会被原样复制到产物根目录，不会经过处理。

## 写作约定

- 中文正文用全角标点，代码与标识符保持原样。
- 每一页开头一句话说清「这一页解决什么问题」。
- 命令、路径、代码一律用行内代码包裹。
- 链接到站内其他页面用 `/guide/xxx` 绝对路径，避免相对路径在 `cleanUrls` 下出错。
