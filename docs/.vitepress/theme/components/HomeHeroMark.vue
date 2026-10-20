<script setup lang="ts">
const pillars = ['横版跑轰', '12 关战役', '规格驱动']
</script>

<template>
  <div class="riso-kicker">
    <div class="riso-kicker__rule" />
    <div class="riso-kicker__row">
      <span class="riso-kicker__tag">SIDE-SCROLLING RUN & GUN · v0.1.0</span>
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
