# Midscene 自动游玩录像

> 用 [Midscene](https://midscenejs.com) 视觉 Agent 驱动真实 Chrome 游玩本作。
> **带声音**，从进关卡第一帧开始录。

## 视频

<video controls width="100%" poster="/demos/frames/01-stage.webp">
  <source src="/demos/contra-midscene-playthrough.mp4" type="video/mp4" />
  你的浏览器不支持 video 标签，可直接下载
  <a href="/demos/contra-midscene-playthrough.mp4">contra-midscene-playthrough.mp4</a>。
</video>

- 时长 **47 秒** · 1280×720 · 30fps · **立体声 AAC** · 8.7MB
- **连打三关**：码头晨雾 → 锈铁回廊 → 悬空栈道
- 录于 v0.15.1

## 轨迹

| 时间 | 场景 | 证据 |
| --- | --- | --- |
| 0-18s | 第 1 关码头晨雾：瞄准、走位、跳跃躲弹 | [画面](/demos/frames/01-stage.webp) |
| 18-32s | 第 2 关锈铁回廊 | [画面](/demos/frames/02-second-stage.webp) |
| 32-42s | 第 3 关悬空栈道 | [画面](/demos/frames/03-third-stage.webp) |
| 42-47s | 终段战斗 | [画面](/demos/frames/04-combat.webp) |

## 机器人是怎么玩的

不是按固定脚本按键，而是**每帧读游戏状态再决策**：

- **躲避**：把每颗敌方子弹沿速度外推 0.35 秒，判断弹道是否穿过玩家身体；会穿过就跳起来或侧移换道
- **跳跃**：前方 26px 内有平台挡路就跳
- **攻击**：追到距敌人 90px 停下并持续开火，太近（<60px）反而后退避免接触伤害
- **推进**：没有敌人就继续向右走

## 音频是怎么进去的

CDP 的 `Page.startScreencast` **只传视频帧**，不含声音；这台机器也没有立体声混音（loopback）设备，无法从系统层采音。

做法是在页面内挂一个 `MediaStreamDestination` 到 Phaser 的 Web Audio 图上：

```js
const ctx = game.sound.context
const dest = ctx.createMediaStreamDestination()
game.sound.destination.connect(dest)
new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' })
```

录到的就是玩家听到的原始音频，没有环境噪音，也不需要虚拟声卡。

两轨长度差约 10 秒——录音比录屏晚启动——所以对齐时**裁掉视频开头**而不是给音频补静音，这样第 0 秒就有声音。

## 发现的两个缺陷

这个机器人不是摆设，它挖出了两个真实 bug：

1. **子弹永不销毁** —— 一颗敌方子弹在 x=-8839 还以 300px/s 向左飞。每颗存活子弹每帧都要过命中、爆炸、受伤三次检测，整关下来无界累积。
2. **玩家能走出地图** —— `updateMovement` 没有任何边界限制，`World` 也不知道关卡多宽。机器人跑到 x=10612（关卡只有 2788 宽），`onGround` 连续 30 秒为 false，角色掉出世界。

两处都已修复并加回归测试（`bulletLifetime.test.ts`、`stageBounds.test.ts`）。

按键回放脚本发现不了这类问题——只有读游戏状态的驱动才行。

## 复现

```bash
# 1. 构建并起预览
cd packages/game-web && node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js build
node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js preview --port 4180

# 2. 取 DSH Midscene 桥配置（模型由 DSH 提供，无需第三方 key）
curl -s "http://127.0.0.1:8787/v1/midscene-env"

# 3. 注入四行环境变量后运行录制脚本，再用 ffmpeg 合成音视频
```

脚本在 `.tmp/midscene-record3.mjs`（临时产物，未入库）。
