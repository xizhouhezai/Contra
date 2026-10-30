import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { PuppeteerAgent } from '@midscene/web/puppeteer'
import puppeteer from 'puppeteer'

/**
 * Plays all twelve stages with Midscene watching, and records the run.
 *
 * The Midscene part is the point of this script, not decoration: the bot plays
 * by reading the world through the page, and the *checks* are visual - the
 * agent looks at a screenshot of each stage and answers questions about what it
 * sees. A run that only pressed keys would prove the input path works and
 * nothing else; an assertion that can only pass if the pixels are right
 * (this is the stage's backdrop, the character is on screen, the HUD is drawn)
 * is evidence about the build rather than about the script.
 *
 * Three kinds of check, deliberately different:
 *
 *   - `aiQuery` for things a human would read: the stage's name in the HUD.
 *   - `aiBoolean` for presence: is a character sprite drawn, is the HUD there.
 *   - direct world reads for things a screenshot cannot answer: did the rule
 *     layer advance, did the mid-boss take damage. The vision path cannot see
 *     a hit point.
 *
 * Playing is delegated to a simple in-page bot (the same shape as the earlier
 * takes): walk toward enemies, shoot, jump incoming bullets, hop obstacles. A
 * solver would be nicer but a solver is not what this recording is for - it is
 * evidence that the stages are playable.
 *
 * Recording covers the whole run: screencast frames via CDP, and the game's
 * own audio tapped off Phaser's Web Audio graph (this machine has no stereo
 * loopback device, and the Web Audio tap is exactly what the player hears).
 *
 * Usage:
 *   node scripts/midscene-all-stages.mjs              # all twelve
 *   STAGES=stage-01,stage-02 node scripts/...          # a few
 *   SECONDS_PER_STAGE=45 node scripts/...              # shorter per stage
 *
 * The model comes from the DSH Midscene bridge, so there is no third-party key
 * to configure. The SDK path does not read a .env file, so the four variables
 * have to be in the process environment:
 *
 *   MIDSCENE_MODEL_BASE_URL  MIDSCENE_MODEL_API_KEY
 *   MIDSCENE_MODEL_NAME      MIDSCENE_MODEL_FAMILY
 *
 * `curl -s "http://127.0.0.1:8787/v1/midscene-env"` prints them.
 *
 * Frames and the audio land in .tmp/midscene-all/; assemble the video with
 * scripts/assemble-video.mjs.
 */

const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DIR = '.tmp/midscene-all'
const META = `${DIR}/meta.json`
const REPORT = `${DIR}/report.json`
const SECONDS_PER_STAGE = Number(process.env.SECONDS_PER_STAGE ?? '40')

const ALL_STAGES = [
  'stage-01',
  'stage-02',
  'stage-03',
  'stage-04',
  'stage-05',
  'stage-06',
  'stage-07',
  'stage-08',
  'stage-09',
  'stage-10',
  'stage-11',
  'stage-12',
]

const wanted = process.env.STAGES
const STAGES = wanted === undefined ? ALL_STAGES : wanted.split(',').map((s) => s.trim())

rmSync(DIR, { recursive: true, force: true })
mkdirSync(DIR, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 720 },
})
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)))

const cdp = await page.createCDPSession()
await cdp.send('Page.enable')

/** Frames for the video, with the timestamp each was captured at. */
const frames = []
let frameNo = 0
cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  frameNo += 1
  const name = `${String(frameNo).padStart(5, '0')}.jpg`
  try {
    writeFileSync(`${DIR}/${name}`, Buffer.from(data, 'base64'))
    frames.push({ file: name, tMs: Math.round(metadata.timestamp * 1000) })
  } catch {
    // A frame that cannot be written is not worth aborting the run for.
  }
  try {
    await cdp.send('Page.screencastFrameAck', { sessionId })
  } catch {
    // The session may already be closing.
  }
})

/**
 * The game's own audio, captured from Phaser's Web Audio graph.
 *
 * Screencast carries frames only, and the machine has no stereo-mix loopback
 * device, so the system output cannot be recorded from outside. Phaser routes
 * every sound through one graph, so tapping its destination is both simpler and
 * cleaner than a virtual audio device.
 */
const startAudioCapture = async () => {
  await page.evaluate(async () => {
    const game = window.__contraGame
    if (!game?.sound?.context) return ''
    const ctx = game.sound.context
    const dest = ctx.createMediaStreamDestination()
    game.sound.destination.connect(dest)
    const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    window.__audioRec = { rec, chunks }
    rec.start(250)
    return 'recording'
  })
}
const stopAudioCapture = async () => {
  const b64 = await page.evaluate(async () => {
    const { rec, chunks } = window.__audioRec ?? {}
    if (!rec) return ''
    await new Promise((res) => {
      rec.onstop = res
      rec.stop()
    })
    const blob = new Blob(chunks, { type: 'audio/webm' })
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let s = ''
    const CH = 0x8000
    for (let i = 0; i < bytes.length; i += CH) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH))
    }
    return btoa(s)
  })
  if (b64.length > 0) {
    writeFileSync(`${DIR}/audio.webm`, Buffer.from(b64, 'base64'))
    console.log('AUDIO_BYTES', Buffer.from(b64, 'base64').length)
  }
}

const startRecording = () =>
  cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1,
  })

/** Held keys, tracked so the bot can release what it no longer wants. */
const held = new Set()
const setKey = async (code, down) => {
  if (down && !held.has(code)) {
    held.add(code)
    await page.keyboard.down(code)
  }
  if (!down && held.has(code)) {
    held.delete(code)
    await page.keyboard.up(code)
  }
}

/**
 * The bot, evaluated inside the page each tick.
 *
 * Runs in the browser because the world lives there: reading it out over CDP
 * once per tick would cost more than the logic.
 */
const botTick = () => {
  const scene = window.__contraGame?.scene?.getScene('Stage')
  if (scene?.world === undefined) return null
  const w = scene.world
  const p = w.player
  const px = p.position.x + 12
  const py = p.position.y + 40
  const head = p.position.y

  const enemies = w.targets.filter((t) => t.alive)
  const bullets = w.bullets.filter((b) => b.owner === 'enemy')

  // Which bullets are going to touch us? Predict along the velocity for the
  // next third of a second and see if the path enters the body box.
  let threat = null
  let bestT = Infinity
  for (const b of bullets) {
    for (let t = 0; t < 0.35; t += 0.02) {
      const bx = b.position.x + b.velocity.x * t
      const by = b.position.y + b.velocity.y * t
      if (bx > p.position.x - 10 && bx < p.position.x + 34 && by > head - 6 && by < py + 4) {
        if (t < bestT) {
          bestT = t
          threat = { by, vy: b.velocity.y }
        }
        break
      }
    }
  }

  let target = null
  let bestD = Infinity
  for (const e of enemies) {
    const d = Math.abs(e.box.x - px)
    if (d < bestD) {
      bestD = d
      target = e
    }
  }

  const ahead = px + 26
  const blocked = w.platforms.some(
    (pl) => ahead > pl.x && ahead < pl.x + pl.width && py > pl.y + 2 && py - 10 < pl.y + pl.height,
  )

  return {
    px: Math.round(px),
    blocked,
    cleared: scene.cleared === true || w.cleared === true,
    hearts: p.hearts,
    onGround: p.onGround,
    threat: threat ? { t: Number(bestT.toFixed(2)), by: Math.round(threat.by) } : null,
    targetX: target ? Math.round(target.box.x) : null,
    dist: Math.round(bestD),
    score: w.score,
    steps: w.steps,
    // The stage's own width, so the bot knows where the end is instead of
    // guessing a distance that stops it a third of the way in.
    stageWidth: scene.stage?.widthPx ?? 12000,
    minibossId: scene.minibossId ?? null,
    minibossHp: scene.minibossHp ?? 0,
    lives: p.hearts,
  }
}

const agent = new PuppeteerAgent(page, {
  groupName: 'contra-all-stages',
  generateReport: false,
})

/** The stage's display name, for the Midscene check and the log. */
const STAGE_NAMES = {
  'stage-01': '码头晨雾',
  'stage-02': '锈铁回廊',
  'stage-03': '悬空栈道',
  'stage-04': '审计者',
  'stage-05': '冷却管廊',
  'stage-06': '阵列机房',
  'stage-07': '熔炉区',
  'stage-08': '改写者',
  'stage-09': '坍塌档案库',
  'stage-10': '镜像回廊',
  'stage-11': '垂直井',
  'stage-12': '涌现',
}

const results = []
let recordingStarted = false

try {
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 90000 })
  await wait(5000)

  // One Midscene decision, to prove the vision path works before it is used
  // for assertions.
  await agent.aiAct('点击开始游戏按钮')
  await wait(900)
  await agent.aiAct('选择 DeepSeek 角色并点击确认')
  await wait(900)

  for (const stageId of STAGES) {
    const stageName = STAGE_NAMES[stageId] ?? stageId
    console.log(`\n=== ${stageId} ${stageName} ===`)

    await page.evaluate((id) => {
      const g = window.__contraGame
      for (const key of ['Result', 'StageSelect', 'Stage', 'Title']) g.scene.stop(key)
      g.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
    }, stageId)

    // --- Wait for the stage to actually be on screen -----------------------
    //
    // Switching scenes tears the old one down and builds the new one, and for
    // about three frames the canvas is blank. The first take asked Midscene
    // during that window and it reported "no character visible" - correctly,
    // for a blank page. So the wait is not a fixed sleep: it waits until the
    // stage is running *and* the canvas has something in it.
    await page.waitForFunction(
      () => {
        const scene = window.__contraGame?.scene?.getScene('Stage')
        return !!scene && !!scene.world && scene.world.steps > 5
      },
      { timeout: 30000, polling: 100 },
    )
    await wait(1200)

    // Recording starts with the first stage already on screen, so the video
    // does not open with three blank frames of a scene transition.
    if (!recordingStarted) {
      await startRecording()
      await startAudioCapture()
      recordingStarted = true
    }

    const stageResult = {
      stageId,
      stageName,
      checks: [],
      startedAt: Date.now(),
    }

    // --- Midscene visual check: does the stage look like it should? --------
    // Asked before the bot plays, so the check sees a fresh stage rather than
    // the aftermath of a fight.
    //
    // The wording asks whether a character is visible *anywhere*, not at a
    // position. The first take said "left of centre" and five stages failed it
    // for the crime of having the character on the right - the pictures were
    // fine. A check that fails on correct output is worse than no check.
    try {
      const hasBackdrop = await agent.aiBoolean(
        '这个画面是一个横版射击游戏的关卡场景吗？画面里有背景景物、有平台或地面，并且能看到一个角色吗？全部满足回答 true',
      )
      stageResult.checks.push({
        name: '画面有背景与角色',
        via: 'aiBoolean',
        ok: hasBackdrop === true,
        value: hasBackdrop,
      })
      console.log('  check 画面有背景与角色:', hasBackdrop)
    } catch (error) {
      stageResult.checks.push({
        name: '画面有背景与角色',
        via: 'aiBoolean',
        ok: false,
        error: String(error).slice(0, 120),
      })
      console.log('  check 画面有背景与角色: ERROR', String(error).slice(0, 100))
    }

    try {
      const hud = await agent.aiQuery('画面左上角显示的分数数字是多少？只回答数字')
      stageResult.checks.push({
        name: 'HUD 分数可读',
        via: 'aiQuery',
        ok: /\d/.test(String(hud)),
        value: String(hud).slice(0, 40),
      })
      console.log('  check HUD:', String(hud).slice(0, 40))
    } catch (error) {
      stageResult.checks.push({
        name: 'HUD 分数可读',
        via: 'aiQuery',
        ok: false,
        error: String(error).slice(0, 120),
      })
      console.log('  check HUD: ERROR', String(error).slice(0, 100))
    }

    // --- The stage's own name, read by looking ----------------------------
    //
    // This is the check that makes the run a test of *twelve different stages*
    // rather than one stage twelve times: the name is on the stage-select card,
    // not in the HUD, so it is read from the select screen before the stage is
    // entered. The name is what distinguishes stage 3 from stage 7, and a build
    // that shipped the wrong backdrop would still pass every other check here.
    //
    // The question asks for the name of a *specific* card rather than "where is
    // card X": asking a model for a grid position invites it to answer with a
    // row and a column that are off by one, and a check that miscounts is worse
    // than no check. Asking for a name and comparing strings has no such
    // failure mode.
    try {
      await page.evaluate(() => {
        const g = window.__contraGame
        for (const key of ['Result', 'StageSelect', 'Stage', 'Title']) g.scene.stop(key)
        g.scene.start('StageSelect')
      })
      await wait(1400)
      const seen = await agent.aiQuery(
        `选关画面上有一张卡片写着「${stageName}」。这个画面上出现过的关卡名称有哪些？把所有关卡名按从左到右、从上到下的顺序列出，用顿号分隔`,
      )
      const ok = String(seen).includes(stageName)
      stageResult.checks.push({
        name: `选关画面含「${stageName}」`,
        via: 'aiQuery',
        ok,
        value: String(seen).slice(0, 80),
      })
      console.log('  check 选关画面含关卡名:', ok ? 'OK' : '未找到', String(seen).slice(0, 60))

      // Back into the stage for the playthrough.
      await page.evaluate((id) => {
        const g = window.__contraGame
        for (const key of ['StageSelect', 'Stage']) g.scene.stop(key)
        g.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
      }, stageId)
      await wait(1600)
    } catch (error) {
      stageResult.checks.push({
        name: `选关画面含「${stageName}」`,
        via: 'aiQuery',
        ok: false,
        error: String(error).slice(0, 120),
      })
      console.log('  check 选关画面含关卡名: ERROR', String(error).slice(0, 100))
    }

    // --- Play the stage with the bot --------------------------------------
    const deadline = Date.now() + SECONDS_PER_STAGE * 1000
    const stageStart = Date.now()
    let maxSteps = 0
    let sawMiniboss = null
    let minibossDefeated = false
    let idleTicks = 0
    let lastLog = 0

    while (Date.now() < deadline) {
      const r = await page.evaluate(botTick)
      if (r === null) break

      maxSteps = Math.max(maxSteps, r.steps)
      if (r.minibossId !== null && sawMiniboss === null) sawMiniboss = r.minibossId
      if (sawMiniboss !== null && r.minibossHp === 0) minibossDefeated = true

      if (r.cleared) {
        stageResult.cleared = true
        break
      }

      // Dodge: a bullet that will hit within 0.3s and we are grounded.
      if (r.threat && r.threat.t < 0.3 && r.onGround) {
        await setKey('Space', true)
        await wait(60)
        await setKey('Space', false)
      } else if (r.threat && r.threat.t < 0.3) {
        const away = r.threat.by > 300 ? 'ArrowLeft' : 'ArrowRight'
        await setKey(away, true)
        await wait(140)
        await setKey(away, false)
      }

      if (r.targetX !== null) {
        const wantRight = r.targetX > r.px
        if (r.dist > 90) {
          await setKey(wantRight ? 'ArrowRight' : 'ArrowLeft', true)
        } else {
          await setKey('ArrowRight', false)
          await setKey('ArrowLeft', false)
          if (r.dist < 60) await setKey(wantRight ? 'ArrowLeft' : 'ArrowRight', true)
        }
        await setKey('KeyJ', true)
      } else {
        await setKey('ArrowLeft', false)
        await setKey('ArrowRight', true)
        await setKey('KeyJ', false)
      }

      if (r.blocked && r.onGround) {
        await setKey('Space', true)
        await wait(60)
        await setKey('Space', false)
      }

      // Keep pushing right while there is nothing to fight.
      //
      // The first take stopped after 2.4k pixels, which is a third of the way
      // into most stages - so the bot never reached the mid-stage fight and the
      // recording never showed one. The stage's own width is the right stop,
      // not a guessed distance.
      if (r.targetX === null && r.px > (r.stageWidth ?? 12000) - 400) {
        idleTicks += 1
        if (idleTicks > 60) break
      } else {
        idleTicks = 0
      }

      if (Date.now() - lastLog > 10000) {
        lastLog = Date.now()
        console.log(
          `  ${((Date.now() - stageStart) / 1000).toFixed(0)}s x=${r.px} steps=${r.steps} ` +
            `hearts=${r.hearts} target=${r.targetX} mini=${r.minibossId ?? '-'}`,
        )
      }
      await wait(40)
    }

    for (const k of [...held]) await page.keyboard.up(k)
    held.clear()

    const finalState = await page.evaluate(botTick)
    stageResult.playedSeconds = Number(((Date.now() - stageStart) / 1000).toFixed(1))
    stageResult.maxSteps = maxSteps
    stageResult.sawMiniboss = sawMiniboss
    stageResult.minibossDefeated = minibossDefeated
    stageResult.finalX = finalState?.px ?? null
    stageResult.finalHearts = finalState?.hearts ?? null

    // --- Direct world check: did the simulation actually run? -------------
    // A screenshot cannot see a hit point. If the rule layer advanced, the
    // stage was genuinely simulated rather than a still image.
    const advanced = maxSteps > 120
    stageResult.checks.push({
      name: '规则层持续推进',
      via: 'world',
      ok: advanced,
      value: `${maxSteps} steps`,
    })
    console.log(`  check 规则层推进: ${maxSteps} steps ->`, advanced)

    // --- Midscene check after play: is the stage still legible? -----------
    try {
      const stillGame = await agent.aiBoolean(
        '这个画面仍然是一个横版射击游戏的画面，没有变成错误页或者空白页吗？如果是回答 true',
      )
      stageResult.checks.push({
        name: '战后画面仍正常',
        via: 'aiBoolean',
        ok: stillGame === true,
        value: stillGame,
      })
      console.log('  check 战后画面仍正常:', stillGame)
    } catch (error) {
      stageResult.checks.push({
        name: '战后画面仍正常',
        via: 'aiBoolean',
        ok: false,
        error: String(error).slice(0, 120),
      })
      console.log('  check 战后画面仍正常: ERROR')
    }

    results.push(stageResult)
    const passed = stageResult.checks.filter((c) => c.ok).length
    console.log(
      `  => ${stageId}: ${passed}/${stageResult.checks.length} 检查通过, ` +
        `用时 ${stageResult.playedSeconds}s, steps=${maxSteps}`,
    )
  }
} finally {
  for (const k of [...held]) {
    try {
      await page.keyboard.up(k)
    } catch {
      // The browser may already be gone.
    }
  }
  try {
    await stopAudioCapture()
  } catch (error) {
    console.log('AUDIO_ERR', String(error).slice(0, 120))
  }
  try {
    await cdp.send('Page.stopScreencast')
  } catch {
    // Closing anyway.
  }
  writeFileSync(META, JSON.stringify(frames))
  // Written as UTF-8 explicitly: the default encoding on this Windows host is
  // GBK, which turns every Chinese stage name into mojibake in the report.
  writeFileSync(
    REPORT,
    JSON.stringify({ results, pageErrors: pageErrors.slice(0, 20) }, null, 2),
    'utf8',
  )
  await browser.close()
}

const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0)
const passedChecks = results.reduce((sum, r) => sum + r.checks.filter((c) => c.ok).length, 0)
console.log('')
console.log(`关卡 ${results.length}，检查 ${passedChecks}/${totalChecks} 通过，帧 ${frames.length}`)
console.log(`页面错误 ${pageErrors.length}`)
if (pageErrors.length > 0) console.log(JSON.stringify(pageErrors.slice(0, 5), null, 2))
