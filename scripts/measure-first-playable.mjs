#!/usr/bin/env node
/**
 * Cold-start check for REQ-NFR-002: <= 5 seconds from load to playable.
 *
 * The requirement is stated in seconds, but the checklist has carried it as
 * "cannot be verified" since v0.9.0 because the code can only measure bytes.
 * That conflated two things: *how long it takes* depends on the network, but
 * *whether the budget is met* is exactly what a throttled profile decides. So
 * this measures it against explicit, stated network profiles instead of leaving
 * the item permanently open.
 *
 * What "playable" means here, in order of strictness, and why each is checked:
 *
 *   1. the game object exists (`window.__contraGame`)
 *   2. the boot scene has finished and Title is the active scene
 *   3. a real stage has started with the rule layer producing steps
 *
 * (3) is the honest bar: REQ-NFR-002 says "cold start to playable", and the
 * title screen is not playable. It is measured, not asserted away - a build that
 * hits (2) at 1s but (3) at 7s has a real problem the byte count would not show.
 *
 * Timing comes from the page's own Performance timeline (navigationStart to the
 * moment each condition first held), not from date arithmetic in this process,
 * so it excludes puppeteer's own startup and protocol latency.
 *
 * Profiles are not guesses. Firefox's "Regular 3G" is the documented one:
 * 400ms RTT, 400kbps down. "Fast 3G" is 150ms/1.6Mbps, "Slow 3G" 2000ms/400kbps.
 * A local loopback run is included as the floor, to separate content cost from
 * transport cost.
 *
 * Usage:
 *   node scripts/measure-first-playable.mjs                # all profiles
 *   PROFILES=regular3g node scripts/measure-first-playable.mjs
 *   CONTRA_URL=http://localhost:4180/ node scripts/measure-first-playable.mjs
 *
 * Needs a served build first (vite preview or dev server), same as measure-fps.
 */
import puppeteer from 'puppeteer'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const BUDGET_MS = 5000

/**
 * Network profiles, each a name for a real-world connection plus the numbers.
 *
 * latency is round-trip; downloadThroughput is bytes/second (CDP's unit, so
 * 400kbps = 50,000 B/s). upload is not exercised by a game load but CDP wants
 * it set to avoid inheriting an unlimited value.
 */
const PROFILES = {
  local: { latency: 0, download: -1, upload: -1 },
  fast3g: { latency: 150, download: 200_000, upload: 50_000 },
  regular3g: { latency: 400, download: 50_000, upload: 25_000 },
  slow3g: { latency: 2000, download: 50_000, upload: 25_000 },
}

const ORDER = ['local', 'fast3g', 'regular3g', 'slow3g']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Records, inside the page, when each playability condition first became true.
 *
 * Installed before any app script runs so it cannot miss the transition it is
 * looking for: polling from here would sample at 50ms and report a time the
 * user never experienced.
 */
const INSTRUMENT = `
  (function () {
    window.__coldStart = { bootedAt: null, titleAt: null, playableAt: null, timeOrigin: performance.timeOrigin };
    function stamp(key) {
      if (window.__coldStart[key] !== null) return;
      window.__coldStart[key] = performance.now();
    }
    var timer = setInterval(function () {
      var game = window.__contraGame;
      if (game && game.scene) {
        stamp('bootedAt');
        var scenes = game.scene.scenes || [];
        for (var i = 0; i < scenes.length; i++) {
          var s = scenes[i];
          if (!s || !s.sys || !s.sys.settings) continue;
          var name = s.sys.settings.key;
          if (name === 'Title' && s.sys.isActive()) stamp('titleAt');
          if (name === 'Stage' && s.sys.isActive() && s.world && s.world.steps > 0) {
            stamp('playableAt');
            clearInterval(timer);
          }
        }
      }
    }, 16);
  })();
`

async function measure(profileName) {
  const profile = PROFILES[profileName]
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--disable-gpu', '--no-sandbox', '--mute-audio', '--window-size=1280,720'],
  })

  try {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()

    // Cache off, otherwise the second profile would be measuring RAM.
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    if (profile.latency > 0 || profile.download > 0) {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: profile.latency,
        downloadThroughput: profile.download,
        uploadThroughput: profile.upload,
      })
    }

    await page.evaluateOnNewDocument(INSTRUMENT)

    const failed = []
    page.on('requestfailed', (request) => failed.push(request.url()))

    const navigationStart = Date.now()
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    const domReadyMs = Date.now() - navigationStart

    // Ask for a stage to start, then wait for the rule layer to tick.
    await page.evaluate(() => {
      const game = window.__contraGame
      if (game) game.scene.start('Stage', { stageId: 'stage-01' })
    })

    const deadline = Date.now() + 120_000
    let marks = null
    while (Date.now() < deadline) {
      marks = await page.evaluate(() => {
        const c = window.__coldStart ?? {}
        return {
          bootedAt: c.bootedAt ?? null,
          titleAt: c.titleAt ?? null,
          playableAt: c.playableAt ?? null,
          timeOrigin: c.timeOrigin ?? null,
        }
      })
      if (marks?.playableAt !== null && marks !== null) break
      await sleep(100)
    }

    return { profileName, marks, domReadyMs, failed }
  } finally {
    await browser.close()
  }
}

function format(ms) {
  return ms === null || ms === undefined ? '   --  ' : `${(ms / 1000).toFixed(2)}s`
}

async function main() {
  const wanted = process.env.PROFILES
  const names = wanted === undefined ? ORDER : wanted.split(',').map((s) => s.trim())
  for (const name of names) {
    if (PROFILES[name] === undefined) throw new Error(`unknown profile: ${name}`)
  }

  const rows = []
  for (const name of names) {
    process.stdout.write(`▶ ${name} ... `)
    const result = await measure(name)
    const { marks } = result
    const playable = marks.playableAt
    rows.push({ name, ...marks, domReadyMs: result.domReadyMs, failed: result.failed })
    process.stdout.write(`playable ${format(playable)}\n`)
  }

  console.log()
  console.log('profile      DOM       title     playable   budget 5.00s')
  console.log('-------------------------------------------------------------')
  let worst = 0
  let failedProfiles = 0
  for (const row of rows) {
    const ok = row.playableAt !== null && row.playableAt <= BUDGET_MS
    if (row.playableAt !== null) worst = Math.max(worst, row.playableAt)
    if (!ok) failedProfiles += 1
    console.log(
      `${row.name.padEnd(12)} ${format(row.domReadyMs).padStart(7)}  ` +
        `${format(row.titleAt).padStart(7)}  ${format(row.playableAt).padStart(8)}   ` +
        `${ok ? 'PASS' : 'FAIL'}`,
    )
  }

  const requestFailures = rows.flatMap((row) => row.failed.map((url) => `${row.name}: ${url}`))
  if (requestFailures.length > 0) {
    console.log()
    console.log('failed requests:')
    for (const line of requestFailures.slice(0, 10)) console.log(`  ${line}`)
  }

  console.log()
  console.log(`worst: ${format(worst)}  (budget ${(BUDGET_MS / 1000).toFixed(2)}s)`)
  console.log(
    'note: DOM column is wall-clock from this process (includes puppeteer latency); ' +
      'title/playable are page-relative performance.now().',
  )

  if (failedProfiles > 0) {
    console.log(`\nFAIL: ${failedProfiles} profile(s) over the 5s budget or never became playable`)
    return 1
  }
  console.log('\nOK: every profile reached a playable stage within budget')
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
