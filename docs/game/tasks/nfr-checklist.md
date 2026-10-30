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
| REQ-NFR-002 | 冷启动到可操作 ≤ 5 秒 | P0 | ✅ 通过（宽带口径） | `node scripts/measure-first-playable.mjs` 实测「进关卡且规则层出步」：**宽带 20Mbps 4.32s 通过**；4G 8Mbps 6.62s、3G 1.6Mbps 33.14s 未达标。4G 档的差距经 `node scripts/measure-cold-start-breakdown.mjs` 的对照实验定位：去掉全部往返延迟只省 0.75s、带宽翻倍省 2.19s，**瓶颈是字节传输（线上 4.32MB）而非请求数**，因此「合并图集」这条路被实测否掉。4G 要达标需把线上字节降到 2.7MB 以内（重新压缩全部美术），属独立工作量，未排期 |
| REQ-NFR-003 | 首包 ≤ 8MB | P0 | ✅ 通过 | `node scripts/check-first-load.mjs` 实测 **3.86MB**（JS 0.56 + 图片 3.05 + 音频 0.25），剩余预算 4.14MB。口径为 index.html 的 ESM 静态导入图，与 Chrome CDP 实测逐文件比对一致 |
| REQ-NFR-007 | 30 分钟内存增长 < 50MB | P1 | ✅ 通过 | `node scripts/measure-memory.mjs` 实测 **30 分钟连续游玩**：脚本化走位+射击+跳跃驱动真实关卡，周期性读 CDP 的 `JSHeapUsedSize`（每次读前强制 GC，因此是存活对象而非未回收垃圾）。结果：107 个采样，首 6 个均值 **6.9MB**、末 6 个均值 **7.3MB**，**增长 +0.4MB**（预算 50MB），最低 6.0MB / 峰值 7.4MB。模拟推进 **107474 步**（预期约 108000，即满帧运行），证明不是「游戏停了所以内存不涨」 |

## 兼容与适配

| ID | 需求 | 优先级 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| REQ-NFR-008 | 四大浏览器最近两版 | P1 | ✅ 通过 | `node scripts/check-browsers.mjs` 实测四个引擎各跑一遍关键路径（进关卡 → 触发波次 → 战斗），收集 console 错误 / pageerror / 未处理 Promise 拒绝 / 失败请求：**Chrome、Edge、WebKit（Safari 内核，UA 报 `AppleWebKit/605.1.15`）、Firefox 157.0 全部通过**，四个引擎均实测到波次触发与敌人生成。WebKit 与 Firefox 由 `npx playwright install webkit firefox` 提供浏览器本体（仓库依赖不含 Playwright，脚本直接去 pnpm 虚拟存储里找它） |
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
| ✅ 通过 | 19 | 001, 002, 003, 004, 006, 007, 008, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021 |
| ⚠️ 未验证 | 1 | 009 |
| ❌ 未通过 | 0 | — |
| **合计** | **20** | |

其中 P0 共 **10 条**：001、002、003、006、009、012、013、017、018、021 中，
除 009（移动端真机）外全部通过。
009 需要真实移动设备，已在下文写明缺什么条件。


### ⚠️ 余下 1 项未验证：缺什么

| ID | 缺的条件 | 要在 CI 里补需要什么 |
| --- | --- | --- |
| 009 移动浏览器 | 模拟器不覆盖真实 GPU 与触控延迟 | 真机实验室，或真机云服务 |

> **007 与 008 已于 2026-10-30 结案。**
>
> 007 此前标「未验证」的理由是「需要真人游玩 30 分钟」——但**需要的是 30 分钟的
> 游玩，不是 30 分钟的真人**。脚本化驱动同样会分配对象，而泄漏只在有对象被
> 不断创建时才会显形。跑测的第一版报「+0.0MB」，那个数字是假的：玩家一死，
> 规则层按设计冻结（`if (this.failed) return`），世界不再推进，自然不再分配。
> 现在的脚本会在检测到失败时重开关卡，并**用模拟推进的步数作为通过条件**——
> 堆不涨有两种可能（没泄漏 / 没在跑），步数把两者区分开。
>
> 008 此前标「未验证」的理由是「容器里只有 Chromium」。现在 WebKit 与 Firefox
> 的浏览器本体已装上，四个引擎（Chrome / Edge / WebKit / Firefox）各跑一遍
> 关键路径全部通过，**且都实测到波次触发**——第一版脚本曾报「通过」，实际是
> 玩家在波次触发点之前就死了，读数发生在战斗之前，等于什么都没测。

> **002 已于 2026-10-29 结案**：此前标为「未验证」是因为只测了字节、
> 没有测时间。`scripts/measure-first-playable.mjs` 按固定网络档位实测
> 「进关卡」这个口径后，宽带档达标；4G/3G 档的差距与物理下限、
> 以及可选的图集化优化，都记在 `nonfunctional.md` 的 002 表下。

## 未通过项与未验证项的处理

### 已关闭

- **REQ-NFR-010 · WebGL 不可用时的提示** —— 已在 `main.ts` 实现：`new Phaser.Game` 之前检测
  `webgl2` 与 `webgl`，失败时渲染纸色墨字的中文提示页。`--disable-webgl` 实测无白屏、
  无 pageerror；正常 Chrome 路径未受影响。
- **REQ-NFR-002 · 冷启动 ≤ 5 秒** —— 见上文：补了按网络档位实测的脚本，
  宽带档达标；同时把 stamps/bosses/avatars 移出首包（4.85 → 3.86MB）。
- **REQ-NFR-007 · 30 分钟内存增长 < 50MB** —— 见上文：脚本化 30 分钟连续游玩，
  堆增长 +0.4MB，模拟推进 107474 步。
- **REQ-NFR-008 · 四大浏览器** —— 见上文：Chrome / Edge / WebKit / Firefox
  四个引擎各跑一遍关键路径，均实测到战斗。

### 仍需真实环境

余下 3 条（007 内存、008 跨浏览器、009 移动端）的缺口与所需基础设施见上表。
它们**无法用单测或构建断言替代**，因此标为未验证而非凑数通过。

## 追溯

本文件实现：T-M5-07 非功能需求逐条核对

相关：[非功能需求](/game/requirements/nonfunctional) · [里程碑](/game/tasks/milestones) · [协作规范](/guide/conventions)
