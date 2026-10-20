import DefaultTheme from 'vitepress/theme'
import { h, type Theme } from 'vue'

import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'

import HomeHeroMark from './components/HomeHeroMark.vue'
import PackageTopology from './components/PackageTopology.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-info-before': () => h(HomeHeroMark),
      'home-hero-image': () => h('div', { class: 'riso-stamp' }, 'EST. 2025'),
      'home-features-after': () => h(PackageTopology),
    }),
} satisfies Theme
