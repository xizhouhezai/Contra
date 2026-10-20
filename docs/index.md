---
layout: home

hero:
  name: Contra
  text: 类型驱动的 monorepo
  tagline: 核心库、命令行工具与文档系统，共用一套严格类型契约。三个包，一条依赖主线，pnpm 工作区统一管理。
  image:
    src: /logo.svg
    alt: Contra
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 API
      link: /api/core

features:
  - title: 类型即契约
    details: core 包以 Result 判别联合替代异常，调用方必须显式处理失败分支，编译期即暴露遗漏的处理逻辑。
  - title: 零配置工作区
    details: pnpm workspace 定义包拓扑，TypeScript project references 建立增量构建链，改一个包只重编依赖它的下游。
  - title: 文档即代码
    details: VitePress 与源码同仓同版本，指南、API 参考与示例站由同一份配置驱动，构建失败即阻断发布。
---

<div class="riso-note">

**一句话概括** — Contra 把「库、工具、文档」三件事放进同一个工作区：
core 定义类型契约，cli 消费契约，docs 解释契约。

</div>
