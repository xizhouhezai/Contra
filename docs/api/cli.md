---
title: "@contra/cli"
description: 命令行工具的参数解析与命令调度
---

# `@contra/cli`

Contra 的命令行入口。该包依赖 `@contra/core` 的类型契约，
命令逻辑与 I/O 传输层彼此分离。

```bash
pnpm add @contra/cli
```

## 命令

| 命令 | 说明 |
| --- | --- |
| `contra version` | 打印版本号 |
| `contra doctor` | 打印运行时诊断信息 |
| `contra help` | 显示用法 |

全局 `--version` / `-v` 同样可用，会直接打印版本号并退出。

## 参数解析

### `parseArgs(argv)`

把参数数组解析成标志与位置参数。支持三种写法：

```ts
import { parseArgs } from '@contra/cli'

const { flags, positionals } = parseArgs(['doctor', '--name=contra', '-v'])
// positionals -> ['doctor']
// flags      -> [{ name: 'name', value: 'contra', isShort: false },
//                { name: 'v', value: null, isShort: true }]
```

### `readFlag(flags, name, fallback?)`

读取长标志的值。不存在时返回 `fallback`（默认 `null`）。

注意：`--name`（无值）与 `--name=value` 不同，
前者读到的是空字符串而非 `null`。

### `hasFlag(flags, name)`

判断某个长标志是否存在。短标志不参与匹配——
用 `flags[].isShort` 自行区分。

## 命令调度

### `resolveCommand(raw)`

把原始命令名解析为已知命令。未知输入回退到 `help`。

### `runCommand(command, version, bus?)`

执行命令并返回 `Result<string, string>`。
可选传入 `EventBus`，用事件把进度消息推给传输层。

```ts
import { EventBus } from '@contra/core'
import { runCommand, type CliEvents } from '@contra/cli'

const bus = new EventBus<CliEvents>()
bus.on('message', (m) => console.error(`[${m.level}] ${m.text}`))

const result = runCommand({ name: 'doctor', args: [] }, '0.1.0', bus)
```

### 事件

| 事件 | 负载 | 触发时机 |
| --- | --- | --- |
| `command` | `{ name: CommandName }` | 命令开始执行 |
| `message` | `{ level: 'info' | 'warn', text: string }` | 需要向用户输出进度 |

## 入口

### `main(argv)`

解析参数、执行命令、打印结果，返回进程退出码。
`0` 表示成功，`1` 表示命令返回了失败分支。

```ts
import { main } from '@contra/cli'

process.exitCode = main(process.argv.slice(2))
```
