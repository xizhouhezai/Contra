# @contra/docs

Contra 文档系统，基于 VitePress。

## 结构

```text
apps/docs/
├── .vitepress/
│   ├── config.mts        站点配置：导航、侧边栏、搜索、页脚
│   └── theme/
│       ├── index.ts       主题入口，扩展 VitePress 默认主题
│       ├── style.css      设计语言：纸面、墨色、字体、纹理
│       └── components/    自定义组件
├── public/               静态资源（根路径引用）
├── guide/                指南
├── api/                  API 参考
├── examples/             示例
└── index.md              首页
```

## 开发

```bash
pnpm dev        # 开发服务器
pnpm build      # 构建静态站点到 .vitepress/dist
pnpm preview    # 预览构建产物
```

新增页面后，记得在 `.vitepress/config.mts` 的 `themeConfig.sidebar` 里补上侧边栏条目。
