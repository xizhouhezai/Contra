---
title: "@contra/core"
description: 类型契约的源头 —— Result、版本工具、事件总线
---

# `@contra/core`

定义工作区类型契约的基础包。CLI 与任何上层应用都从这里取类型。

```bash
pnpm add @contra/core
```

## Result

### `Result<T, E>`

判别联合，描述一次成功或失败的操作。

```ts
type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }
```

用类型而不是异常，好处是失败分支无法被静默跳过——
编译器会要求你处理它。

### `ok(value)`

```ts
function ok<T>(value: T): Result<T, never>
```

把值包装成成功结果。

### `err(error)`

```ts
function err<E>(error: E): Result<never, E>
```

把错误包装成失败结果。

### `isOk(result)` / `isErr(result)`

类型守卫，把联合收窄到具体分支。

```ts
import { isOk } from '@contra/core'

const result = parse(input)
if (isOk(result)) {
  result.value  // 类型已知
}
```

### `mapResult(result, fn)`

只映射成功分支，失败分支原样透传。

```ts
function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>
```

### `unwrapOr(result, fallback)`

成功返回值，失败返回兜底值。

```ts
function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T
```

## 版本工具

### `parseVersion(input)`

解析 `major.minor.patch[-prerelease]`，格式不符返回 `null`。

```ts
import { parseVersion } from '@contra/core'

parseVersion('1.2.3')        // { major: 1, minor: 2, patch: 3, prerelease: null }
parseVersion('1.2.3-beta.1')  // { major: 1, minor: 2, patch: 3, prerelease: 'beta.1' }
parseVersion('1.2')           // null
```

### `compareVersions(a, b)`

比较两个版本，返回负数、零或正数。遵循 semver.org 规则 11：
预发布版本排在同版本正式版之前。

### `maxVersion(a, b)`

返回两者中较大的一个。

## EventBus

### `new EventBus<Events>()`

类型安全的事件总线。事件名与负载在类型层面绑定。

```ts
interface Events {
  ping: { at: number }
  pong: string
}

const bus = new EventBus<Events>()
```

### `bus.on(event, listener)`

注册监听器，返回取消订阅的函数。

```ts
const off = bus.on('ping', (payload) => console.log(payload.at))
off()  // 取消订阅
```

### `bus.off(event, listener)`

移除已注册的监听器。

### `bus.emit(event, payload)`

触发事件，返回成功执行的监听器数量。
**单个监听器抛错不会影响发布方**，异常会被吞掉并跳过该监听器。

### `bus.emitChecked(event, payload)`

同 `emit`，但用 `Result` 显式表达整体结果。

```ts
import { isOk } from '@contra/core'

const outcome = bus.emitChecked('ping', { at: 1 })
if (isOk(outcome)) {
  console.log('delivered to', outcome.value, 'listeners')
}
```
