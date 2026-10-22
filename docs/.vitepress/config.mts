import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Contra',
  titleTemplate: ':title | Contra',
  description:
    'Contra 是一款横版跑轰动作游戏 —— 四个大模型拟人化的推理者并肩突袭，由 Claude 与 GPT 镇守的十二道封锁线。',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['**/README.md'],
  appearance: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#f4efe6' }],
    ['meta', { name: 'author', content: 'Contra Contributors' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Contra' }],
    [
      'meta',
      {
        property: 'og:description',
        content: '横版跑轰动作游戏 —— 四个推理者，十二道关卡，两个终局 Boss',
      },
    ],
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
      { text: '游戏', link: '/game/', activeMatch: '^/game/' },
      { text: '工作区', link: '/guide/', activeMatch: '^/guide/' },
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
            { text: '协作规范', link: '/guide/conventions' },
            { text: '贡献流程', link: '/guide/contributing' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/game/': [
        {
          text: '规格总览',
          collapsed: false,
          items: [
            { text: '游戏规格', link: '/game/' },
            { text: 'SDD 规范', link: '/game/sdd-guide' },
            { text: '需求层索引', link: '/game/requirements/' },
          ],
        },
        {
          text: '需求层',
          collapsed: false,
          items: [
            { text: '愿景与设计支柱', link: '/game/requirements/vision' },
            { text: '玩法规格', link: '/game/requirements/gameplay' },
            { text: '角色规格', link: '/game/requirements/characters' },
            { text: '角色视觉参考', link: '/game/requirements/character-references' },
            { text: 'Q 萌图库', link: '/game/requirements/chibi-gallery' },
            { text: '关卡规格', link: '/game/requirements/stages' },
            { text: '游戏策划文档', link: '/game/requirements/gdd' },
            { text: '非功能需求', link: '/game/requirements/nonfunctional' },
          ],
        },
        {
          text: '设计层',
          collapsed: false,
          items: [
            { text: '技术架构', link: '/game/design/architecture' },
            { text: '模块设计', link: '/game/design/modules' },
            { text: '数据模型', link: '/game/design/data-model' },
            { text: '跨端策略', link: '/game/design/cross-platform' },
            { text: '美术风格指南', link: '/game/design/art-style' },
            { text: '素材署名', link: '/game/design/credits' },
            { text: '形象与骨骼调研', link: '/game/design/animation-research' },
            { text: '动作帧提示词', link: '/game/design/sprite-prompts' },
            { text: '架构决策记录', link: '/game/design/adr' },
          ],
        },
        {
          text: '任务层',
          collapsed: false,
          items: [
            { text: '里程碑', link: '/game/tasks/milestones' },
            { text: '任务拆解', link: '/game/tasks/backlog' },
            { text: '非功能核对', link: '/game/tasks/nfr-checklist' },
            { text: '部署说明', link: '/game/tasks/deployment' },
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
