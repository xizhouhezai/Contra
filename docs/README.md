# @contra/docs

Contra 文档系统，基于 VitePress。**主体是游戏策划规格**，另含工作区使用说明。

## 结构

```text
docs/
├── .vitepress/
│   ├── config.mts        站点配置：导航、侧边栏、搜索、页脚
│   └── theme/
│       ├── index.ts       主题入口，扩展 VitePress 默认主题
│       ├── style.css      设计语言：纸面、墨色、字体、纹理
│       └── components/    自定义组件
├── public/               静态资源（根路径引用）
├── game/                 游戏规格（SDD 三层，站点主体）
│   ├── requirements/      需求层：玩法、角色、关卡、策划、非功能
│   ├── design/            设计层：架构、模块、数据模型、跨端、ADR
│   ├── tasks/             任务层：里程碑、任务拆解
│   ├── sdd-guide.md       规格写法规范
│   └── index.md           规格入口
├── guide/                工作区使用说明（pnpm / 文档写法 / 协作）
└── index.md              首页
```

## 开发

```bash
pnpm dev        # 开发服务器
pnpm build      # 构建静态站点到 .vitepress/dist
pnpm preview    # 预览构建产物
```

新增页面后，记得在 `.vitepress/config.mts` 的 `themeConfig.sidebar` 里补上侧边栏条目。
