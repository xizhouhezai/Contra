#!/usr/bin/env node
/**
 * Where does the cold-start time actually go?
 *
 * REQ-NFR-002 asks for five seconds from load to playable, and the checklist
 * carries two network profiles that do not meet it. The obvious answer - "the
 * page makes 305 requests, merge them into atlases" - was written down as a
 * plan and turned out to be wrong when it was measured: latency was worth 0.92s
 * and bandwidth 3.85s, so the bottleneck was bytes, not request count.
 *
 * This script exists so that answer does not have to be re-derived. It runs the
 * same page under conditions that each change one variable, so the split
 * between transfer and per-request overhead is measured rather than argued:
 *
 *   A. as shipped            the real request pattern and byte count
 *   B. latency removed       same requests, same bytes, no per-request RTT
 *   C. bandwidth doubled     same requests, same bytes, twice the speed
 *
 * It also prints the byte breakdown of the load, because the split matters more
 * than the total: the first load and the stage's own art are needed before the
 * player can act, while the music is not - it is a loop that starts when it
 * arrives.
 *
 * Usage:
 *   node scripts/measure-cold-start-breakdown.mjs
 *   PROFILE=fast3g node scripts/measure-cold-start-breakdown.mjs
 */
import puppeteer from 'puppeteer'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'

/** Network profiles, named for what they are. */
const PROFILES = {
  broadband: { label: '宽带 20Mbps', latency: 20, download: 2_500_000 },
  fast3g: { label: '4G 8Mbps', latency: 70, download: 1_000_000 },
  regular3g: { label: '3G 1.6Mbps', latency: 150, download: 200_000 },
  local: { label: '本地回环', latency: 0, download: -1 },
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * One measurement: how long until the stage is running, and what was fetched.
 *
 * "Playable" means the stage exists and the rule layer is stepping. The stage is
 * started explicitly, because the title screen waits for a key and a script
 * that waits for the stage would wait forever.
 */
async function measure(condition) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--mute-audio'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    const cdp = await page.createCDPSession()
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    if (condition.latency > 0 || condition.download > 0) {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: condition.latency,
        downloadThroughput: condition.download,
        uploadThroughput: Math.round(condition.download / 4),
      })
    }

    /**
     * Every asset the load pulled, with its size and when it was asked for.
     *
     * The size comes from `Network.loadingFinished.encodedDataLength`, not from
     * the response's content-length header: a chunked response has no such
     * header, and counting only the ones that have it reported the boot phase as
     * "0 bytes" while it was in fact pulling megabytes. encodedDataLength is
     * what actually crossed the wire, compression included.
     *
     * The request id comes from the CDP event rather than from the response
     * object, which does not expose it.
     */
    const fetched = []
    const phaseByRequest = new Map()
    const urls = new Map()
    let phase = 'boot'
    cdp.on('Network.requestWillBeSent', (event) => {
      phaseByRequest.set(event.requestId, phase)
      urls.set(event.requestId, event.request.url)
    })
    cdp.on('Network.loadingFinished', (event) => {
      const requestPhase = phaseByRequest.get(event.requestId)
      phaseByRequest.delete(event.requestId)
      fetched.push({
        phase: requestPhase ?? phase,
        file: (urls.get(event.requestId) ?? '').split('/').pop() ?? '',
        bytes: event.encodedDataLength,
        at: Date.now(),
      })
    })

    const started = Date.now()
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120_000 })

    // Wait for the game object, then start a stage explicitly.
    for (let i = 0; i < 600; i += 1) {
      const booted = await page.evaluate(() => {
        const game = window.__contraGame
        return !!game && game.scene.scenes.length > 0
      })
      if (booted) break
      await sleep(100)
    }
    const bootMs = Date.now() - started

    phase = 'stage'
    await page.evaluate(() => {
      const game = window.__contraGame
      if (game) game.scene.start('Stage', { stageId: 'stage-01' })
    })

    let playableMs = null
    for (let i = 0; i < 600; i += 1) {
      const playing = await page.evaluate(() => {
        const stage = window.__contraGame?.scene?.getScene('Stage')
        return !!stage && !!stage.world && stage.world.steps > 5
      })
      if (playing) {
        playableMs = Date.now() - started
        break
      }
      await sleep(100)
    }
    await sleep(1500)

    const total = fetched.reduce((sum, f) => sum + f.bytes, 0)
    const boot = fetched.filter((f) => f.phase === 'boot')
    const stage = fetched.filter((f) => f.phase === 'stage')
    const sum = (list) => list.reduce((s, f) => s + f.bytes, 0)

    return {
      bootMs,
      playableMs: playableMs ?? Number.NaN,
      requests: fetched.length,
      mb: total / 1048576,
      bootMb: sum(boot) / 1048576,
      stageMb: sum(stage) / 1048576,
      biggest: [...fetched]
        .filter((f) => f.bytes > 80_000)
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 6)
        .map((f) => ({ file: f.file, kb: Math.round(f.bytes / 1024), phase: f.phase })),
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const key = process.env.PROFILE ?? 'fast3g'
  const base = PROFILES[key]
  if (base === undefined) {
    console.error(`unknown profile ${key}; try: ${Object.keys(PROFILES).join(', ')}`)
    return 1
  }

  console.log(
    `档位：${base.label}（下行 ${(base.download / 1e6).toFixed(1)}MB/s，延迟 ${base.latency}ms）`,
  )
  console.log()

  const conditions = [
    { name: 'A 现状', profile: base },
    { name: 'B 去掉延迟', profile: { ...base, latency: 0 } },
    { name: 'C 带宽翻倍', profile: { ...base, download: base.download * 2 } },
  ]

  const results = []
  for (const condition of conditions) {
    process.stdout.write(`▶ ${condition.name} ... `)
    const r = await measure(condition.profile)
    results.push({ ...condition, ...r })
    console.log(
      `到可操作 ${(r.playableMs / 1000).toFixed(2)}s   ` +
        `请求 ${r.requests}   传输 ${r.mb.toFixed(2)}MB`,
    )
  }

  const [a, b, c] = results
  console.log()
  console.log(`boot 阶段      ${a.bootMb.toFixed(2)}MB（${(a.bootMs / 1000).toFixed(2)}s）`)
  console.log(`进关卡阶段    ${a.stageMb.toFixed(2)}MB`)
  console.log()
  console.log('进关卡阶段最大的几项：')
  for (const f of a.biggest) {
    console.log(`  ${String(f.kb).padStart(6)}KB  ${f.phase.padEnd(6)} ${f.file.slice(0, 46)}`)
  }
  console.log()
  const latencyCost = (a.playableMs - b.playableMs) / 1000
  const bandwidthCost = (a.playableMs - c.playableMs) / 1000
  console.log(`去掉全部往返延迟能省：${latencyCost.toFixed(2)}s`)
  console.log(`带宽翻倍能省：        ${bandwidthCost.toFixed(2)}s`)
  console.log()
  console.log(
    latencyCost > bandwidthCost
      ? '结论：瓶颈是「每请求的往返延迟」——合并图集有效'
      : '结论：瓶颈是「字节传输」——合并图集帮不上忙，要从字节下手',
  )
  console.log(
    `按传输时间倒推：${a.mb.toFixed(2)}MB ÷ ${(base.download / 1e6).toFixed(1)}MB/s = ` +
      `${((a.mb * 1048576) / base.download).toFixed(2)}s（不含延迟）`,
  )
  return 0
}

process.exit(await main())
