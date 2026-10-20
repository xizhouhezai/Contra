# Changelog

本项目遵循 [SemVer](https://semver.org/lang/zh-CN/)。
版本发布规则见 [协作规范](/guide/conventions)。

## [0.3.0] - 2026-10-20

### 新增

- **M0 波次 2**（T-M0-03 / 04 / 05 / 08）：规则层核心循环与平台适配层
  - 固定步长 1/60s，单帧最多追 5 步；30/60/120fps 下状态快照完全一致
  - 移动与跳跃：重力 1200 px/s²、移速 180 px/s、跳跃初速 420 px/s
  - 8 向瞄准射击，方向与移动解耦
  - 新建 `@contra/game-platform`：Input / Storage / Audio / Lifecycle / Haptics 五接口 + 浏览器实现

### 修复

- **GDD §3.1 跳跃高度数值矛盾**：原文「约 3.2 格（96px）」与
  「初速 420 px/s + 重力 1200 px/s²」推出的 73.5px 不符（偏差 31%）。
  已修正为推导值，并注明若要跳更高需调初速或重力，而非改高度本身

## [0.2.0] - 2026-10-20

### 新增

- **M0 波次 1**（T-M0-01 / T-M0-02）：新建 `@contra/game-core` 规则层包
  - 零运行时依赖，遵循 ADR-0003 的分层约束
  - 基础类型：`Vec2`、`EntityId`、`Difficulty`、`WeaponId`（10 种）、
    `CharacterId`（6 名）、`BossId`（4 形态）、`MechanicId`（8 种）
  - `CoreEvent` 联合类型覆盖 shot / hit / enemyDied / playerHurt / playerDied /
    weaponPicked / explosion / bossPhaseChanged / stageCleared 九类事件
  - 事件覆盖由编译期断言 + 运行时穷举 switch 双重保证

## [0.1.1] - 2026-10-20

### 文档

- 新增[协作规范](/guide/conventions)：Git Flow 分支模型、SemVer 发布规则、
  Conventional Commits 提交规范、SDD 文档维护纪律
- 建立 `develop` 集成分支，与 `main` 并存
- 重写[贡献流程](/guide/contributing)为入口页，规则统一由协作规范承载
- 修正文档中过时的 `master` 分支名为 `main`

## [0.1.0] - 2026-10-20

首个版本。

### 游戏规格

- 建立 SDD 规格集：需求层 / 设计层 / 任务层三层结构
- 需求层：愿景、玩法规格、角色规格、关卡规格、策划文档、非功能需求
- 设计层：技术架构、模块设计、数据模型、跨端策略、7 条架构决策记录（ADR）
- 任务层：M0~M5 里程碑与 58 项任务拆解

### 角色

- 6 名可选角色：DeepSeek（蓝色大肥鱼）、Qwen（千问）、豆包（DouBao）、
  GLM（哥林姆）、Kimi（月读）、Gemini（双子）
- 4 个终极 Boss 形态：Claude（审计者 / 改写者）、GPT（语料 / 涌现）
- 12 关 3 幕战役，每关引入一个新机制

### 工程

- pnpm monorepo：`packages/core`、`packages/cli`、`docs`
- TypeScript 严格模式 + project references 增量构建
- Biome 负责 lint 与 format，vitest 负责单测
- VitePress 文档站，Riso 技术手册风格主题
