/**
 * Visual check of the character select screen (Midscene).
 *
 * The unit tests and the CDP smoke test both assert on state: a scene is
 * active, an id was carried through, the player moved. None of them can see
 * that the six characters are drawn as coloured blocks instead of the actual
 * artwork, because the artwork was never loaded and nothing failed.
 *
 * This asks a vision model what is actually on screen, and checks the two
 * things that only pixels can answer: that each card carries a portrait, and
 * that the text is legible.
 *
 * Requirements: a running preview server, and the Midscene bridge that the
 * dsh-midscene plugin exposes. The model configuration is read from the
 * bridge - no API key is needed here.
 *
 * Usage:
 *   python scripts/e2e-browser.py
 *   node scripts/visual-check.mjs
 */
import { PuppeteerAgent } from '@midscene/web/puppeteer'
import puppeteer from 'puppeteer'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'

const checks = []
function check(name, ok, detail) {
  checks.push({ name, ok })
  console.log(`${ok ? '  OK  ' : ' FAIL '}${name}${detail === undefined ? '' : `  ${detail}`}`)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((resolve) => setTimeout(resolve, 7000))

  // Focus matters: a background tab receives no keyboard events at all, and
  // the action "press Enter to start" silently does nothing. Bringing the tab
  // forward first is what makes the visual actions land.
  await page.bringToFront()

  const agent = new PuppeteerAgent(page, { generateReport: false })

  await agent.aiAction('按下 Enter 键进入角色选择界面')
  await new Promise((resolve) => setTimeout(resolve, 2500))

  // The model answers in its own shape - a list, or an object with a count and
  // a nested list - so the check counts names rather than asserting a format.
  const names = await agent.aiQuery('这个界面上有几张角色卡片？分别是什么角色的名字？')
  const nameText = JSON.stringify(names)
  const expected = ['DeepSeek', 'Qwen', '豆包', 'GLM', 'Kimi', 'Gemini']
  const matched = expected.filter((name) => nameText.includes(name))
  check('六个角色都在界面上', matched.length === 6, `找到 ${matched.length}/6`)

  const portraits = await agent.aiBoolean(
    '这六张卡片上，每一张都有一张人物插画（一个角色的形象）吗？' +
      '如果卡片上只有文字和空白色块、没有人物插画，请回答 false。',
  )
  check('每个角色都有立绘', portraits === true)

  const legible = await agent.aiBoolean(
    '界面上的文字（角色名、武器、被动、炸弹）都能清楚读出来吗？' +
      '如果文字模糊到难以辨认，请回答 false。',
  )
  check('文字清晰可读', legible === true)
} finally {
  await browser.close()
}

const failed = checks.filter((entry) => !entry.ok).length
console.log('')
if (failed > 0) {
  console.log(`✗ ${failed}/${checks.length} 项未通过`)
  process.exit(1)
}
console.log(`✓ ${checks.length} 项全部通过`)
