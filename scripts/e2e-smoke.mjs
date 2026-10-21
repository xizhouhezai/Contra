/**
 * End-to-end smoke test against a real browser.
 *
 * The unit suites prove the rule layer works; they cannot prove the game runs.
 * That gap is exactly where this project shipped five milestones of passing
 * tests attached to a game that only ever played one hard-coded stage, so this
 * script exists to close it: it starts the built app in headless Chrome, drives
 * it through the debug handle, and asserts the stage actually advances.
 *
 * Usage: start `vite preview` first, then `node scripts/e2e-smoke.mjs`.
 * Exit code 0 means every check passed.
 */
import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const APP_URL = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const DEBUG_PORT = 9411
const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome: ${CHROME}`)
  process.exit(1)
}

const profile = join(root, '.tmp', 'e2e-profile')
rmSync(profile, { recursive: true, force: true })

const browser = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--mute-audio',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=1280,720',
  APP_URL,
])
browser.stderr.on('data', () => {})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getJson(url) {
  return new Promise((resolve, reject) => {
    request(url, (res) => {
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
    }).on('error', reject)
  })
}

let socket
let nextId = 1
const pending = new Map()

function send(method, params) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description?.slice(0, 200) ?? 'evaluate failed',
    )
  }
  return result.result?.value
}

const PROBE = '(window.__contraStage ? window.__contraStage() : null)'
const SCENES =
  'window.__contraGame.scene.getScenes(true).map(function(s){return s.scene.key}).join(",")'

const checks = []
function check(name, ok, detail) {
  checks.push({ name, ok, detail })
  console.log(`${ok ? '\u2713' : '\u2717'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
}

try {
  await sleep(13000)
  const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
  const page = targets.find((entry) => entry.type === 'page')
  if (page === undefined) throw new Error('浏览器没有打开任何页面')

  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => {
    socket.onopen = resolve
  })
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    const entry = pending.get(message.id)
    if (entry === undefined) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(message.error.message))
    else entry.resolve(message.result)
  }
  await send('Runtime.enable', {})

  check('游戏已启动', (await evaluate('typeof window.__contraGame')) === 'object')
  check('标题场景已加载', (await evaluate(SCENES)).includes('Title'))

  for (const stageId of ['stage-01', 'stage-05', 'stage-11']) {
    await evaluate(`window.__contraGame.scene.start('Stage',{stageId:'${stageId}'}); true`)
    await sleep(2500)
    const snapshot = await evaluate(PROBE)
    const running = snapshot !== null && snapshot.steps > 0
    check(
      `关卡 ${stageId} 可运行`,
      running,
      snapshot ? `${snapshot.steps} 步 / ${snapshot.fps.toFixed(1)}fps` : '无探针',
    )
    await evaluate("window.__contraGame.scene.stop('Stage'); true")
    await sleep(400)
  }

  // Movement: a stage where the player cannot move is not playable.
  await evaluate("window.__contraGame.scene.start('Stage',{stageId:'stage-01'}); true")
  await sleep(2500)
  const before = await evaluate(PROBE)
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code: 'ArrowRight',
    key: 'ArrowRight',
    windowsVirtualKeyCode: 39,
    nativeVirtualKeyCode: 39,
  })
  await sleep(1500)
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    code: 'ArrowRight',
    key: 'ArrowRight',
    windowsVirtualKeyCode: 39,
    nativeVirtualKeyCode: 39,
  })
  await sleep(600)
  const after = await evaluate(PROBE)
  check(
    '玩家可以移动',
    after.playerX > before.playerX + 50,
    `x ${before.playerX.toFixed(0)} → ${after.playerX.toFixed(0)}`,
  )

  const fps = after.fps
  check('帧率在 60fps 附近', fps > 50, `${fps.toFixed(1)}fps`)
} catch (error) {
  check('端到端运行', false, error instanceof Error ? error.message : String(error))
} finally {
  browser.kill()
}

const failed = checks.filter((entry) => !entry.ok)
console.log('')
if (failed.length > 0) {
  console.log(`\u2717 ${failed.length}/${checks.length} 项未通过`)
  process.exit(1)
}
console.log(`\u2713 ${checks.length} 项全部通过`)
