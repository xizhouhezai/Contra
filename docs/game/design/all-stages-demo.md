---
title: 十二关全流程录像（Midscene 视觉测试）
description: 用 Midscene 视觉 Agent 驱动真实 Chrome 跑完全部十二关，逐关做视觉断言并录成视频
---

# 十二关全流程录像（Midscene 视觉测试）

> 用 [Midscene](https://midscenejs.com) 视觉 Agent 驱动真实 Chrome 跑完**全部十二关**，
> 每一关都做视觉断言。**带声音**，从进第一关开始录。

## 视频

<video controls width="100%" poster="/demos/frames-all/dock.webp">
  <source src="/demos/contra-all-stages.mp4" type="video/mp4" />
  你的浏览器不支持 video 标签，可直接下载
  <a href="/demos/contra-all-stages.mp4">contra-all-stages.mp4</a>。
</video>

- 时长 **14 分 52 秒** · 1280×720 · 30fps · **立体声 AAC** · 40.7MB
- **连打十二关**：码头晨雾 → 锈铁回廊 → 悬空栈道 → 审计者 → 冷却管廊 → 阵列机房 →
  熔炉区 → 改写者 → 坍塌档案库 → 镜像回廊 → 垂直井 → 涌现
- 录于 v0.24.1

## 测试结果

**60 / 60 项检查通过，零页面错误**（12 关 × 5 项）。

| 关卡 | 名称 | 画面 | HUD | 选关画面含本关名 | 规则层推进 | 战后画面 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | 码头晨雾 | ✅ | ✅ | ✅ | 2804 步 | ✅ |
| 02 | 锈铁回廊 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 03 | 悬空栈道 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 04 | 审计者 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 05 | 冷却管廊 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 06 | 阵列机房 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 07 | 熔炉区 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 08 | 改写者 | ✅ | ✅ | ✅ | 2804 步 | ✅ |
| 09 | 坍塌档案库 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 10 | 镜像回廊 | ✅ | ✅ | ✅ | 2804 步 | ✅ |
| 11 | 垂直井 | ✅ | ✅ | ✅ | 2803 步 | ✅ |
| 12 | 涌现 | ✅ | ✅ | ✅ | 2803 步 | ✅ |

五类检查各有分工，缺一不可：

| 检查 | 手段 | 它能证明什么 | 它**不能**证明什么 |
| --- | --- | --- | --- |
| 画面有背景与角色 | `aiBoolean` 读截图 | 这一关渲染出了该有的东西 | 血量、步数——截图看不见 |
| HUD 分数可读 | `aiQuery` 读截图 | HUD 真的画出来了且文字可辨 | 分数是否正确 |
| 选关画面含本关名 | `aiQuery` 读选关卡画面 | **这一关确实是这一关**（名字区分第 3 关与第 7 关） | 关卡内的美术是否对 |
| 规则层持续推进 | 直接读世界状态 | 规则层真的在跑，不是一张静态图 | 画面是否好看 |
| 战后画面仍正常 | `aiBoolean` 读截图 | 打完之后没有变成错误页 | — |

> 「选关画面含本关名」这一项是**让这次录制成为「十二关的测试」而不是「同一关跑十二遍」**的关键：
> 它把视觉模型读到的关卡名与预期比对，而名字正是区分第 3 关和第 7 关的东西。
> 一次跑测里，模型完整读出了十二个名字：
> 码头晨雾、锈铁回廊、悬空栈道、审计者、冷却管廊、阵列机房、熔炉区、改写者、
> 坍塌档案库、镜像回廊、垂直井、涌现。

## 逐关画面

| 关卡 | 画面 | Midscene 的描述 |
| --- | --- | --- |
| 01 码头晨雾 | ![](/demos/frames-all/dock.webp) | 蓝发少女站在金属平台上，游戏处于运行状态、分数为 0 |
| 02 锈铁回廊 | ![](/demos/frames-all/corridor.webp) | 破败漏光、钢架锈蚀的废弃厂房，少女在金属网格平台上奔跑 |
| 03 悬空栈道 | ![](/demos/frames-all/bridge.webp) | 浅色背景的横版平台游戏，角色站在金属栅格地面上 |
| 04 审计者 | ![](/demos/frames-all/auditor.webp) | 角色站在金属格栅平台上，前方有一条悬空铁质横杆平台 |
| 05 冷却管廊 | ![](/demos/frames-all/coolant.webp) | 青蓝色蒸汽朋克风格的机械设备与管线场景 |
| 06 阵列机房 | ![](/demos/frames-all/server.webp) | 遍布黑色线缆与服务器机柜的科幻数据中心 |
| 07 熔炉区 | ![](/demos/frames-all/forge.webp) | 空旷场景，角色站在深色科技地面条带上 |
| 08 改写者 | ![](/demos/frames-all/rewriter.webp) | 米白色背景，角色处于待机/奔跑状态，右侧远处悬空黑色平台 |
| 09 坍塌档案库 | ![](/demos/frames-all/archive.webp) | 崩塌的哥特式图书馆废墟，书页与家具在空中翻飞 |
| 10 镜像回廊 | ![](/demos/frames-all/mirror.webp) | 角色站在石板平台上静止待机 |
| 11 垂直井 | ![](/demos/frames-all/shaft.webp) | 空旷关卡，角色站在左侧细长平台上准备跨越空隙 |
| 12 涌现 | ![](/demos/frames-all/emergence.webp) | 紫色水晶洞穴，周围环绕密集弹幕轨迹与漂浮碎片 |

## 机器人是怎么玩的

不是按固定脚本按键，而是**每帧读游戏状态再决策**：

- **躲避**：把每颗敌方子弹沿速度外推 0.35 秒，判断弹道是否穿过玩家身体；会穿过就跳起或侧移换道
- **跳跃**：前方 26px 内有平台挡路就跳
- **攻击**：追到距敌人 90px 停下并持续开火，太近（<60px）反而后退避免接触伤害
- **推进**：没有敌人就继续向右走，**直到关卡自己的宽度**（不是猜一个距离）

> 最后一条改过一次：初版在 x>2400 就停下，那只有整关的三分之一，
> 于是机器人从没走到中段小 Boss 面前。改成按关卡宽度判断后，
> 它能推进到 x≈7200。

## 音频是怎么进去的

CDP 的 `Page.startScreencast` **只传视频帧**，不含声音；这台机器也没有立体声混音
（loopback）设备，无法从系统层采音。

做法是在页面内挂一个 `MediaStreamDestination` 到 Phaser 的 Web Audio 图上：

```js
const ctx = game.sound.context
const dest = ctx.createMediaStreamDestination()
game.sound.destination.connect(dest)
new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' })
```

录到的就是玩家听到的原始音频，没有环境噪音，也不需要虚拟声卡。

## 踩到的三个坑

### 1. 第一帧是白的，视觉断言因此误报

切换场景会拆掉旧场景、建新场景，中间有**大约三帧**画布是空的。
第一版在这段空窗里问模型「画面里有角色吗」，模型如实回答「没有」——
**它是对的，那一帧确实是空白页**。

修法不是加一个固定延时，而是等条件成立：

```js
await page.waitForFunction(() => {
  const s = window.__contraGame?.scene?.getScene('Stage')
  return !!s && !!s.world && s.world.steps > 5
}, { timeout: 30000, polling: 100 })
```

### 2. 断言问「画面中央偏左有角色吗」，五关因此误判

关卡 3 的角色在画面**中间偏右**，被断言判为失败——画面本身完全正常。
一个会在正确输出上失败的断言比没有断言更糟。

改成问「画面里有角色吗」（不问位置），并且**先问名字**再做位置判断：
让模型数「第 N 行第 M 列」它会差一格，而让它念名字再比对字符串没有这种失败模式。

### 3. 视频合成出来是 concat 列表的文本，不是画面

第一版用 ffmpeg 的 concat demuxer 读一个图片列表，得到的视频里
**显示的是列表文件的文字内容**——concat demuxer 默认把图片列表当文本流处理。

改用 image2 demuxer 按帧号序列读：

```bash
ffmpeg -framerate 30 -i frames/%05d.jpg -i audio.webm \
  -map 0:v:0 -map 1:a:0 -c:v libx264 -crf 30 -maxrate 700k \
  -c:a aac -b:a 80k -movflags +faststart out.mp4
```

## 复现

```bash
# 1. 构建并起预览
cd packages/game-web && node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js build
node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js preview --port 4180

# 2. 取 DSH Midscene 桥配置（模型由 DSH 提供，无需第三方 key）
curl -s "http://127.0.0.1:8787/v1/midscene-env"

# 3. 注入四行环境变量后运行录制脚本，再用 ffmpeg 合成音视频
```

脚本：`scripts/midscene-all-stages.mjs`（录制 + 断言）、
`scripts/capture-stage-frames.mjs`（逐关截图）、`scripts/assemble-video.mjs`（合成）。

## 追溯

本文件实现：T-M5-07 端到端验收 · REQ-NFR-020（无阻断 console 错误，本次 12 关零错误）

相关：[Midscene 三关录像（旧）](/game/design/midscene-demo) ·
[通关录像](/game/design/playthrough-demo) ·
[美术风格指南](/game/design/art-style)
