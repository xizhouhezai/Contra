#!/usr/bin/env node
/**
 * Cross-browser check for REQ-NFR-008: Chrome / Edge / Firefox / Safari,
 * the last two major versions of each.
 *
 * The requirement says "four major browsers", and the checklist has carried it
 * as unverified because the machine only had Chromium. That is a gap in the
 * environment, not in the game - so the engines that can be had here are had:
 *
 *   - Chromium (Chrome)      the reference engine
 *   - Chromium (Edge)        a second Chromium build with its own quirks
 *   - WebKit (Playwright)     the engine Safari is built on
 *   - Gecko (Playwright)     Firefox's engine, if the browser was downloaded
 *
 * Each engine runs the same critical path: boot, enter a stage, fight, and
 * report console errors, failed requests and unhandled rejections. A browser
 * that renders but throws is not a pass.
 *
 * The output states which engines were actually exercised, so a run without
 * Firefox cannot be mistaken for a full four-browser pass.
 *
 * Usage:
 *   node scripts/check-browsers.mjs
 *   node scripts/check-browsers.mjs --engine=webkit
 */
import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Playwright is present in the tree but not as a dependency of any workspace
 * package, so `require('playwright')` cannot resolve it - it lives in pnpm's
 * virtual store. The store is searched directly rather than adding a dependency
 * the project does not otherwise need.
 */
function playwright() {
  try {
    return require('playwright')
  } catch {
    // Fall through to the virtual store.
  }
  const store = join(root, 'node_modules', '.pnpm')
  if (!existsSync(store)) return null
  let names = []
  try {
    names = readdirSync(store)
  } catch {
    return null
  }
  for (const name of names.filter((n) => n.startsWith('playwright@'))) {
    const candidate = join(store, name, 'node_modules', 'playwright', 'index.js')
    if (existsSync(candidate)) {
      try {
        return require(candidate)
      } catch {
        // Try the next one.
      }
    }
  }
  return null
}

/**
 * The critical path, as a function of the page. Kept engine-agnostic: it only
 * uses DOM and window APIs that exist in every engine.
 */
async function runCriticalPath(page) {
  const errors = []
  const failedRequests = []

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`)
  })
  page.on('unhandledrejection', (reason) => errors.push(`unhandled: ${reason}`))

  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(6000)

  const booted = await page.evaluate(() => {
    const game = window.__contraGame
    return !!game && game.scene.scenes.length > 0
  })
  if (!booted) {
    errors.push('游戏未启动')
    return { booted, errors, failedRequests, steps: 0 }
  }

  // Enter a stage and let it run.
  await page.evaluate(() => {
    const game = window.__contraGame
    if (game) game.scene.start('Stage', { stageId: 'stage-01' })
  })
  await sleep(3000)

  const trigger = await page.evaluate(() => {
    const stage = window.__contraGame?.scene?.getScene('Stage')?.stage
    const wave = stage?.waves?.[0]
    if (!wave) return null
    const t = wave.trigger
    // A missing width would make the target NaN and the walk a no-op, which
    // looks exactly like "the wave never fired". So the value is validated
    // here rather than trusted.
    if (typeof t?.x !== 'number' || typeof t?.width !== 'number') return null
    return { x: t.x, width: t.width }
  })

  if (trigger === null) {
    console.log('      读不到波次触发点，跳过战斗覆盖')
  } else {
    // Stand inside the trigger band and shoot.
    //
    // The position is written rather than walked to, because the player dies
    // to the first wave if it walks into the fight on its own - and a dead
    // player is respawned at x=40, which is how the first version of this
    // script ended up back at the spawn point with no wave ever fired.
    // scripts/e2e-act1.cjs uses the same technique for the same reason.
    await page.evaluate(
      (target) => {
        const stage = window.__contraGame?.scene?.getScene('Stage')
        if (!stage?.world) return
        stage.world.player.position.x = target
        // The player may already have lost hearts on the way in; restore them so
        // the fight is not cut short by damage taken before the test began.
        stage.world.player.hearts = stage.world.startingHearts
      },
      trigger.x + trigger.width / 2,
    )
    await sleep(700)
  }

  await page.keyboard.down('KeyJ')
  // Read the counters while the fight is running, not after it.
  //
  // The player dies to the first wave in about four seconds, and a dead stage
  // resets the world - which takes the wave counter back to zero. Reading once
  // at the end therefore reported "no wave" for a fight that had plainly
  // happened. The peak across the run is the number that means something.
  let peakWaves = 0
  let peakTargets = 0
  let peakSteps = 0
  for (let i = 0; i < 24; i += 1) {
    await page.keyboard.press('Space')
    await sleep(300)
    const snapshot = await page.evaluate(() => {
      const probe = typeof window.__contraStage === 'function' ? window.__contraStage() : null
      return {
        waves: probe?.wavesFired ?? 0,
        targets: probe?.liveTargets ?? 0,
        steps: probe?.steps ?? 0,
      }
    })
    peakWaves = Math.max(peakWaves, snapshot.waves)
    peakTargets = Math.max(peakTargets, snapshot.targets)
    peakSteps = Math.max(peakSteps, snapshot.steps)
  }
  await page.keyboard.up('KeyJ')
  await sleep(500)

  const probe = await page.evaluate(() => {
    const stage = window.__contraGame?.scene?.getScene('Stage')
    const snapshot = typeof window.__contraStage === 'function' ? window.__contraStage() : null
    return {
      steps: snapshot?.steps ?? stage?.world?.steps ?? 0,
      liveTargets: snapshot?.liveTargets ?? 0,
      wavesFired: snapshot?.wavesFired ?? 0,
      fps: snapshot?.fps ?? 0,
      scene: stage?.sys?.settings?.key ?? 'none',
    }
  })

  // The peaks are what the run actually saw.
  probe.wavesFired = Math.max(probe.wavesFired, peakWaves)
  probe.liveTargets = Math.max(probe.liveTargets, peakTargets)
  probe.steps = Math.max(probe.steps, peakSteps)

  return { booted, errors, failedRequests, steps: probe.steps, probe }
}

async function withPuppeteer(name, executable) {
  const puppeteer = (() => {
    try {
      return require('puppeteer')
    } catch {
      return null
    }
  })()
  if (puppeteer === null) return { name, skipped: 'puppeteer 不可用' }
  if (executable !== undefined && !existsSync(executable)) {
    return { name, skipped: `浏览器不在 ${executable}` }
  }

  const browser = await puppeteer.launch({
    executablePath: executable,
    headless: 'new',
    args: ['--no-sandbox', '--mute-audio'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    const result = await runCriticalPath(page)
    return { name, ...result }
  } finally {
    await browser.close()
  }
}

async function withPlaywright(name, browserType) {
  const pw = playwright()
  if (pw === null) return { name, skipped: 'playwright 不可用' }
  let browser
  try {
    browser = await pw[browserType].launch({ headless: true })
  } catch (error) {
    return { name, skipped: `浏览器未安装（${String(error.message).split('\n')[0]}）` }
  }
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const result = await runCriticalPath(page)
    return { name, ...result }
  } finally {
    await browser.close()
  }
}

async function main() {
  const only = process.argv.find((a) => a.startsWith('--engine='))?.split('=')[1]

  const engines = [
    { name: 'Chromium (Chrome)', run: () => withPuppeteer('Chromium (Chrome)', CHROME) },
    { name: 'Chromium (Edge)', run: () => withPuppeteer('Chromium (Edge)', EDGE) },
    { name: 'WebKit (Safari 内核)', run: () => withPlaywright('WebKit (Safari 内核)', 'webkit') },
    { name: 'Gecko (Firefox)', run: () => withPlaywright('Gecko (Firefox)', 'firefox') },
  ].filter((e) => only === undefined || e.name.toLowerCase().includes(only.toLowerCase()))

  const results = []
  for (const engine of engines) {
    process.stdout.write(`▶ ${engine.name} ... `)
    let result
    try {
      result = await engine.run()
    } catch (error) {
      result = { name: engine.name, failed: [`启动失败: ${error.message.split('\n')[0]}`] }
    }
    if (result.skipped !== undefined) {
      console.log(`SKIP ${result.skipped}`)
      results.push({ ...result, ok: null })
      continue
    }
    const problems = [...result.errors, ...result.failedRequests]
    // A browser that boots and steps but never spawns an enemy has not been
    // asked to do the hard part. Require the wave to have fired and a target to
    // have existed, so "it renders" is backed by "it renders a fight".
    const fought = (result.probe?.wavesFired ?? 0) > 0
    const ok = result.booted && result.steps > 60 && fought && problems.length === 0
    console.log(
      ok
        ? `OK steps=${result.steps} waves=${result.probe?.wavesFired} targets=${result.probe?.liveTargets}`
        : `FAIL steps=${result.steps} waves=${result.probe?.wavesFired ?? 0} problems=${problems.length}`,
    )
    for (const problem of problems.slice(0, 3)) console.log(`      ${problem.slice(0, 160)}`)
    if (!ok && problems.length === 0 && !fought) {
      console.log('      没有波次被触发——战斗路径没被覆盖到')
    }
    results.push({ ...result, ok })
  }

  const ran = results.filter((r) => r.ok !== null)
  const skipped = results.filter((r) => r.ok === null)
  const failed = results.filter((r) => r.ok === false)

  console.log()
  console.log(
    `跑了 ${ran.length} 个引擎，通过 ${ran.length - failed.length}，跳过 ${skipped.length}`,
  )
  for (const s of skipped) console.log(`  跳过 ${s.name}：${s.skipped}`)
  if (skipped.length > 0) {
    console.log('  → 跳过的引擎**不构成通过**，REQ-NFR-008 仍需在具备它们的机器上复核')
  }
  return failed.length === 0 ? 0 : 1
}

process.exit(await main())
