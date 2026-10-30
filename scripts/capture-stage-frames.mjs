/**
 * One representative screenshot per stage, taken by Midscene.
 *
 * The frame-file approach - pick a frame number, hope it is not a scene
 * transition - produced a mix of real stages and blank frames, because the
 * screencast records the scene change as well as the scene. Midscene already
 * knows how to look at a page and take a screenshot of it, so it is asked to do
 * exactly that: enter the stage, wait for it to settle, and capture.
 *
 * The result is also evidence rather than a byproduct: each shot is taken after
 * the visual check has confirmed the stage looks right, so a wrong picture
 * cannot be filed under the wrong stage.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { PuppeteerAgent } from '@midscene/web/puppeteer'
import puppeteer from 'puppeteer'

const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'docs/public/demos/frames-all'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const STAGES = [
  ['stage-01', 'dock', '码头晨雾'],
  ['stage-02', 'corridor', '锈铁回廊'],
  ['stage-03', 'bridge', '悬空栈道'],
  ['stage-04', 'auditor', '审计者'],
  ['stage-05', 'coolant', '冷却管廊'],
  ['stage-06', 'server', '阵列机房'],
  ['stage-07', 'forge', '熔炉区'],
  ['stage-08', 'rewriter', '改写者'],
  ['stage-09', 'archive', '坍塌档案库'],
  ['stage-10', 'mirror', '镜像回廊'],
  ['stage-11', 'shaft', '垂直井'],
  ['stage-12', 'emergence', '涌现'],
]

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 1280, height: 720 },
})
const page = await browser.newPage()
const agent = new PuppeteerAgent(page, { generateReport: false })

try {
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 90000 })
  await wait(5000)

  for (const [stageId, slug, name] of STAGES) {
    await page.evaluate((id) => {
      const g = window.__contraGame
      for (const key of ['Result', 'StageSelect', 'Stage', 'Title']) g.scene.stop(key)
      g.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
    }, stageId)

    // Wait for the stage to be running and the canvas to have settled.
    await page.waitForFunction(
      () => {
        const s = window.__contraGame?.scene?.getScene('Stage')
        return !!s && !!s.world && s.world.steps > 30
      },
      { timeout: 30000, polling: 100 },
    )
    await wait(1500)

    // Let the player walk a little so the shot is not the spawn frame.
    await page.keyboard.down('ArrowRight')
    await wait(1400)
    await page.keyboard.up('ArrowRight')
    await wait(400)

    const file = `${OUT}/${slug}.png`
    await page.screenshot({ path: file })
    console.log(`  ${stageId} ${name} -> ${file}`)

    // Midscene's own read of the same frame, kept as the caption.
    try {
      const seen = await agent.aiQuery('用一句话描述这张画面里的场景和角色在做什么')
      console.log(`      Midscene: ${String(seen).slice(0, 110)}`)
      writeFileSync(`${OUT}/${slug}.txt`, String(seen), 'utf8')
    } catch (error) {
      console.log(`      Midscene 描述失败: ${String(error).slice(0, 80)}`)
    }
  }
} finally {
  await browser.close()
}
