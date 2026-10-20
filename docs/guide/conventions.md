---
title: 协作规范
description: 分支模型、版本发布、提交规范与 SDD 文档纪律
---

# 协作规范

> 状态：`V2.1（SDD）` ｜ 适配自 dlidli 项目规范 ｜ 更新日期：2026-10-20

本页是 Contra 仓库的**强制性协作规范**。
与 [贡献流程](/guide/contributing) 的区别：那一页讲「怎么参与」，这一页讲「必须怎么做」。

## 1. 分支与提交

### 分支模型（Git Flow）

```text
main        ── 生产发布分支，受保护；只接受 release/hotfix 合入，每次发布打 tag
develop     ── 集成分支，日常开发成果的汇聚处（默认开发基线）
feature/*   ── 功能分支：每个任务一个，如 feature/m1-core-03-result-helper
optimize/*  ── 轻量优化分支：文案修改/样式微调/小重构等「无新功能」需求
fix/*       ── 缺陷修复分支：开发/测试阶段的 bug 修复，从 develop 切出
release/*   ── 发布分支：release/v0.2.0，从 develop 切出做发布准备
hotfix/*    ── 线上紧急修复，从 main 切出
```

### 铁律：本地只保留 `main` 与 `develop`，工作分支用完即删

- **本地仓库任何时刻只应有 `main` 和 `develop` 两个分支**；
  `feature/*`、`optimize/*`、`fix/*`、`release/*`、`hotfix/*` 一律**不留本地**。
- **删除时机 = 打完 tag 并推送之后**：发布动作一完成，立即删除本次涉及的本地工作分支
  与本地 release 分支（远程分支保留，作为发布留痕，不删）。
- 删除前必须确认**已完全合入**（不得用 `-D` 强删）：`git branch -d` 会在未合并时报错，这是安全网。
- 日常自检（应只输出 `main`、`develop`）：
  ```bash
  git branch
  # 清理所有除 main/develop 外的本地分支（均已合并时）
  git branch | grep -vE '^\*?\s*(main|develop)$' | xargs -r git branch -d
  ```

### 版本号规则（SemVer，任务完成必发 release）

> 铁律：**无论大任务还是小任务，完成后都要发布一个 release 并打 tag**。

| 改动类型 | 版本位 | 示例 | 典型场景 |
| --- | --- | --- | --- |
| 破坏性变更（不兼容） | MAJOR | v1.0.0 → v2.0.0 | API 重构、不兼容迁移 |
| 新功能（feature） | MINOR | v0.2.0 → v0.3.0 | 新模块、新页面、新接口 |
| 优化/修复（optimize/fix） | PATCH | v0.3.0 → v0.3.1 | 样式微调、小重构、bug 修复 |

- feature 任务 → MINOR（含破坏性升 MAJOR）；optimize/fix 任务 → PATCH。
- 当前处于 0.x 阶段：新功能走 MINOR，优化/修复走 PATCH；首个正式版再定 v1.0.0。

### 铁律：任何改动禁止直接在 main/develop 上进行

- **不允许在 main 或 develop 上直接改代码/提交**；任何改动（含一行修复）都必须先从 develop
  切出对应类型分支（feature/optimize/fix），在分支上完成后再合入。
- **bug 修复也必须在 fix/* 分支上进行**，完成后合 develop+main 并发一个 PATCH release。
- 若发现已误在 main/develop 上产生未提交改动：先 stash → 切到正确的分支 → pop → 再提交。

### 缺陷修复流程（fix/*）

```bash
git checkout develop && git pull
git checkout -b fix/<短描述>              # 如 fix/result-type-narrowing
# 开发提交（fix: 类型）
git checkout develop && git merge --no-ff fix/<...> && git push
git checkout main    && git merge --no-ff fix/<...> && git push
# 然后按「发布步骤」切 release 打 PATCH tag；打完 tag 推送后再删本地分支
git checkout main && git branch -d fix/<...> && git branch -d release/v<X.Y.Z>
git branch                                # 应只剩 main、develop
```

- 线上已发布版本的紧急修复走 hotfix/*（从 main 切出，修完回合 main+develop）；
  开发期 bug 走 fix/*。

### 轻量优化流程（optimize/*）

> 适用场景：纯 UI/样式微调、文案/文档修改、小重构、依赖升级等
> **不引入新功能**且风险低的改动。分支命名比 feature 轻（无需任务编号），
> 但**完成后同样合 develop+main 并发一个 PATCH release**。

```bash
git checkout develop && git pull
git checkout -b optimize/<短描述>          # 如 optimize/hero-heading
# 开发提交（多用 fix/refactor/style/chore/docs 类型）
git checkout develop && git merge --no-ff optimize/<...> && git push
git checkout main    && git merge --no-ff optimize/<...> && git push
# 然后按下方「发布步骤」切 release 打 PATCH tag
git checkout main && git branch -d optimize/<...> && git branch -d release/v<X.Y.Z>
git branch                                # 应只剩 main、develop
```

- 区分不确定时的经验法则：改动引入/改变用户可感知的新行为 → feature；
  仅打磨现有行为/观感 → optimize。

### 任务开发完整流程（每个任务遵循）

1. **开分支**：从 `develop` 切出 feature 分支
   ```bash
   git checkout develop && git pull
   git checkout -b feature/<任务编号-短描述>   # 如 feature/m1-core-03-result-helper
   ```
2. **开发**：在 feature 分支提交（Conventional Commits，关联任务编号）
3. **任务完成 → 合入 develop 与 main**（先验证 `pnpm verify` 全绿）
   ```bash
   git checkout develop && git merge --no-ff feature/<...> && git push
   git checkout main    && git merge --no-ff feature/<...> && git push
   ```
4. **发布 → 切 release 分支并打 tag**
   ```bash
   git checkout -b release/v<X.Y.Z> develop
   # 只做版本号/CHANGELOG/阶段性修复，不加新功能
   git checkout main && git merge --no-ff release/v<X.Y.Z>
   git tag -a v<X.Y.Z> -m "release v<X.Y.Z>" && git push --follow-tags
   git push origin release/v<X.Y.Z>          # 远程 release 分支保留，作为发布留痕
   ```
5. **收尾 → 删除本地工作分支（tag 推送后立即执行）**
   ```bash
   git checkout main
   git branch -d feature/<...>
   git branch -d release/v<X.Y.Z>
   git branch                                 # 应只剩 main、develop
   ```

> 约定：feature 始终从 `develop` 切出；任务完成同时合回 `develop` 和 `main`；
> **无论大小任务，完成后都切 `release/vX.Y.Z` 合 `main` 并打 tag**。
> 单人开发可直推，团队协作走 PR（CI 全绿 + ≥ 1 人 Review）。

### 提交规范（Conventional Commits）

```text
<type>(<scope>): <subject>

type:  feat | fix | docs | refactor | test | chore | perf | style
scope: core | cli | docs | game | spec | adr | task | deps | ci
例：   feat(core): add Result type helpers
       docs(spec): 更新关卡机制解锁表（REQ-STG-005）
```

- **scope 取值限于上表**，不得自造。仓库当前无 `core`/`cli`/`docs` 之外的包，
  新增包时同步扩充此表。
- 提交必须关联任务编号或需求编号（如 `T-M1-04`、`REQ-STG-005`），
  可写在 subject 或正文。
- PR 必须关联任务编号，CI 全绿 + 至少 1 人 Review 后合入；
  合并后在对应 tasks 文档勾选并核对「覆盖」的需求 ID。

## 2. 代码规范

| 范围 | 规范 |
| --- | --- |
| TypeScript | Biome（`biome.json`）负责 lint 与 format；**不使用 ESLint/Prettier** |
| 类型 | `strict` 全开，另加 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`；禁止 `any` |
| 导入 | `verbatimModuleSyntax` 强制 `import type`；ESM 显式 `.js` 扩展名 |
| 包边界 | `packages/game-core` 必须零依赖，由 Biome `noRestrictedImports` + CI 强制 |
| Vue | 组件 PascalCase；组合式 API（`<script setup lang="ts">`） |
| 提交前 | `pnpm verify` 四项全绿（lint / typecheck / test / build） |

**`pnpm verify` 是唯一的提交门槛**，任何一项不通过都不得提交。

## 3. 文档维护约定（SDD 规格驱动）

需求以 `docs/game/` 为单一事实来源，按 **需求 → 设计 → 任务** 三层递进：

```text
docs/game/
├── requirements/    需求层（WHAT）—— 愿景、玩法、角色、关卡、策划、非功能
├── design/          设计层（HOW）—— 架构、模块、数据模型、跨端、ADR
├── tasks/           任务层（进度）—— 里程碑、任务拆解
└── sdd-guide.md     规格写法规范（编号规则、追溯要求、变更流程）
```

新功能或需求变更必须按顺序走：

```text
clarify（澄清，可选）→ specify（改需求 + changelog，评审通过）→ plan（定设计方案）
→ tasks（拆任务并标注覆盖的需求 ID）→ implement（开发，完成即勾选）
→ checklist（交付前逐条核对验收标准）
```

- **铁律：先改 spec 再写代码**，禁止「代码先行、文档后补」；
  spec 与实现不一致时，第一动作是修正 spec。
- 需求编号格式 `REQ-<域>-<三位序号>`，一经发布**不复用、不重排**；
  任务编号格式 `T-<里程碑>-<序号>`。
- 需求、设计、任务三者通过编号互相追溯。设计与任务若无法回指需求编号，
  说明它没有需求支撑 —— 应删除或补需求。

| 文档 | 更新时机 | 责任人 |
| --- | --- | --- |
| `requirements/*`（需求规格） | 需求变更时先改需求（含变更说明与日期），评审后进入开发 | 需求提出人 |
| `design/*`（技术方案） | 技术方案变更（先文档后编码） | 方案负责人 |
| `design/adr.md`（架构决策） | 难以逆转或跨模块的决策 | 决策提出人 |
| `tasks/*`（任务清单） | 任务完成即勾选 + 日期 + 验证结论 | 任务执行者 |
| `guide/*`（工程文档） | 工具链或工程结构变更 | 维护者 |

### 文档体量纪律

单条任务的「验证结论」**控制在 5 行以内**（口径 + 关键数值/证据 + 未覆盖项各一句）。
超长的原始数据、截图清单、踩坑记录、探针脚本**归档到 `.tmp/`**（该目录已 gitignore），
任务文档里只留**可复现的结论**。

> 背景：逐条堆叠完整实测记录会让任务文档膨胀，每次勾选都重写全文件、
> diff 噪声大且 merge 易冲突。

## 4. 环境与发布

| 环境 | 用途 | 部署方式 |
| --- | --- | --- |
| dev | 本地开发（`pnpm docs:dev`） | 手动 |
| preview | 文档构建产物预览（`pnpm docs:preview`） | 手动 |
| prod | 静态文档站部署 | 审批 + 灰度发布 |

- 发布窗口：周二/周四；周五不发布。
- 文档站为纯静态产物，发布即部署 `apps/docs/.vitepress/dist/`，
  无数据库变更，不涉及两阶段兼容。
- 版本号以**根 `package.json`** 为准；各子包版本号在发布时同步。

## 5. 缺陷管理

- 等级：P0（线上核心不可用，2h 响应）/ P1（主要功能异常，24h）/ P2（一般，排期）/
  P3（体验优化）。
- P0/P1 修复后必须补充回归用例与故障复盘（5 Why）。

## 追溯

本文件实现：ADR-0001（SDD 规格驱动开发）在工程协作层面的执行细则

相关：[SDD 规范](/game/sdd-guide) · [贡献流程](/guide/contributing) · [Monorepo 结构](/guide/monorepo)
