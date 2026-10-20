# Contra

一个 pnpm monorepo 工作区：类型安全的核心库、命令行工具，以及一套由 VitePress 驱动的文档系统。

## 布局

```text
contra/
├── docs/               @contra/docs —— VitePress 文档系统
├── packages/
│   ├── core/           @contra/core —— Result、版本工具、事件总线
│   └── cli/            @contra/cli —— 参数解析与命令调度
├── package.json        根：脚本聚合
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 快速开始

```bash
pnpm install
pnpm docs:dev      # 文档开发服务器
pnpm verify        # lint + typecheck + test + build
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | 构建全部包 |
| `pnpm test` | 运行全部测试 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` / `pnpm format` | 静态检查 / 格式化 |
| `pnpm docs:dev` | 启动文档站 |
| `pnpm docs:build` | 构建静态文档站 |
| `pnpm docs:preview` | 预览构建产物 |

## 依赖方向

```text
@contra/cli  ──────▶  @contra/core
@contra/docs ──────▶  全部包
```

## 文档

完整文档见 `docs/`，构建后本地预览：

```bash
pnpm docs:build && pnpm docs:preview
```

## License

MIT
