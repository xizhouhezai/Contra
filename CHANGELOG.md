# Changelog

本项目遵循 [SemVer](https://semver.org/lang/zh-CN/)。
版本发布规则见 [协作规范](/guide/conventions)。

## [0.7.0] - 2026-10-20

### 新增

- **M3 波次 1**（T-M3-01/02/03）：可破坏地形、移动平台（时间纯函数，保证固定步长确定性）、纵向卷轴
- **M3 波次 2**（T-M3-04/06）：镜像使徒（实时复制玩家武器，8 秒到期）、GPT 双形态四阶段 Boss（语料 I/II → 40% 分裂 3 残影 → 涌现）
- **M3 波次 3**（T-M3-05/07/08）：幕 III 四关（第 9~12 关）、幕间过场、战役完整流程与通关画面

### 变更

- 战役扩至 **12 关**，CAMPAIGN_STAGES 合并三幕为单一数组
- M2 的关卡测试改守「幕 I/II 切片」而非数组长度

### 测试

- 245 个测试（game-core 237 + game-web 8），较 0.6.0 的 210 个新增 35 个

## [0.6.0] - 2026-10-20

### 新增

- **M2 波次 1**（T-M2-01/02/03）：`StageDefinition` 数据驱动关卡 + `StageRunner`；弹墙反射（入射角=反射角）；单向平台落地判定
- **M2 波次 2**（T-M2-04/05/06）：charger 追踪与击退恢复、flyer 空中 weave 与仰射判定、armored 正面免疫/绕后/穿甲
- **M2 波次 3**（T-M2-07/08/09）：`BossDirector` 通用阶段机；审计者（两招式，50% 加速）；改写者（三重招，可逆重力反转）
- **M2 波次 4**（T-M2-10/11/12/13）：幕 I/II 八关数据、进度存档、S/A/B/C 评分、关卡选择与结算界面

### 修复

- **改写者的重力反转原本不可逆**：初版把反转做成「phase 的属性」，进入 phase 2 后永不恢复，
  正是 REQ 禁止的卡死状态。改为**限时循环**（6 秒反转后自动恢复），并有测试断言恢复

### 测试

- 210 个测试（game-core 202 + game-web 8），较 0.5.0 的 140 个新增 70 个

## [0.5.0] - 2026-10-20

### 新增

- **M1 波次 1**（T-M1-01/02/06）：10 种武器 + 4 槽管理；散布累积与恢复；追踪锁定上限；伤害结算与 1.5s 无敌帧
- **M1 波次 2**（T-M1-03/04/08）：六角色定义（初始武器/被动/炸弹/配色）、六组被动、六种炸弹、得分与连击
- **M1 波次 3**（T-M1-05/07/10）：10 种敌人定义与状态机、64×64 空间哈希、对象池
- **M1 波次 4**（T-M1-09/11）：事件总线消费全部 9 类事件、六角色选角界面
- **工程**：`pnpm check` 一键质量门禁（7 项检查）

### 变更

- `CoreEventBridge` 九类事件处理器改为**必填**，缺失即类型错误
- 敌人 `dead` 为终态，不可再转移
- 对象池改为直接计数在用实例，修复重复释放导致的计数漂移

### 测试

- 140 个测试（game-core 132 + game-web 8），较 0.4.0 的 75 个新增 65 个

## [0.4.0] - 2026-10-20

### 新增

- **M0 波次 3**（T-M0-06 / T-M0-07）：Phaser 表现层与灰盒关卡，M0 收尾
  - 新建 `@contra/game-web`：Vite + Phaser 3 + TypeScript，Boot → Title → Stage 三场景
  - 精灵封装 `ActorView` 每帧单向读规则层实体盒并写渲染器，从不回写
  - `CoreEventBridge` 只接 `shot` 与 `stageCleared` 两族，其余七类留到 M1（T-M1-09）
  - 灰盒关卡：1600px 地面 + 2 块高台 + 4 个靶子 + 右侧终点，跑到终点触发一次
    `stageCleared`，界面与控制台同步可见
  - 全部美术为程序生成的纯色矩形，不引入任何素材文件
- **依赖边界机器验证**：`biome.json` 为 `game-core/src` 增加 `noRestrictedImports`
  （禁 Phaser / 表现层 / 适配层 / 非相对导入），新增 `pnpm boundary` 脚本检查
  `dependencies` 字段与游离导入；两者都进入 `pnpm verify`

### 里程碑

- **M0 四项出口标准全部达成**：全程可跑通且 60fps、规则层 35 个单测、
  依赖边界通过、`pnpm verify` 全绿

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