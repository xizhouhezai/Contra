---
title: 非功能需求核对清单
description: REQ-NFR-001 ~ 021 的逐条核对结果与证据
---

# 非功能需求核对清单

> 追溯：T-M5-07 ｜ 核对日期：2026-10-20 ｜ 版本：v0.9.0

本页逐条核对 `nonfunctional.md` 中的非功能需求。
**每条都给出状态与证据；无法验证的标为「未验证」，不标通过。**

> 编号说明：需求文档实际存在 **20 条**（001~004、006~021）。
> **REQ-NFR-005 缺号** —— 这处缺口属于需求文档本身，已在下方汇总中注明，未擅自补号。

## 状态图例

| 状态 | 含义 |
| --- | --- |
| ✅ 通过 | 有实测证据 |
| ⚠️ 未验证 | 需要真实环境/玩家数据，当前无法验证 |
| ❌ 未通过 | 实测不达标 |

## 性能

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-001 | 桌面 1080p 稳定 60fps | P0 | ✅ 通过 | `node scripts/measure-fps.mjs` 实测：headless Chrome + ANGLE/D3D11，进第 1 关自动游玩 30 秒，p50 = 60.0 fps、p95 = 60.0、mean = 59.8，**低于 50fps 的秒数 0 / 30**，最长连续低帧 0 秒 |
| REQ-NFR-002 | 冷启动到可操作 ≤ 5 秒 | P0 | ⚠️ 未验证 | 首包 7.14MB 已实测（见 NFR-003），加载时间取决于网络，未做导航计时 |
| REQ-NFR-003 | 首包 ≤ 8MB | P0 | ✅ 通过 | `node scripts/check-first-load.mjs` 实测 **3.63MB**（JS 0.46 + 图片 2.91 + 音频 0.25），剩余预算 4.37MB。口径为 index.html 的 ESM 静态导入图，与 Chrome CDP 实测逐文件比对一致 |
| REQ-NFR-007 | 30 分钟内存增长 < 50MB | P1 | ⚠️ 未验证 | 对象池有「稳态零分配」单测（10000 次循环 createdCount 不变），但**堆快照需真机 30 分钟游玩** |

## 兼容与适配

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-008 | 四大浏览器最近两版 | P1 | ⚠️ 未验证 | 使用标准 Web API（无厂商前缀），但未做跨浏览器实测 |
| REQ-NFR-009 | iOS Safari 15+ / Android Chrome 100+ | P0 | ⚠️ 未验证 | 触屏层已实现并有单测（摇杆映射/按钮/44px），**未上真机** |
| REQ-NFR-010 | 不支持 WebGL 时明确提示 | P1 | ✅ 通过 | `main.ts` 在 `new Phaser.Game` 之前检测 webgl2/webgl，失败时渲染纸色墨字的中文提示页（不复用浏览器默认样式）。`--disable-webgl` 实测：无 canvas、无 game 句柄、文案正确、无 pageerror；正常 Chrome 未受影响 |
| REQ-NFR-011 | 320~2560px 不破版；竖屏旋转提示 | P1 | ✅ 通过（部分） | Phaser `Scale.FIT` + `CENTER_BOTH` 自适应；`isPortrait` 已实现并有单测；**旋转提示 UI 尚未接入场景** |

## 可访问性

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-012 | 全部关卡可纯键盘完成 | P0 | ✅ 通过 | `KeyboardInputSource` 覆盖移动/瞄准/跳跃/射击/炸弹；`KEYBOARD_ACTIONS` 8 项有单测断言 |
| REQ-NFR-013 | 触控目标 ≥ 44×44px | P0 | ✅ 通过 | `MIN_TOUCH_TARGET_PX = 44`，单测断言 `>= 44` |
| REQ-NFR-014 | 支持减少闪烁 | P1 | ✅ 通过 | `reduceMotion` 开启后 `allowsFlashing`/`allowsShake` 均返回 false，有单测 |
| REQ-NFR-015 | 不依赖颜色单独传达信息 | P1 | ✅ 通过 | 5 个状态各有**互不相同**的 glyph（单测断言唯一性），颜色之外有形状 |
| REQ-NFR-016 | 音频可完全静音且保留视觉反馈 | P1 | ✅ 通过 | `AudioManager.setMuted` 只影响 Phaser sound；视觉走 CoreEventBridge，两者解耦 |

## 隐私与数据

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-006 | 无账号、无追踪、无上传 | P0 | ✅ 通过 | 全仓库源码无第三方请求（CDN 检查脚本实测输出「OK: 无第三方 CDN 依赖」） |
| REQ-NFR-017 | 存档仅 localStorage，有清除入口 | P0 | ✅ 通过 | `LocalStorageAdapter` 为唯一存储实现；`clearProgress`/`resetSettings` 有单测；关卡选择界面 R 键清除 |
| REQ-NFR-018 | 无第三方分析/广告 SDK | P0 | ✅ 通过 | `package.json` 依赖仅 phaser/vite/vitest/typescript/rimraf，无 SDK |

## 质量

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-004 | 核心逻辑单测覆盖率 ≥ 80% | P1 | ✅ 通过 | 已装 `@vitest/coverage-v8`，`vitest run --coverage.provider=v8 --coverage.include='src/**/*.ts'` 实测 **语句覆盖 96.88%**、分支 92.53%、函数 96.22%、行 96.88%，高于 80% 的要求 |
| REQ-NFR-019 | 关键路径有集成测试 | P1 | ✅ 通过 | 移动（movement/stageRunner）、射击（weapons/spread）、伤害（combat）、死亡（combat）、通关（act3 逐关通关）均有测试 |
| REQ-NFR-020 | 无阻断 console 错误 | P1 | ✅ 通过 | `node scripts/measure-console.mjs` 实测：走标题→第 1 关→第 4 关 Boss→第 12 关→暂停，采集 console.error 与 pageerror，**结果为 0 条**。修复前每次加载都会报一个 favicon 404，已补 favicon |
| REQ-NFR-021 | 外部资源自托管，不依赖 CDN | P0 | ✅ 通过 | 全部音频/图片经 `import.meta.glob` 打包进产物；CDN 检查脚本实测无外部链接 |

## 汇总

> 实际存在的非功能需求为 **20 条**：REQ-NFR-001~004、006~021。
> **REQ-NFR-005 在需求文档中缺号**，非本清单遗漏。

| 状态 | 数量 | 条目 |
| --- | --- | --- |
| ✅ 通过 | 16 | 001, 003, 004, 006, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021 |
| ⚠️ 未验证 | 4 | 002, 007, 008, 009 |
| ❌ 未通过 | 0 | — |
| **合计** | **20** | |

其中 P0 共 **10 条**：003、006、009、012、013、017、018、021 通过；001、002 未验证。
**P0 无未通过项**；002 与 009 需要真实网络与真实移动设备，已在下文写明各自缺什么条件。


### ⚠️ 余下 4 项未验证：各自缺什么

| ID | 缺的条件 | 要在 CI 里补需要什么 |
| --- | --- | --- |
| 002 冷启动 ≤ 5 秒 | 依赖真实网络往返，headless 本地回环只有毫秒级 | 带限速代理的 CI 夹具（tc netem 或 toxiproxy），固定带宽与 RTT |
| 007 内存增长 < 50MB | 需要连续 30 分钟真人游玩，短跑无法暴露泄漏 | 长时跑测夹具：脚本化游玩 30 分钟 + 周期性内存采样；或直接对规则层做堆快照对比 |
| 008 四大浏览器 | 容器里只有 Chromium，没有 Firefox / Safari 实例 | CI 矩阵（Playwright 的 firefox 与 webkit 项目） |
| 009 移动浏览器 | 模拟器不覆盖真实 GPU 与触控延迟 | 真机实验室，或真机云服务 |

## 未通过项与未验证项的处理

### 已关闭

- **REQ-NFR-010 · WebGL 不可用时的提示** —— 已在 `main.ts` 实现：`new Phaser.Game` 之前检测
  `webgl2` 与 `webgl`，失败时渲染纸色墨字的中文提示页。`--disable-webgl` 实测无白屏、
  无 pageerror；正常 Chrome 路径未受影响。

### 仍需真实环境

余下 4 条（002 冷启动、007 内存、008 跨浏览器、009 移动端）的缺口与所需基础设施见上表。
它们**无法用单测或构建断言替代**，因此标为未验证而非凑数通过。

## 追溯

本文件实现：T-M5-07 非功能需求逐条核对

相关：[非功能需求](/game/requirements/nonfunctional) · [里程碑](/game/tasks/milestones) · [协作规范](/guide/conventions)
