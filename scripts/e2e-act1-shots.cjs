/**
 * Captures act I screenshots from the real game.
 *
 * The acceptance run asserts on rule-layer state; this one looks. Both are needed
 * for the same reason as last time: the wave enemies were "not rendering" for
 * three sessions while every state readout was correct, and the thing that ended
 * that was a picture.
 *
 * Writes PNGs into .tmp/act1-shots/.
 */
const PORT = process.env.CONTRA_CDP_PORT || '9505'
const OUT = process.env.CONTRA_SHOT_DIR || '.tmp/act1-shots'
const STAGE = process.env.CONTRA_STAGE || 'stage-02'

const fs = require('node:fs')
const path = require('node:path')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getJson(url) {
  return new Promise((resolve, reject) => {
    require('node:http')
      .get(url, (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (error) {
            reject(error)
          }
        })
      })
      .on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`)
  const page = targets.find(
    (entry) => entry.type === 'page' && String(entry.url).includes('localhost'),
  )
  if (!page) throw new Error('no game page')

  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => {
    socket.onopen = resolve
  })

  let nextId = 1
  const pending = new Map()
  socket.onmessage = (message) => {
    const payload = JSON.parse(message.data)
    const entry = pending.get(payload.id)
    if (!entry) return
    pending.delete(payload.id)
    entry(payload.result)
  }
  const send = (method, params) =>
    new Promise((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return result?.result ? result.result.value : undefined
  }

  async function shot(name) {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    if (!result?.data) {
      console.log(`skip ${name}: no data`)
      return
    }
    const file = path.join(OUT, `${name}.png`)
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'))
    console.log(`wrote ${file}`)
  }

  /** Pins the player at an x and lets the real loop run. */
  async function pin(x, seconds) {
    const until = Date.now() + seconds * 1000
    while (Date.now() < until) {
      await evaluate(
        `(function(){var s=window.__contraGame.scene.getScene('Stage');
          if(!s||!s.world)return false;
          s.world.player.position.x=${x};
          s.world.player.hearts=s.world.startingHearts;
          return true;})()`,
      )
      await sleep(60)
    }
  }

  await evaluate(`window.__contraGame.scene.start('Stage',{stageId:'${STAGE}'}); true`)
  await sleep(2800)
  await shot('01-start')

  // First beat: the wave warning band and the first enemy.
  await pin(560, 1.2)
  await shot('02-first-beat')

  // Ledges and walls: the stage's shape past the opening.
  await pin(3000, 0.6)
  await shot('03-mid-corridor')

  // The gating beat.
  await pin(1660, 1.6)
  await shot('04-gating-beat')

  // The mid-stage fight, approached and then standing.
  await pin(8600, 0.4)
  await shot('05-before-miniboss')
  await pin(8900, 2.0)
  await shot('06-miniboss-started')

  // Into its second phase, so the frame swap is visible.
  const bodyX = 9200
  for (let round = 0; round < 26; round += 1) {
    await pin(bodyX - 130, 0.8)
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      code: 'KeyJ',
      key: 'KeyJ',
      windowsVirtualKeyCode: 74,
      nativeVirtualKeyCode: 74,
    })
    await sleep(400)
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      code: 'KeyJ',
      key: 'KeyJ',
      windowsVirtualKeyCode: 74,
      nativeVirtualKeyCode: 74,
    })
    const state = await evaluate(
      `(function(){var w=window.__contraGame.scene.getScene('Stage').world;
        return {id: w.runningMiniboss ? w.runningMiniboss.bossId : null,
                phase: w.runningMiniboss ? w.runningMiniboss.phase : 0};})()`,
    )
    if (state && state.phase >= 2) {
      await shot('07-miniboss-phase2')
      break
    }
    if (state && state.id === null) {
      await shot('08-miniboss-cleared')
      break
    }
  }

  // The door, with the route open after the fight.
  await pin(11800, 1.0)
  await shot('09-exit')

  socket.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
