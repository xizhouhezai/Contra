<script setup lang="ts">
const packages = [
  {
    name: '@contra/core',
    role: '库',
    desc: 'Result 类型、语义化版本工具、类型安全事件总线',
    accent: 'vermillion',
  },
  {
    name: '@contra/cli',
    role: '工具',
    desc: '参数解析与命令调度，消费 core 的类型契约',
    accent: 'teal',
  },
  {
    name: '@contra/docs',
    role: '站点',
    desc: 'VitePress 文档系统，承载指南与 API 参考',
    accent: 'ink',
  },
]

const edges = ['@contra/cli ──▶ @contra/core', '@contra/docs ──▶ 全部包']
</script>

<template>
  <section class="topology">
    <header class="topology__head">
      <h2 class="topology__title">工作区拓扑</h2>
      <p class="topology__lede">
        三个包，一条依赖主线。CLI 依赖 core，文档站覆盖全部。
      </p>
    </header>

    <ul class="topology__grid">
      <li
        v-for="pkg in packages"
        :key="pkg.name"
        class="topology__card"
        :data-accent="pkg.accent"
      >
        <span class="topology__role">{{ pkg.role }}</span>
        <code class="topology__name">{{ pkg.name }}</code>
        <span class="topology__desc">{{ pkg.desc }}</span>
      </li>
    </ul>

    <ul class="topology__edges">
      <li v-for="edge in edges" :key="edge">
        <span class="topology__arrow" aria-hidden="true">↳</span>
        {{ edge }}
      </li>
    </ul>
  </section>
</template>