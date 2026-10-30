import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

/**
 * Records one continuous playthrough of all twelve stages.
 *
 * Split from the verification run on purpose. When the same script also asked
 * Midscene to look at the screen, every stage began with ten to twenty seconds
 * of the character standing still while a vision model thought about a
 * screenshot - and that dead time went into the video. Testing and recording are
 * different jobs: the checks live in scripts/midscene-all-stages.mjs, and this
 * file only plays.
 *
 * Three things it does that the earlier takes did not:
 *
 *   - 1920x1080 capture. The scene art is 1920x1080; recording at 1280x720 made
 *     Phaser down-scale every layer to 0.67 before the encoder saw it, which is
 *     where the soft edges in the old video came from.
 *   - The bot looks for a floor ahead of itself and jumps when there is none.
 *     Without that it walked straight into every pit - and since falling now
 *     costs a heart and teleports the player back to the ledge, the recording
 *     was a loop of the character dropping out of frame and reappearing.
 *   - The bot keeps its distance. The old rule ("stop at 90px") still let a
 *     walking enemy close the gap, so the character ended up standing inside it;
 *     this one backs off below 95px and only advances past 130px.
 */
const APP = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DIR = '.tmp/playthrough'
const META = `${DIR}/meta.json`

const WIDTH = Number(process.env.WIDTH ?? '1920')
const HEIGHT = Number(process.env.HEIGHT ?? '1080')
const SECONDS_PER_STAGE = Number(process.env.SECONDS_PER_STAGE ?? '75')

/**
 * The vertical shaft gets a shorter slot.
 *
 * Its route is a zig-zag that has to be read and taken deliberately. Measured
 * directly: "hold right and hop" carries the character three ledges down and
 * then into a wall, and every reflex rule tried either stalls it or drops it
 * into the same pit until the hearts run out. Rather than spend the video's
 * runtime on a bot failing a platforming puzzle, the shaft gets a short look and
 * the recording moves on. It is the one stage included as a look rather than as
 * a playthrough, and the report says which one it is.
 */
const SHAFT_SECONDS = Number(process.env.SHAFT_SECONDS ?? '22')
const SHAFT_STAGE = 'stage-11'

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

/** `STAGES=stage-11` runs one stage, which is how a fix is checked in a minute. */
const STAGES =
  process.env.STAGES === undefined
    ? ALL_STAGES
    : process.env.STAGES.split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

rmSync(DIR, { recursive: true, force: true })
mkdirSync(DIR, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
  defaultViewport: { width: WIDTH, height: HEIGHT },
})
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)))

const cdp = await page.createCDPSession()
await cdp.send('Page.enable')

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

/** The game's own audio, tapped off Phaser's Web Audio graph. */
const startAudioCapture = async () => {
  await page.evaluate(async () => {
    const game = window.__contraGame
    if (!game?.sound?.context) return
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
    quality: 90,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
    everyNthFrame: 1,
  })

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
const releaseAll = async () => {
  for (const code of [...held]) {
    try {
      await page.keyboard.up(code)
    } catch {
      // The page may already be gone.
    }
  }
  held.clear()
}

/**
 * The bot, evaluated inside the page each tick.
 *
 * Runs in the browser because the world lives there: reading it out over CDP
 * sixty times a second would cost more than the decisions are worth.
 */
const botTick = () => {
  const scene = window.__contraGame?.scene?.getScene('Stage')
  if (scene?.world === undefined) return null
  const w = scene.world
  const p = w.player

  const px = p.position.x
  const footY = p.position.y + 40
  const centerY = p.position.y + 20

  // --- enemies ---------------------------------------------------------
  // Distance is two-dimensional, not just x.
  //
  // Measuring only x works on the horizontal stages and breaks completely on the
  // vertical shaft, where the whole point is that the next platform is hundreds
  // of pixels below: an enemy straight up the shaft shares the player's x and
  // read as 20px away, so the bot tried to back away from something it was never
  // level with and stalled at x=876 for thirty seconds. On screen that is the
  // character standing still beside a monster that is actually far above.
  let target = null
  let bestDistance = Infinity
  for (const t of w.targets) {
    if (!t.alive) continue
    const dx = t.box.x - px
    const dy = t.box.y + t.box.height / 2 - centerY
    const distance = Math.hypot(dx, dy)
    if (distance < bestDistance) {
      bestDistance = distance
      target = t
    }
  }

  // --- incoming bullets ------------------------------------------------
  // Predict where each one will be over the next third of a second and hop if
  // the path crosses the body.
  let threat = null
  let soonest = Infinity
  for (const b of w.bullets) {
    if (b.owner !== 'enemy') continue
    for (let t = 0; t < 0.35; t += 0.02) {
      const bx = b.position.x + b.velocity.x * t
      const by = b.position.y + b.velocity.y * t
      if (bx > px - 10 && bx < px + 34 && by > p.position.y - 6 && by < footY + 4) {
        if (t < soonest) {
          soonest = t
          threat = by
        }
        break
      }
    }
  }

  // --- is there floor ahead? -------------------------------------------
  // This is what stops the bot walking into pits. It checks the surface it is
  // standing on, not just "any platform nearby", so a ledge above does not read
  // as ground.
  const lookX = px + 48
  const hasFloorAhead = w.platforms.some(
    (pl) => lookX > pl.x && lookX < pl.x + pl.width && Math.abs(pl.y - footY) < 14,
  )
  const edgeSoon = p.onGround && !hasFloorAhead

  // --- where is the next floor down? -----------------------------------
  //
  // The shaft is a zig-zag: ledges alternate between the left and right wall
  // every few hundred pixels of height, and the way down is to step off toward
  // whichever side the next one is on. Without this the character stands on one
  // ledge forever - measured at x=309 for the whole forty-second take.
  let nextLedgeDx = 0
  if (scene.stage?.scrollMode === 'vertical') {
    let best = null
    let bestDrop = Infinity
    for (const pl of w.platforms) {
      const drop = pl.y - footY
      // Strictly below, and not the ledge already under the feet.
      if (drop > 20 && drop < 420 && drop < bestDrop) {
        bestDrop = drop
        best = pl
      }
    }
    if (best !== null) {
      const center = best.x + best.width / 2
      nextLedgeDx = center - (px + 12)
    }
  }

  return {
    px: Math.round(px),
    hearts: p.hearts,
    onGround: p.onGround,
    steps: w.steps,
    failed: w.failedStage === true || scene.cleared === true,
    targetX: target ? Math.round(target.box.x) : null,
    distance: Math.round(bestDistance),
    threat: threat === null ? null : Number(soonest.toFixed(2)),
    edgeSoon,
    minibossId: scene.minibossId ?? null,
    minibossHp: scene.minibossHp ?? 0,
    stageWidth: scene.stage?.widthPx ?? 12000,
    // The shaft descends, so "walk right" is not how it is crossed. Reported so
    // the driver can hold the character back instead of pushing it off every
    // ledge it meets.
    vertical: scene.stage?.scrollMode === 'vertical',
    // Signed offset to the next ledge down, in px. Positive means it is to the
    // right. Only meaningful on a vertical stage.
    nextLedgeDx: Math.round(nextLedgeDx),
  }
}

const results = []

try {
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 120000 })
  await wait(6000)

  // Menus, once, before recording: nothing of this belongs in the video.
  await page.evaluate(() => {
    const game = window.__contraGame
    for (const key of ['Title', 'StageSelect', 'Result', 'Stage']) game.scene.stop(key)
  })
  await wait(400)

  for (let index = 0; index < STAGES.length; index += 1) {
    const stageId = STAGES[index]
    console.log(`\n=== ${stageId} ===`)

    await page.evaluate((id) => {
      const game = window.__contraGame
      for (const key of ['Result', 'StageSelect', 'Stage', 'Title']) game.scene.stop(key)
      game.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
    }, stageId)

    // Wait for the rule layer to be stepping before the clock starts, so the
    // first frame of each stage is already gameplay.
    await page.waitForFunction(
      () => {
        const s = window.__contraGame?.scene?.getScene('Stage')
        return !!s && !!s.world && s.world.steps > 4
      },
      { timeout: 30000, polling: 100 },
    )
    await wait(350)

    // Recording covers the play, not the loading.
    if (index === 0) {
      await startRecording()
      await startAudioCapture()
    }

    const started = Date.now()
    const budget = stageId === SHAFT_STAGE ? SHAFT_SECONDS : SECONDS_PER_STAGE
    const deadline = started + budget * 1000
    let peakSteps = 0
    let sawMiniboss = null
    const restarts = 0
    let lastLog = 0
    // Anti-stall state: where the character was, and which way it is trying to
    // go. A wall stops the shaft descent dead, and the way out is to try the
    // other direction rather than to keep pushing.
    let stallDirection = 1
    let lastPos = { x: 0, y: 0 }
    let stalledSince = Date.now()

    while (Date.now() < deadline) {
      const state = await page.evaluate(botTick)
      if (state === null) break
      peakSteps = Math.max(peakSteps, state.steps)
      if (state.minibossId !== null && sawMiniboss === null) sawMiniboss = state.minibossId

      // Nothing has moved for a while: turn around. The shaft's ledges zig-zag,
      // so a wall is a signal to go the other way rather than to push harder.
      if (Math.abs(state.px - lastPos.x) > 6 || Math.abs(state.steps - lastPos.y) > 0) {
        lastPos = { x: state.px, y: state.steps }
        stalledSince = Date.now()
      } else if (Date.now() - stalledSince > 1400) {
        stallDirection = -stallDirection
        stalledSince = Date.now()
      }

      if (state.failed) {
        // Out of hearts, or the exit was reached. Either way this stage is over;
        // move on rather than sitting on a dead screen.
        console.log(`  ${state.failed ? '结束' : '通过'} at x=${state.px} steps=${state.steps}`)
        break
      }

      // 1. Jump a pit before walking into it. Checked first: a fall costs a
      //    heart and the teleport back is the ugliest thing in the video.
      if (state.edgeSoon || (state.threat !== null && state.threat < 0.28 && state.onGround)) {
        await setKey('Space', true)
        await wait(70)
        await setKey('Space', false)
      }

      // 2. Keep a working distance from whatever is nearest.
      //
      // The band is deliberately wide, and the two decision points are further
      // apart than one tick of movement. A narrow band makes the bot twitch: it
      // steps in, the enemy steps in too, it steps out, and the position
      // oscillates around the threshold for as long as the enemy lives. The
      // first take had the character pinned at x=876 for thirty seconds doing
      // exactly that, with the distance reading 92, 97, 92, 97.
      if (state.targetX !== null) {
        const towardRight = state.targetX > state.px
        if (state.distance > 170) {
          await setKey(towardRight ? 'ArrowRight' : 'ArrowLeft', true)
          await setKey(towardRight ? 'ArrowLeft' : 'ArrowRight', false)
        } else if (state.distance < 110) {
          await setKey(towardRight ? 'ArrowLeft' : 'ArrowRight', true)
          await setKey(towardRight ? 'ArrowRight' : 'ArrowLeft', false)
        } else {
          await setKey('ArrowLeft', false)
          await setKey('ArrowRight', false)
        }
        await setKey('KeyJ', true)
      } else {
        // Nothing alive.
        //
        // On a horizontal stage, advance with the trigger held: the first take
        // walked in with the trigger released "to save the trail" and lost a
        // heart at x=748 with `alive = 0` on the tick before, because a wave had
        // spawned around it mid-stride.
        //
        // On the vertical shaft the character has to descend, and the only
        // control that descends is stepping off a ledge. Measured directly:
        // holding right with a steady jump carries it from y=86 down to y=1000
        // across three ledges, then stops at a wall at x=876.
        //
        // So: hold a direction and keep hopping, and flip the direction when the
        // position has not changed for a while. A fixed direction strands it;
        // this reverses out of the wall that strands it.
        if (state.vertical) {
          const towardRight = stallDirection > 0
          await setKey(towardRight ? 'ArrowRight' : 'ArrowLeft', true)
          await setKey(towardRight ? 'ArrowLeft' : 'ArrowRight', false)
        } else {
          await setKey('ArrowLeft', false)
          await setKey('ArrowRight', true)
        }
        await setKey('KeyJ', true)
      }

      // 3. A shaft is climbed down on the jump key, not on the arrow.
      //
      // Half the routes through the vertical stage need a hop up or across, and
      // leaning on "walk right" gets the character stuck against the side of the
      // very platform it needs. A steady hop while grounded covers both the
      // ledge-to-ledge descent and the small climbs, at the cost of looking
      // busier than a person would.
      if (state.vertical && state.onGround) {
        await setKey('Space', true)
        await wait(70)
        await setKey('Space', false)
      }

      // 4. Stuck against something horizontal? Hop over it.
      if (!state.vertical && state.onGround && state.targetX !== null && state.distance > 200) {
        await setKey('Space', true)
        await wait(60)
        await setKey('Space', false)
      }

      if (Date.now() - lastLog > 15000) {
        lastLog = Date.now()
        console.log(
          `  ${((Date.now() - started) / 1000).toFixed(0)}s x=${state.px} steps=${state.steps} ` +
            `hearts=${state.hearts} dist=${state.distance}`,
        )
      }
      await wait(40)
    }

    await releaseAll()
    results.push({
      stageId,
      seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
      peakSteps,
      sawMiniboss,
      restarts,
    })
    console.log(
      `  => ${stageId}: ${((Date.now() - started) / 1000).toFixed(0)}s, steps=${peakSteps}`,
    )
  }
} finally {
  await releaseAll()
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
  writeFileSync(
    `${DIR}/report.json`,
    JSON.stringify({ results, pageErrors: pageErrors.slice(0, 20) }, null, 2),
    'utf8',
  )
  await browser.close()
}

console.log('')
console.log(`关卡 ${results.length}，帧 ${frames.length}，页面错误 ${pageErrors.length}`)
console.log(`录制分辨率 ${WIDTH}x${HEIGHT}`)
