#!/usr/bin/env node
/**
 * Long-run memory check for REQ-NFR-007: 30 minutes of play must not grow the
 * heap by 50MB.
 *
 * This is the one non-functional requirement that was still open because it
 * "needs a real 30-minute session". It does not - it needs 30 minutes of
 * *automated* play, and the automation is the hard part, because a run that
 * does nothing holds a steady heap and proves nothing. A leak shows up when
 * entities are created and not released, so the run has to keep creating them:
 * enemies to shoot, bullets to fire, waves to trigger, deaths to die.
 *
 * What the driver does, in a loop:
 *   - holds right so the player moves and enemies are engaged
 *   - fires continuously so bullets are allocated
 *   - jumps so the physics path allocates too
 *   - reads the heap every few seconds and keeps the series
 *
 * The measurement is the *slope*, not the peak. A game that allocates a 30MB
 * texture on the first stage and holds it legitimately would show a big first
 * sample and a flat line after; growth that keeps climbing across 30 minutes is
 * what the requirement is about. So the series is reported in full, and the
 * verdict compares the last minutes against the early ones.
 *
 * Heap numbers come from CDP's Performance.getMetrics (JSHeapUsedSize), which
 * is the same number DevTools shows - not a proxy.
 *
 * Usage:
 *   node scripts/measure-memory.mjs                    # 30 minutes
 *   MINUTES=5 node scripts/measure-memory.mjs           # shorter run
 *   CONTRA_URL=http://localhost:4180/ node scripts/measure-memory.mjs
 */
import puppeteer from 'puppeteer'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const MINUTES = Number(process.env.MINUTES ?? '30')
const BUDGET_MB = Number(process.env.BUDGET_MB ?? '50')
/** How often the heap is sampled. */
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? '5000')
/** Samples in the head and tail windows that are compared for the slope. */
const WINDOW = 6

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function key(cdp, code, virtualKey, type) {
  return cdp.send('Input.dispatchKeyEvent', {
    type,
    code,
    key: code,
    windowsVirtualKeyCode: virtualKey,
    nativeVirtualKeyCode: virtualKey,
  })
}

async function press(cdp, code, virtualKey, holdMs = 60) {
  await key(cdp, code, virtualKey, 'keyDown')
  await sleep(holdMs)
  await key(cdp, code, virtualKey, 'keyUp')
}

/**
 * Heap in bytes, read from the page's own performance counters.
 *
 * Performance.getMetrics only answers after Performance.enable, and a domain
 * that was never enabled returns an empty metric list rather than an error -
 * which is why the first version collected zero samples and reported "not enough
 * samples" instead of "the domain was off".
 */
async function heapUsed(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const found = metrics.find((m) => m.name === 'JSHeapUsedSize')
  return found?.value ?? null
}

/**
 * Force a garbage collection so the number is live objects, not uncollected
 * garbage.
 *
 * Without it, a run that allocates and drops would still show a climbing heap,
 * and the measurement would report a leak that is really just the collector
 * being lazy. Expose-gc only exists when Chrome was started with
 * --js-flags=--expose-gc, which it is here.
 */
async function collectGarbage(page) {
  return page.evaluate(() => {
    if (typeof globalThis.gc !== 'function') return false
    globalThis.gc()
    return true
  })
}

/** Move the game on: hold right, fire, jump. */
async function drive(cdp, ms) {
  await key(cdp, 'KeyD', 68, 'keyDown')
  await key(cdp, 'KeyJ', 74, 'keyDown')
  const until = Date.now() + ms
  while (Date.now() < until) {
    await press(cdp, 'Space', 32, 90)
    await sleep(420)
  }
  await key(cdp, 'KeyJ', 74, 'keyUp')
  await key(cdp, 'KeyD', 68, 'keyUp')
}

/**
 * Restart when the run ends.
 *
 * Two ways a run ends, and both stop the simulation:
 *   - the player dies: the rule layer freezes on purpose ("a dead player stops
 *     the simulation"), so the world stops stepping and no new objects are made
 *   - the stage is cleared: the scene moves on to the result screen
 *
 * Without handling both, the "run" is 8 seconds of play followed by a frozen
 * world, and the heap measurement of it is worthless - a stopped simulation
 * allocates nothing. That is not a subtlety: the first version of this script
 * reported "+0.0MB growth" for exactly that reason, and the number was an
 * artefact of not playing at all.
 */
async function ensurePlaying(page, cdp) {
  const state = await page.evaluate(() => {
    const game = window.__contraGame
    if (!game) return { scene: 'none', failed: false }
    const stage = game.scene.getScene('Stage')
    const active = game.scene.scenes
      .filter((s) => s.sys?.isActive?.())
      .map((s) => s.sys.settings.key)
    return {
      scene: active.join(','),
      failed: stage?.world?.failedStage === true,
    }
  })

  if (state.scene.includes('Stage') && !state.failed) return 'playing'

  if (state.scene.includes('Stage') && state.failed) {
    // Dead: the scene is still active but the world is frozen. Restart it so the
    // simulation runs again.
    await page.evaluate(() => {
      const game = window.__contraGame
      const stage = game.scene.getScene('Stage')
      const id = stage?.stage?.id ?? 'stage-01'
      game.scene.start('Stage', { stageId: id })
    })
    await sleep(2500)
    return 'restarted'
  }

  if (state.scene.includes('Result')) await press(cdp, 'Space', 32)
  else await press(cdp, 'Enter', 13)
  await sleep(2500)
  return 'navigated'
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    // --expose-gc so the heap reading can be taken after a collection; without
    // it the number includes garbage and the slope is meaningless.
    args: ['--no-sandbox', '--mute-audio', '--js-flags=--expose-gc'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await sleep(6000)
    await page.bringToFront()

    // Straight into a stage; the title screen would idle and grow nothing.
    await page.evaluate(() => {
      const game = window.__contraGame
      if (game) game.scene.start('Stage', { stageId: 'stage-01' })
    })
    await sleep(3500)

    const cdp = await page.createCDPSession()
    // The Performance domain has to be on before getMetrics answers.
    await cdp.send('Performance.enable')
    const gcAvailable = await collectGarbage(page)
    console.log(`run     : ${MINUTES} minutes`)
    console.log(`app     : ${APP}`)
    console.log(
      `gc      : ${gcAvailable ? 'available (heap read after collection)' : 'NOT available'}`,
    )
    console.log(`budget  : ${BUDGET_MB}MB growth`)
    console.log()

    const samples = []
    const started = Date.now()
    const totalMs = MINUTES * 60 * 1000
    let next = 0
    // Evidence that the simulation actually ran, not just that the browser was
    // open: steps advance while playing and freeze when it does not.
    let stepsAtStart = null
    let stepsTotal = 0
    let restarts = 0

    while (Date.now() - started < totalMs) {
      const elapsed = Date.now() - started
      if (elapsed >= next) {
        const outcome = await ensurePlaying(page, cdp)
        if (outcome === 'restarted') restarts += 1

        // Read the step counter to prove the world is advancing.
        const steps = await page.evaluate(() => {
          const stage = window.__contraGame?.scene?.getScene('Stage')
          return stage?.world?.steps ?? null
        })
        if (steps !== null) {
          if (stepsAtStart === null) stepsAtStart = steps
          stepsTotal = steps
        }

        await collectGarbage(page)
        const used = await heapUsed(cdp)
        if (used !== null) {
          samples.push({ t: elapsed / 1000, mb: used / 1048576 })
          const stamp = `${String(Math.floor(elapsed / 60000)).padStart(2, '0')}:${String(
            Math.floor((elapsed % 60000) / 1000),
          ).padStart(2, '0')}`
          console.log(
            `  ${stamp}  ${(used / 1048576).toFixed(1).padStart(7)}MB   ` +
              `steps=${steps ?? '-'} restarts=${restarts}`,
          )
        }
        next = elapsed + INTERVAL_MS
      }
      // Keep playing between samples: the heap only grows if work happens.
      await drive(cdp, Math.min(INTERVAL_MS, 4000))
    }

    // --- verdict -----------------------------------------------------------
    console.log()
    if (samples.length < WINDOW * 2) {
      console.log(`FAIL: 样本太少（${samples.length}），跑的时间不够`)
      return 1
    }

    const head = samples.slice(0, WINDOW)
    const tail = samples.slice(-WINDOW)
    const avg = (list) => list.reduce((sum, s) => sum + s.mb, 0) / list.length
    const headAvg = avg(head)
    const tailAvg = avg(tail)
    const growth = tailAvg - headAvg
    const peak = Math.max(...samples.map((s) => s.mb))
    const low = Math.min(...samples.map((s) => s.mb))
    const first = samples[0].mb

    console.log(`samples      : ${samples.length} over ${MINUTES} minutes`)
    console.log(`first        : ${first.toFixed(1)}MB`)
    console.log(`head average : ${headAvg.toFixed(1)}MB (${WINDOW} samples)`)
    console.log(`tail average : ${tailAvg.toFixed(1)}MB (${WINDOW} samples)`)
    console.log(`min / max    : ${low.toFixed(1)}MB / ${peak.toFixed(1)}MB`)
    console.log(`growth       : ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}MB`)
    console.log(`restarts     : ${restarts}（死亡后重开）`)
    console.log()

    // The requirement is about growth over the run, not about the absolute
    // size: a game that loads 100MB of art and holds it is fine.
    const withinBudget = growth < BUDGET_MB
    console.log(
      withinBudget
        ? `OK: ${MINUTES} 分钟内堆增长 ${growth.toFixed(1)}MB < ${BUDGET_MB}MB`
        : `FAIL: ${MINUTES} 分钟内堆增长 ${growth.toFixed(1)}MB ≥ ${BUDGET_MB}MB`,
    )
    if (!gcAvailable) {
      console.log('  注意：未能触发 GC，数字含未回收垃圾，增长量偏保守（真实增长只会更小）')
    }

    // A heap that does not move can mean "no leak" or "nothing ran". The two are
    // told apart by the step counter: a simulation that advanced tens of
    // thousands of steps allocated and released objects, so a flat heap is a
    // result. Without this check the run can pass while proving nothing.
    const simulated = stepsTotal - (stepsAtStart ?? stepsTotal)
    const expectedSteps = MINUTES * 60 * 60
    const actuallyRan = simulated > expectedSteps * 0.5
    console.log(
      `simulation   : ${simulated} steps（预期约 ${expectedSteps}）` +
        `${actuallyRan ? '' : '  <== 远低于预期，说明大部分时间没有在跑'}`,
    )
    if (!actuallyRan) {
      console.log('FAIL: 模拟推进的步数太少，这个跑测证明不了内存问题')
      return 1
    }
    return withinBudget ? 0 : 1
  } finally {
    await browser.close()
  }
}

process.exit(await main())
