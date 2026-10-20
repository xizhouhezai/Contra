<script setup lang="ts">
const roster = [
  {
    name: 'DeepSeek',
    codename: '蓝色大肥鱼',
    role: '范围压制',
    weapon: '扩散散弹',
    passive: '扩散之芯',
    accent: 'vermillion',
  },
  {
    name: 'Qwen',
    codename: '千问',
    role: '远程狙击',
    weapon: '长程连射',
    passive: '远见',
    accent: 'teal',
  },
  {
    name: '豆包',
    codename: 'DouBao',
    role: '辅助支援',
    weapon: '追踪弹幕',
    passive: '粘性追踪',
    accent: 'ochre',
  },
  {
    name: 'GLM',
    codename: '哥林姆',
    role: '均衡续航',
    weapon: '均衡脉冲',
    passive: '均衡律动',
    accent: 'ink',
  },
  {
    name: 'Kimi',
    codename: '月读',
    role: '记忆延迟',
    weapon: '回溯弹',
    passive: '长上下文',
    accent: 'silver',
  },
  {
    name: 'Gemini',
    codename: '双子',
    role: '多目标',
    weapon: '棱镜弹',
    passive: '多模态',
    accent: 'prism',
  },
]

const bosses = [
  {
    name: 'Claude',
    forms: ['审计者', '改写者'],
    accent: 'vermillion',
  },
  {
    name: 'GPT',
    forms: ['语料', '涌现'],
    accent: 'teal',
  },
]
</script>

<template>
  <section class="topology">
    <header class="topology__head">
      <h2 class="topology__title">可选角色</h2>
      <p class="topology__lede">
        六位并肩作战的推理者。初始武器、被动与炸弹各不相同，
        六种打法互不重叠。
      </p>
    </header>

    <ul class="topology__grid">
      <li
        v-for="member in roster"
        :key="member.name"
        class="topology__card"
        :data-accent="member.accent"
      >
        <span class="topology__role">{{ member.role }}</span>
        <code class="topology__name">{{ member.name }}</code>
        <span class="topology__desc">{{ member.codename }}</span>
        <dl class="topology__stats">
          <dt>初始武器</dt>
          <dd>{{ member.weapon }}</dd>
          <dt>被动</dt>
          <dd>{{ member.passive }}</dd>
        </dl>
      </li>
    </ul>

    <header class="topology__head topology__head--minor">
      <h2 class="topology__title">终极 Boss</h2>
      <p class="topology__lede">
        两位主体，各具两副形态。形态之间是质变，不是数值堆叠。
      </p>
    </header>

    <ul class="topology__grid topology__grid--boss">
      <li
        v-for="boss in bosses"
        :key="boss.name"
        class="topology__card"
        :data-accent="boss.accent"
      >
        <span class="topology__role">终局</span>
        <code class="topology__name">{{ boss.name }}</code>
        <span class="topology__desc">
          形态 I「{{ boss.forms[0] }}」 · 形态 II「{{ boss.forms[1] }}」
        </span>
      </li>
    </ul>
  </section>
</template>
