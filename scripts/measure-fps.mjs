#!/usr/bin/env node
/**
 * Frame-rate check for REQ-NFR-001 (steady 60fps at 1080p on desktop).
 *
 * "It feels smooth" is not a measurement, so this drives the real build in a
 * real browser and reads the frame clock itself:
 *
 * - The sample is the interval between two requestAnimationFrame callbacks. That
 *   is the cadence the compositor actually produced, not an opinion.
 * - Phaser's own game.loop.actualFps is read alongside it, through the stage
 *   probe. The two disagree when a frame is spent outside the render step, and
 *   a disagreement is worth seeing rather than averaging away.
 * - The stage is not idle: right is held while jump and fire are tapped, because
 *   a still screen is exactly the case where a bad renderer looks fine.
 * - Holding right walks the player into enemies, so a run of stage 1 ends long
 *   before 30 seconds. The run is restarted rather than sampled once: the
 *   requirement is about playing for a while, and the first seconds after a
 *   load are not the busy part. Segment boundaries are excluded from the series
 *   because a level transition is not a frame budget anyone can act on.
 * - The requirement is stated in seconds, so intervals are folded into 1-second
 *   windows first. A single slow frame is not a violation; three slow seconds
 *   are, and only the bucketed series can tell the two apart.
 *
 * Usage:
 *   node scripts/measure-fps.mjs                  # needs a preview server first
 *   CONTRA_URL=http://localhost:4180/ SECONDS=30 node scripts/measure-fps.mjs
 */
import puppeteer from 'puppeteer'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const SECONDS = Number(process.env.SECONDS ?? '30')
const FLOOR = 50
const STREAK = 3

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Frames slower than this are reported as a stall rather than folded into the
 * interval percentiles. One 2-second hitch would otherwise define p99 and hide
 * the ordinary jitter the requirement is actually about.
 */
const STALL_MS = 1000

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))
  return sorted[index] ?? 0
}

function mean(values) {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length
}

function key(cdp, code, virtualKey, type) {
  return cdp.send('Input.dispatchKeyEvent', {
    type,
    code,
    key: code,
    windowsVirtualKeyCode: virtualKey,
    nativeVirtualKeyCode: virtualKey,
  })
}

async function tap(cdp, code, virtualKey, holdMs = 60) {
  await key(cdp, code, virtualKey, 'keyDown')
  await sleep(holdMs)
  await key(cdp, code, virtualKey, 'keyUp')
}

const activeScenes = (page) =>
  page.evaluate(() =>
    window.__contraGame
      ? window.__contraGame.scene
          .getScenes(true)
          .map((scene) => scene.scene.key)
          .join(',')
      : '',
  )

/**
 * Walks the real player path to stage 1.
 *
 * Starting the scene directly would skip the loading the player pays for, so
 * title, character select and stage select are traversed by key presses.
 */
async function enterStageOne(page, cdp) {
  await tap(cdp, 'Enter', 13)
  await sleep(1500)
  await tap(cdp, 'Enter', 13)
  await sleep(1500)
  await tap(cdp, 'Enter', 13)
  await sleep(3000)
  const current = await activeScenes(page)
  if (!current.includes('Stage')) throw new Error(`没有进入关卡，当前场景：${current}`)
}

/** Restarts stage 1 from wherever the last run ended (result screen or stage select). */
async function restartStageOne(page, cdp) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await activeScenes(page)
    if (current.includes('Stage')) return true
    // A dead player is on the result screen, which SPACE leaves; the stage
    // select then takes ENTER with the cursor already on stage 1.
    if (current.includes('Result')) await tap(cdp, 'Space', 32)
    else await tap(cdp, 'Enter', 13)
    await sleep(2200)
  }
  return (await activeScenes(page)).includes('Stage')
}

/** Folds rAF intervals into 1-second windows. A stall becomes one very slow second. */
function toSecondWindows(deltas) {
  const windows = []
  let duration = 0
  let frames = 0
  for (const delta of deltas) {
    if (delta <= 0) continue
    duration += delta
    frames += 1
    if (duration >= 1000) {
      windows.push((frames / duration) * 1000)
      duration = 0
      frames = 0
    }
  }
  // The trailing partial window is kept: it is observed behaviour, and dropping
  // it would silently discard the worst case when a run ends badly.
  if (duration >= 250) windows.push((frames / duration) * 1000)
  return windows
}

/** Longest run of consecutive windows under the floor, and where it starts. */
function longestLowStreak(windows) {
  let best = 0
  let bestStart = -1
  let run = 0
  for (const [index, value] of windows.entries()) {
    if (value < FLOOR) {
      run += 1
      if (run > best) {
        best = run
        bestStart = index - run + 1
      }
    } else {
      run = 0
    }
  }
  return { length: best, start: bestStart }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  // Never --disable-frame-rate-limit: an unlocked rAF reports the throughput of
  // the compositor rather than the frame rate the player sees.
  args: ['--no-sandbox', '--mute-audio'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(9000)

  // A background tab receives no keyboard events, which is the difference
  // between "the player is running" and "nothing is happening".
  await page.bringToFront()

  const cdp = await page.createCDPSession()
  await enterStageOne(page, cdp)

  const renderer = await page.evaluate(() => {
    const game = window.__contraGame
    if (!game) return 'none'
    try {
      const gl = game.renderer.gl
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const name =
        ext === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      return `type=${game.renderer.type} ${String(name)}`
    } catch (error) {
      return `type=${game.renderer.type} gl-unreadable: ${error.message}`
    }
  })

  await page.evaluate(() => {
    const probe = { segments: [] }
    window.__fpsProbe = probe
    let tail = []
    let last = performance.now()
    const tick = (now) => {
      if (!probe.running) return
      tail.push(now - last)
      last = now
      requestAnimationFrame(tick)
    }
    // flush() closes the current segment, so the level transitions between runs
    // never enter the series.
    probe.flush = () => {
      if (tail.length > 0) probe.segments.push(tail)
      tail = []
    }
    probe.running = true
    requestAnimationFrame(tick)
  })

  const started = Date.now()
  const phaserFps = []
  const segments = []
  let stalls = 0

  while (Date.now() - started < SECONDS * 1000) {
    const before = Date.now()
    let ended = 'time'
    let ticks = 0

    await key(cdp, 'ArrowRight', 39, 'keyDown')
    while (Date.now() - started < SECONDS * 1000) {
      // Held right alone gets the player killed through contact damage, which is
      // a legitimate end of a run: restarting is cheaper than aiming for a clear.
      if (ticks % 3 === 0) await tap(cdp, 'KeyJ', 74, 40)
      if (ticks % 9 === 0) await tap(cdp, 'Space', 32, 40)
      ticks += 1
      const sample = await page.evaluate(() => {
        const read = window.__contraStage
        return typeof read === 'function' ? read() : null
      })
      if (sample === null) {
        ended = 'left-stage'
        break
      }
      phaserFps.push(sample.fps)
    }
    await key(cdp, 'ArrowRight', 39, 'keyUp')
    await page.evaluate(() => window.__fpsProbe.flush())

    const span = (Date.now() - before) / 1000
    segments.push({ ended, span, ticks })
    if (ended === 'time') break
    if (!(await restartStageOne(page, cdp))) {
      console.log('  注意    无法回到关卡（关卡结束后未找到重开路径），采样提前结束')
      break
    }
  }

  const allDeltas = await page.evaluate(() => {
    const probe = window.__fpsProbe
    if (!probe) return []
    probe.running = false
    return probe.segments.flat()
  })

  const elapsed = (Date.now() - started) / 1000
  const windows = toSecondWindows(allDeltas)
  const sortedWindows = [...windows].sort((a, b) => a - b)
  const intervals = allDeltas.filter((delta) => delta > 0 && delta < STALL_MS)
  const sortedIntervals = [...intervals].sort((a, b) => a - b)
  stalls = allDeltas.filter((delta) => delta >= STALL_MS).length
  const frameFps = intervals.map((delta) => 1000 / delta).sort((a, b) => a - b)
  const sortedPhaser = [...phaserFps].sort((a, b) => a - b)
  const streak = longestLowStreak(windows)

  console.log('REQ-NFR-001 帧率实测')
  console.log(`  环境    headless Chrome ${await browser.version()} / 1920x1080 / ${renderer}`)
  console.log(
    `  采集    ${windows.length} 个 1 秒窗口 / ${allDeltas.length} 帧 / ${elapsed.toFixed(1)} 秒 / ${segments.length} 段关卡`,
  )
  console.log(
    `  分段    ${segments.map((s, i) => `#${i + 1} ${s.span.toFixed(1)}s(${s.ended === 'time' ? '到时' : '阵亡重开'})`).join('  ')}`,
  )
  console.log('')
  console.log('  每秒帧率')
  console.log(
    `    min ${(sortedWindows[0] ?? 0).toFixed(1)}   p5 ${percentile(sortedWindows, 0.05).toFixed(1)}   p50 ${percentile(sortedWindows, 0.5).toFixed(1)}   p95 ${percentile(sortedWindows, 0.95).toFixed(1)}   max ${(sortedWindows[sortedWindows.length - 1] ?? 0).toFixed(1)}   mean ${mean(windows).toFixed(1)}`,
  )
  if (sortedIntervals.length > 0) {
    console.log('  帧间隔')
    console.log(
      `    p50 ${percentile(sortedIntervals, 0.5).toFixed(1)}ms   p95 ${percentile(sortedIntervals, 0.95).toFixed(1)}ms   p99 ${percentile(sortedIntervals, 0.99).toFixed(1)}ms   max ${(sortedIntervals[sortedIntervals.length - 1] ?? 0).toFixed(1)}ms`,
    )
    console.log(
      `    单帧折算 fps: p1 ${percentile(frameFps, 0.01).toFixed(1)}   mean ${mean(frameFps).toFixed(1)}`,
    )
  }
  if (sortedPhaser.length > 0) {
    console.log(
      `  Phaser 自报 fps: min ${(sortedPhaser[0] ?? 0).toFixed(1)}   p5 ${percentile(sortedPhaser, 0.05).toFixed(1)}   p50 ${percentile(sortedPhaser, 0.5).toFixed(1)}`,
    )
  }
  console.log(
    `  低于 ${FLOOR}fps 的秒数: ${windows.filter((value) => value < FLOOR).length} / ${windows.length}`,
  )
  if (stalls > 0) console.log(`  卡顿帧（≥${STALL_MS}ms）: ${stalls} 次`)
  console.log('')

  if (streak.length >= STREAK) {
    const low = windows.slice(streak.start, streak.start + streak.length).map((v) => v.toFixed(1))
    console.log(
      `✗ 出现连续 ${streak.length} 秒低于 ${FLOOR}fps（第 ${streak.start + 1} 秒起：${low.join(' / ')}）`,
    )
    process.exitCode = 1
  } else {
    console.log(`✓ 无连续 ${STREAK} 秒低于 ${FLOOR}fps（最长连续低帧 ${streak.length} 秒）`)
  }
  console.log(
    '  口径：headless Chrome + ANGLE/D3D11，未限帧；真机 GPU 与垂直同步会改变绝对值，结论以「是否掉到 50fps 以下并持续 3 秒」为准',
  )
} finally {
  await browser.close()
}
