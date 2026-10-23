# Midscene 自动游玩录像

> 用 [Midscene](https://midscenejs.com) 视觉 Agent 驱动真实 Chrome 游玩本作，
> 逐帧截图后合成视频。不是脚本回放——Midscene 靠**看截图**决定点哪里。

## 视频

<video controls width="100%" poster="/demos/frames/03-stage.webp">
  <source src="/demos/contra-midscene-playthrough.mp4" type="video/mp4" />
  你的浏览器不支持 video 标签，可直接下载
  <a href="/demos/contra-midscene-playthrough.mp4">contra-midscene-playthrough.mp4</a>。
</video>

- 时长 15.97 秒 · 1280×720 · 30fps · 541KB
- 录于 v0.15.0（敌人会攻击、会移动、子弹有独立素材的那一版）

## 过程

Midscene 依次完成四步，每一步都是它自己看屏幕决定的：

| 步骤 | Midscene 的动作 | 证据 |
| --- | --- | --- |
| 1 | 标题页识别并点击「开始」 | [标题页](/demos/frames/01-title.webp) |
| 2 | 读出六个角色名，选 DeepSeek 并确认 | [选角页](/demos/frames/02-character-select.webp) |
| 3 | 选第 1 关进入 | [关卡](/demos/frames/03-stage.webp) |
| 4 | 描述画面、按住射击、向右移动、跳跃 | [战斗](/demos/frames/04-combat.webp) |

它在第 4 步这样描述自己看到的画面：

> 横版平台射击游戏画面。角色：画面左侧一名蓝发双马尾、身穿蓝白连衣裙的动漫少女主角，
> 站在左侧石块上，身旁带有一个蓝色圆形图标。敌人：画面中右侧的钢梁平台上有一只深蓝黑色
> 圆形小机器人（带绿色标记与红色眼睛状部件）。地形：中部为一条横贯全屏的铆钉钢梁平台，
> 背景为黄昏雾气中的港口码头场景……

这段描述本身就是一次验收：角色、敌人、武器道具、地形、HUD 都在画面里，且互相不遮挡。

## 结果

| 指标 | 值 |
| --- | --- |
| 起始 / 结束分数 | 0 → **50**（打死了 1 个敌人） |
| 角色位移 | x=40 → x=331 |
| 帧率 | 60.9 → 61.0 fps |
| 页面错误 | **0** |

分数涨了 50，说明 Midscene 不只是看着画面，它真的把敌人打掉了。

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
