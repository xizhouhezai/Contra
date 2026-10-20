<script setup lang="ts">
const pillars = ['类型安全', '可组合', '文档即代码']
</script>

<template>
  <div class="riso-kicker">
    <div class="riso-kicker__rule" />
    <div class="riso-kicker__row">
      <span class="riso-kicker__tag">MONOREPO · v0.1.0</span>
      <span
        v-for="pillar in pillars"
        :key="pillar"
        class="riso-kicker__pillar"
      >
        {{ pillar }}
      </span>
    </div>
  </div>
</template>