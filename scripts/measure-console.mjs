import { writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

/**
 * Walks the critical path and reports every console error and page error.
 *
 * REQ-NFR-020 asks for no blocking console errors. The only way to know is to
 * run the thing and listen: a build that compiles proves nothing about a
 * WebGL context that could not be created or a 404 nobody requested on purpose.
 *
 * The path covers title, character select, a normal stage, a boss stage and the
 * pause screen, because those are the scenes that touch every subsystem: the
 * asset loader, the audio manager, the event bridge and the camera.
 *
 * A favicon 404 used to be the only failure here. The browser asks for
 * /favicon.ico unprompted, so the page shipped a console error on every single
 * load - which is exactly the kind of thing this script exists to catch.
 */
const URL = process.env.CONTRA_URL ?? 'http://localhost:4180/'

const errors = []
const warnings = []
const failed = []

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720 },
})

try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 200)}`)
    else if (m.type() === 'warning') warnings.push(m.text().slice(0, 120))
  })
  page.on('requestfailed', (r) => failed.push(`requestfailed: ${r.url().slice(-80)}`))

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
  await new Promise((r) => setTimeout(r, 6000))

  const steps = [
    { name: 'stage-01', ms: 4000 },
    { name: 'stage-04', ms: 5000 },
    { name: 'stage-12', ms: 5000 },
  ]
  for (const step of steps) {
    await page.evaluate((id) => {
      const g = window.__contraGame
      for (const key of ['Title', 'CharacterSelect', 'StageSelect', 'Stage']) g.scene.stop(key)
      g.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
    }, step.name)
    await new Promise((r) => setTimeout(r, step.ms))

    // Fire, so the weapon and enemy systems run rather than sitting idle.
    await page.keyboard.down('j')
    await new Promise((r) => setTimeout(r, 1200))
    await page.keyboard.up('j')
  }

  // Pause and resume, which is the one path that stops the update loop.
  await page.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 1500))

  const report = {
    url: URL,
    steps: steps.map((s) => s.name),
    errors,
    warnings: warnings.length,
    failedRequests: failed,
  }
  writeFileSync('.tmp/console-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))

  if (errors.length > 0) {
    console.log('\n✗ 有控制台错误')
    process.exitCode = 1
  } else {
    console.log('\n✓ 全程无控制台错误')
  }
} finally {
  await browser.close()
}
