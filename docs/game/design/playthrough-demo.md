# 完整通关录像

> 用 Midscene 视觉 Agent 驱动真实 Chrome 游玩，**带声音**，从进入第一关的第一帧开始录。

## 视频

<video controls width="100%" poster="/demos/frames-full/01.webp">
  <source src="/demos/contra-full-playthrough.mp4" type="video/mp4" />
  你的浏览器不支持 video 标签，可直接下载
  <a href="/demos/contra-full-playthrough.mp4">contra-full-playthrough.mp4</a>。
</video>

- 时长 **1 分 58 秒** · 960×540 · 30fps · **立体声 AAC** · 8.4MB
- **连续通关 8 关**：码头晨雾 → 锈铁回廊 → 悬空栈道 → 冷却管廊 → 阵列机房 → 熔炉区 → 坍塌档案库 → 镜像回廊
- 录于 v0.16.7

## 这一版修掉了什么

前几版录像暴露的缺陷，都在这一版之前修好了：

| 问题 | 症状 | 修复 |
| --- | --- | --- |
| 玩家死后游戏继续 | 角色卡在原地，关卡永远打不完 | `World.update` 检测到 `failed` 即停止推进 |
| 第 3 关出口悬空 | 走到门口却不通关 | 出口 y 改为 `FLOOR_TOP - 120`，与其他关一致 |
| Boss 关可以绕过 | 不打 Boss 也能通关 | `checkExit` 要求 Boss 已击败 |
| 录屏含结算页 | 一分钟视频里 40 秒是「关卡完成」 | 关卡切换时暂停 CDP screencast |

## 覆盖范围

8 / 12 关。缺的 4 关是：

- **第 4、8、12 关**（Boss 战）：每个 Boss 招式射程 900px，而竞技场约 1280px 宽，机器人没有学会躲避；这三关需要真正会玩的玩家。
- **第 11 关**（垂直井）：需要连续下跳平台，机器人只会一路向右。

这不是游戏的问题——规则层对这四关的单测都通过，手工试玩也能打通。是录制用的机器人能力有限。

## 画面说明

- 左上角 HUD 实时显示 FPS、关卡进度、分数
- 每关通关后有 S/A/B 评级结算页，录像中已剪掉
- 音量经过限幅，峰值 −1.4dB，无削波

## 复现

```bash
# 1. 构建并启动预览
cd packages/game-web && node ../../node_modules/.pnpm/vite@*/node_modules/vite/bin/vite.js build
node ../../node_modules/.pnpm/vite@*/node_modules/vite/bin/vite.js preview --port 4180 --strictPort

# 2. 录制（需要 .tmp/msenv.env 里的 Midscene 环境变量）
bash .tmp/run-record-full.sh

# 3. 合成
#    帧序列在 .tmp/screencast-full/，音频在同一目录的 audio.webm
#    用 concat 列表按 meta.json 的时间戳拼接，再用 aresample=async=1 对齐音频
```

相关：[协作规范](/guide/conventions) · [非功能需求](/game/requirements/nonfunctional) · [技术架构](/game/design/architecture)
