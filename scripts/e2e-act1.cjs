/**
 * Acceptance run for the act I expansion (REQ-STG-009 / REQ-STG-010).
 *
 * Drives stage 2 in a real browser and asserts on what the rule layer reports,
 * not on a screenshot. The three claims being verified are the ones the unit
 * tests cannot make:
 *
 *   1. the stage really runs on waves - the first beat fires, enemies appear
 *   2. a gating wave really holds the door - walking to the exit does nothing
 *   3. the mid-stage fight really starts, takes damage and opens the route
 *
 * It talks to the same CDP browser scripts/e2e-browser.py starts.
 */
const PORT = process.env.CONTRA_CDP_PORT || '9505'
const STAGE = process.env.CONTRA_STAGE || 'stage-02'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getJson(url) {
  return new Promise((resolve, reject) => {
    const http = require('node:http')
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
  if (!page) throw new Error('no game page; run python scripts/e2e-browser.py first')

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
    if (result?.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? 'evaluate threw')
    }
    return result?.result ? result.result.value : undefined
  }

  check('game booted', (await evaluate('typeof window.__contraGame')) === 'object')

  /** Reaches into the running stage's World without adding a test-only API. */
  const PROBE = '(window.__contraStage ? window.__contraStage() : null)'

  async function snapshot() {
    return evaluate(PROBE)
  }

  async function holdFire(ms) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      code: 'KeyJ',
      key: 'KeyJ',
      windowsVirtualKeyCode: 74,
      nativeVirtualKeyCode: 74,
    })
    await sleep(ms)
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      code: 'KeyJ',
      key: 'KeyJ',
      windowsVirtualKeyCode: 74,
      nativeVirtualKeyCode: 74,
    })
    await sleep(120)
  }

  /**
   * Pins the player at an x and lets the game's own loop advance for a while.
   *
   * Teleporting rather than walking is deliberate: a bot holding right outruns
   * every trigger it passes, so "the wave fired" would be confounded with "the
   * bot got there". Writing the position from here and letting the real update
   * run keeps the wave logic under test.
   *
   * The re-pin is a loop in Node rather than a requestAnimationFrame loop inside
   * the page: a headless page's rAF is throttled, and an awaited promise built
   * on it never settles - which hung the first version of this script.
   */
  async function teleportAndRun(x, seconds) {
    const until = Date.now() + seconds * 1000
    while (Date.now() < until) {
      await evaluate(
        `(function(){
          var s = window.__contraGame.scene.getScene('Stage');
          if (!s || !s.world) return false;
          s.world.player.position.x = ${x};
          s.world.player.hearts = s.world.startingHearts;
          return true;
        })()`,
      )
      await sleep(60)
    }
  }

  await evaluate(`window.__contraGame.scene.start('Stage',{stageId:'${STAGE}'}); true`)
  await sleep(2600)

  const boot = await snapshot()
  check('stage booted', !!boot && boot.steps > 0, boot ? `${boot.steps} steps` : 'no probe')
  check('starts with no enemies on the field', boot !== null && boot.liveTargets === 0)
  check('starts with no wave fired', boot !== null && boot.wavesFired === 0, `${boot?.wavesFired}`)
  check(
    'starts with the route shut (gating waves authored)',
    boot !== null && boot.routeOpen === false,
  )
  check('starts with the mid-stage fight not met', boot !== null && boot.minibossId === null)

  // Beat 1 - a non-gating wave at x=500. Walk into it.
  await teleportAndRun(560, 1.6)
  const beat1 = await snapshot()
  check(
    'first beat fires on contact',
    beat1 !== null && beat1.wavesFired >= 1,
    `${beat1?.wavesFired}`,
  )
  check(
    'first beat puts an enemy on the field',
    beat1 !== null && beat1.liveTargets > 0,
    `${beat1?.liveTargets}`,
  )

  // Beat 2 - the gating wave at x=1600. Enter it, then try the door.
  await teleportAndRun(1660, 2.2)
  const gating = await snapshot()
  check('gating beat fires', gating !== null && gating.wavesFired >= 2, `${gating?.wavesFired}`)
  check(
    'route stays shut while the gating beat is alive',
    gating !== null && gating.routeOpen === false,
  )

  await teleportAndRun(11900, 2.0)
  const atDoor = await snapshot()
  check(
    'walking to the exit does not clear the stage',
    atDoor !== null && atDoor.cleared === false,
    `cleared=${atDoor?.cleared} routeOpen=${atDoor?.routeOpen}`,
  )

  // The mid-stage fight at x=9200, trigger at 8800.
  await teleportAndRun(8900, 2.0)
  const mini = await snapshot()
  check(
    'mid-stage fight starts at its trigger',
    mini !== null && mini.minibossId === 'miniboss-pipe-warden',
    `${mini?.minibossId}`,
  )
  check('mid-stage fight has HP', mini !== null && mini.minibossHp > 0, `${mini?.minibossHp}`)
  check(
    'the route is still shut while the mid-stage fight stands',
    mini !== null && mini.minibossRouteOpen === false,
  )

  // Stand in front of it and shoot until it is down.
  const bodyX = 9200
  let phaseSeen = 0
  let hpAfter = mini?.minibossHp ?? 0
  for (let round = 0; round < 26; round += 1) {
    await teleportAndRun(bodyX - 130, 0.9)
    await holdFire(420)
    const now = await snapshot()
    if (now === null) break
    phaseSeen = Math.max(phaseSeen, now.minibossPhase ?? 0)
    hpAfter = now.minibossHp ?? 0
    if (now.minibossId === null) break
  }
  const killed = await snapshot()
  check(
    'bullets damage the mid-stage fight',
    hpAfter < (mini?.minibossHp ?? 0),
    `${mini?.minibossHp} → ${hpAfter}`,
  )
  check('mid-stage fight reaches its second phase', phaseSeen >= 2, `phase ${phaseSeen}`)
  check(
    'finishing the fight clears it',
    killed !== null && killed.minibossId === null,
    `miniboss=${killed?.minibossId} hp=${killed?.minibossHp}`,
  )
  check('finishing the fight opens its route', killed !== null && killed.minibossRouteOpen === true)

  const fps = killed?.fps ?? 0
  check('frame rate held', fps > 40, `${fps.toFixed(1)} fps`)

  // No close code: undici rejects an explicit one it does not recognise, and the
  // first version of this script hung the whole run on that exception after every
  // check had already passed.
  socket.close()
  const failed = results.filter((row) => !row.ok)
  console.log('')
  console.log(`${results.length - failed.length}/${results.length} passed`)
  if (failed.length > 0) {
    console.log('failed:')
    for (const row of failed) console.log(`  - ${row.name}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
