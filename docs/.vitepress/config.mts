import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Contra',
  titleTemplate: ':title | Contra',
  description:
    'Contra 是一个 pnpm monorepo 工作区，将类型安全的核心库、命令行工具与这套文档系统组织在一起。',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  srcExclude: ['**/README.md'],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#f4efe6' }],
    ['meta', { name: 'author', content: 'Contra Contributors' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Contra' }],
    ['meta', { property: 'og:description', content: '类型安全的核心库、命令行工具与文档系统' }],
  ],

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'vitesse-light',
      dark: 'vitesse-dark',
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'Contra' },
    siteTitle: 'Contra',

    nav: [
      { text: '指南', link: '/guide/', activeMatch: '^/guide/' },
      { text: 'API', link: '/api/core', activeMatch: '^/api/' },
      { text: '示例', link: '/examples/', activeMatch: '^/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '概览', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'Monorepo 结构', link: '/guide/monorepo' },
          ],
        },
        {
          text: '文档系统',
          collapsed: false,
          items: [
            { text: '编写文档', link: '/guide/docs-system' },
            { text: '设计语言', link: '/guide/design-language' },
          ],
        },
        {
          text: '协作',
          collapsed: true,
          items: [
            { text: '贡献流程', link: '/guide/contributing' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          collapsed: false,
          items: [
            { text: '@contra/core', link: '/api/core' },
            { text: '@contra/cli', link: '/api/cli' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          collapsed: false,
          items: [
            { text: '概览', link: '/examples/' },
            { text: '自定义主题组件', link: '/examples/custom-theme' },
          ],
        },
      ],
    },

    outline: { level: [2, 3], label: '本页目录' },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
        },
      },
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/contra/contra' }],

    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdatedText: '最后更新于',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    externalLinkIcon: true,

    footer: {
      message: '用类型构建，用文档表达。',
      copyright: 'MIT License — Contra Contributors',
    },

    sidebarWidth: '288px',
  },
})
