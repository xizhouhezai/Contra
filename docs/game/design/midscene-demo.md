# Midscene 自动游玩录像

> 用 [Midscene](https://midscenejs.com) 视觉 Agent 驱动真实 Chrome 游玩本作，
> 逐帧截图后合成视频。不是脚本回放——Midscene 靠**看截图**决定点哪里。

## 视频

<video controls width="100%" poster="/demos/frames/03-stage.webp">
  <source src="/demos/contra-midscene-playthrough.mp4" type="video/mp4" />
  你的浏览器不支持 video 标签，可直接下载
  <a href="/demos/contra-midscene-playthrough.mp4">contra-midscene-playthrough.mp4</a>。
</video>

- 时长 **92 秒** · 1280×720 · 30fps · 7.3MB
- 连续录制，**连打三关**：码头晨雾 → 锈铁回廊 → 悬空栈道
- 录于 v0.15.0（敌人会攻击、会移动、子弹有独立素材的那一版）

## 过程

Midscene 依次完成四步，每一步都是它自己看屏幕决定的：

| 时间 | 发生的事 | 证据 |
| --- | --- | --- |
| 0-18s | 标题页；Midscene 找到并点击开始 | [标题页](/demos/frames/01-title.webp) |
| 18-32s | 选角页；它读出六个角色名后选 DeepSeek 并确认 | [选角页](/demos/frames/02-character-select.webp) |
| 32-58s | 第 1 关码头晨雾：自动瞄准、走位、跳跃躲弹 | [关卡](/demos/frames/03-stage.webp) |
| 58-72s | 通关结算（S 评级）后自动进第 2 关 | — |
| 72-92s | 第 2、3 关：锈铁回廊与悬空栈道 | [战斗](/demos/frames/04-combat.webp) |

它在第 4 步这样描述自己看到的画面：

> 横版平台射击游戏画面。角色：画面左侧一名蓝发双马尾、身穿蓝白连衣裙的动漫少女主角，
> 站在左侧石块上，身旁带有一个蓝色圆形图标。敌人：画面中右侧的钢梁平台上有一只深蓝黑色
> 圆形小机器人（带绿色标记与红色眼睛状部件）。地形：中部为一条横贯全屏的铆钉钢梁平台，
> 背景为黄昏雾气中的港口码头场景……

这段描述本身就是一次验收：角色、敌人、武器道具、地形、HUD 都在画面里，且互相不遮挡。

## 结果

| 指标 | 值 |
| --- | --- |
| 通关 | 第 1 关 S 评级，命中率 100%，用时 14.3 秒 |
| 连打 | 三关，两种不同风格的场景 |
| 帧率 | 稳定 60.9 fps |
| 页面错误 | **0** |

## 机器人是怎么玩的

不是按固定脚本按键，而是**每帧读游戏状态再决策**：

- **躲避**：把敌方子弹沿速度外推 0.35 秒，判断弹道会不会穿过玩家身体；会的话跳起来或用侧移换道
- **跳跃**：脚下前方 26px 内若有平台挡住去路就跳
- **攻击**：追到距敌人 90px 处停下并持续开火，靠太近（<60px）反而后退避免接触伤害
- **推进**：没有敌人就继续向右走，不会原地发呆

这套逻辑第一版有个 bug——打死所有敌人后不再移动，最后 30 秒是站着不动的静帧。已修。

## 为什么是连续录制而不是逐帧截图

第一版按 Midscene 的决策节点截图，得到 9 张静帧 —— 那不是录像，是幻灯片。

根本原因在方法：**视觉 Agent 每一步要花好几秒**去看屏幕、判断、决定动作，
而几乎所有的运动都发生在这几秒之间。按决策点采样必然丢掉中间过程。

正确工具是 CDP 的 `Page.startScreencast`：浏览器每次重绘就推一帧，
录制频率与 Agent 的思考速度**解耦**。每帧带时间戳，合成时按真实间隔赋时长 ——
所以 Agent 长时间思考的那一段不会把视频拉成慢动作。

代价是帧间隔不均匀：静态菜单几乎不产帧，快速动作帧很密。这正好是对的——
观众看到的节奏和当时发生的节奏一致。

## 复现

```bash
# 1. 构建并起预览
cd packages/game-web && node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js build
node ../../node_modules/.pnpm/vite@7.3.7_*/node_modules/vite/bin/vite.js preview --port 4180

# 2. 取 DSH Midscene 桥的配置（模型由 DSH 提供，无需任何第三方 key）
curl -s "http://127.0.0.1:8787/v1/midscene-env"

# 3. 注入四行环境变量后运行录制脚本，再用 ffmpeg 合成
```

脚本在 `.tmp/midscene-record.mjs`（未入库，属临时产物）。

## 为什么用 Midscene 而不是 Puppeteer 直接点

Puppeteer 能精确点到坐标，但它**不知道自己在点什么**。Midscene 的价值在于：
如果这一版把「开始」按钮挪了位置、或者选角页的文案改了，Puppeteer 脚本会静默点到空白处
继续跑完并报告成功，而 Midscene 会失败——它必须真的在屏幕上找到那个按钮。

## 完整报告

Midscene 会为每次运行生成一份自包含 HTML 报告，含每一步的截图、模型判断与耗时。
它有两份共 17MB——每一步的截图都以 base64 内嵌——所以不入库。

要看时重新跑一次录制脚本，报告落在 `midscene_run/report/`，直接双击打开即可
（该目录已加入 .gitignore 与 biome 忽略列表）。
