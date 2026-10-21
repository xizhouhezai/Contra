/**
 * End-to-end checks against the built game.
 *
 * Unit tests prove the rule layer; they cannot prove the game runs. This drives
 * the real bundle in a real browser and asserts on what the game reports.
 *
 * Two processes, because Node cannot launch Chrome in this environment (spawn
 * succeeds but the parent event loop stalls):
 *   python scripts/e2e-browser.py   # start headless Chrome (detached)
 *   node scripts/e2e-smoke.cjs      # drive it over CDP
 */
const http = require('node:http')

const PORT = process.env.CONTRA_CDP_PORT || '9505'
const STAGES = (process.env.CONTRA_E2E_STAGES || 'stage-01,stage-05,stage-11,stage-12')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
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

const results = []
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log((ok ? '  OK  ' : ' FAIL ') + name + (detail === undefined ? '' : `  ${detail}`))
}

async function main() {
  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`)
  const page = targets.find(
    (entry) => entry.type === 'page' && String(entry.url).includes('localhost'),
  )
  if (!page) throw new Error('没有找到游戏页面，先运行 python scripts/e2e-browser.py')

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
      expression: expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return result?.result ? result.result.value : undefined
  }

  check('游戏已启动', (await evaluate('typeof window.__contraGame')) === 'object')

  const PROBE = '(window.__contraStage ? window.__contraStage() : null)'
  const SCENES =
    'window.__contraGame.scene.getScenes(true).map(function(s){return s.scene.key}).join(",")'

  /** Sends a real key press, holding it long enough for the game to see it. */
  async function dial(code, virtualKey, holdMs) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      code,
      key: code,
      windowsVirtualKeyCode: virtualKey,
      nativeVirtualKeyCode: virtualKey,
    })
    await sleep(holdMs)
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      code,
      key: code,
      windowsVirtualKeyCode: virtualKey,
      nativeVirtualKeyCode: virtualKey,
    })
    await sleep(400)
  }

  for (const stageId of STAGES) {
    await evaluate(`window.__contraGame.scene.start('Stage',{stageId:'${stageId}'}); true`)
    await sleep(2500)
    const snapshot = await evaluate(PROBE)
    check(
      `关卡 ${stageId}`,
      !!snapshot && snapshot.steps > 0,
      snapshot ? `${snapshot.steps} 步 / ${snapshot.fps.toFixed(1)}fps` : '无探针',
    )
    await evaluate("window.__contraGame.scene.stop('Stage'); true")
    await sleep(400)
  }

  // The real player path, driven by key presses rather than by scene.start.
  // Everything above proves the stages work; only this proves a player can
  // reach one, which is the thing that was actually broken.
  await send('Page.reload', {})
  await sleep(14000)
  await dial('Enter', 13, 80)
  await sleep(1200)
  check('标题 -> 选关', String(await evaluate(SCENES)).includes('StageSelect'))
  await dial('Enter', 13, 80)
  await sleep(2500)
  check('选关 -> 关卡', String(await evaluate(SCENES)).includes('Stage'))

  const before = await evaluate(PROBE)
  const key = (type) => ({
    type: type,
    code: 'ArrowRight',
    key: 'ArrowRight',
    windowsVirtualKeyCode: 39,
    nativeVirtualKeyCode: 39,
  })
  await send('Input.dispatchKeyEvent', key('keyDown'))
  await sleep(1500)
  await send('Input.dispatchKeyEvent', key('keyUp'))
  await sleep(600)
  const after = await evaluate(PROBE)

  check(
    '玩家可移动',
    after.playerX > before.playerX + 50,
    `x ${before.playerX.toFixed(0)} → ${after.playerX.toFixed(0)}`,
  )
  check('帧率正常', after.fps > 50, `${after.fps.toFixed(1)}fps`)

  socket.close()
}

main()
  .then(() => {
    const failed = results.filter((entry) => !entry.ok).length
    console.log('')
    if (failed > 0) {
      console.log(`✗ ${failed} 项未通过`)
      process.exit(1)
    }
    console.log(`✓ ${results.length} 项全部通过`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('端到端检查失败:', error?.message ? error.message : error)
    process.exit(1)
  })
