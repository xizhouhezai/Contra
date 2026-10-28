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

  /**
   * Pins the player at a y and lets the game's own loop advance.
   *
   * The vertical twin of teleportAndRun. Stage 11 advances by y, so a checker that
   * only knows about x cannot reach any of its beats.
   *
   * x defaults to the open channel, but a caller can move it aside: a vertical
   * stage's ledges are anchored to alternating walls, and a body pinned to the
   * channel will fall straight past a fight that sits on a ledge off to one side.
   */
  async function teleportAndRunY(y, seconds, x = 450) {
    const until = Date.now() + seconds * 1000
    while (Date.now() < until) {
      await evaluate(
        `(function(){
          var s = window.__contraGame.scene.getScene('Stage');
          if (!s || !s.world) return false;
          s.world.player.position.y = ${y};
          s.world.player.position.x = ${x};
          s.world.player.hearts = s.world.startingHearts;
          return true;
        })()`,
      )
      await sleep(60)
    }
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
  // The stage's own numbers, read from the live game rather than hardcoded.
  //
  // The first version of this script had stage 2's coordinates written into it
  // (beat at 1600, miniboss at 9200), so pointing it at another stage produced
  // six false failures - the checks were asking the right questions about the
  // wrong places. Reading them back makes the same script an acceptance run for
  // all twelve stages.
  const layout = await evaluate(
    `(function(){
      var s = window.__contraGame.scene.getScene('Stage');
      var stage = s.stage;
      var vertical = stage.scrollMode === 'vertical';
      var waves = (stage.waves || []).map(function(w){
        return { id: w.id, x: w.trigger.x, y: w.trigger.y, w: w.trigger.width, h: w.trigger.height, gates: w.gates };
      });
      var mini = (stage.minibosses || [])[0] || null;
      return {
        id: stage.id,
        vertical: vertical,
        exitX: stage.exit.x,
        exitY: stage.exit.y,
        bossId: stage.bossId || null,
        waves: waves,
        mini: mini ? { id: mini.minibossId, x: mini.x, y: mini.y, tx: mini.trigger.x, ty: mini.trigger.y } : null,
      };
    })()`,
  )
  if (layout === null || layout === undefined) throw new Error('could not read the stage layout')

  const firstBeat = layout.waves[0]
  const gatingBeat = layout.waves.find((wave) => wave.gates)
  const mini = layout.mini
  console.log(
    `  layout: ${layout.id}${layout.vertical ? ' (vertical)' : ''}, ${layout.waves.length} waves, ` +
      `miniboss ${mini ? mini.id : 'none'}, boss ${layout.bossId ?? 'none'}`,
  )

  /**
   * Pins the player at a point on the stage's own axis.
   *
   * A vertical stage advances by y, so pinning x would leave the body at the top
   * of the shaft no matter which beat was being tested - which is exactly how the
   * first version of this script produced eight false failures on stage 11.
   */
  async function pinAt(wave, extra = 0) {
    if (layout.vertical) {
      await teleportAndRunY(wave.y + (wave.h ?? 200) / 2 + extra, 0.9)
      return
    }
    await teleportAndRun(wave.x + 60 + extra, 0.9)
  }

  check('stage booted', !!boot && boot.steps > 0, boot ? `${boot.steps} steps` : 'no probe')
  check('starts with no enemies on the field', boot !== null && boot.liveTargets === 0)
  check('starts with no wave fired', boot !== null && boot.wavesFired === 0, `${boot?.wavesFired}`)
  // A boss stage's door belongs to the boss, so its waves deliberately do not
  // gate. Only a stage without a boss is expected to start shut.
  if (layout.bossId === null) {
    check(
      'starts with the route shut (gating waves authored)',
      boot !== null && boot.routeOpen === false,
    )
  }
  check('starts with the mid-stage fight not met', boot !== null && boot.minibossId === null)

  // Beat 1: walk into the first trigger.
  await pinAt(firstBeat)
  await sleep(1200)
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

  // A gating beat, then try the door.
  if (gatingBeat !== undefined) {
    await pinAt(gatingBeat)
    await sleep(1400)
    const gating = await snapshot()
    check('gating beat fires', gating !== null && gating.wavesFired >= 2, `${gating?.wavesFired}`)
    check(
      'route stays shut while the gating beat is alive',
      gating !== null && gating.routeOpen === false,
    )
  }

  if (layout.vertical) {
    await teleportAndRunY(layout.exitY - 40, 2.0)
  } else {
    await teleportAndRun(layout.exitX - 100, 2.0)
  }
  const atDoor = await snapshot()
  check(
    'walking to the exit does not clear the stage',
    atDoor !== null && atDoor.cleared === false,
    `cleared=${atDoor?.cleared} routeOpen=${atDoor?.routeOpen}`,
  )

  if (mini === null) {
    console.log('  (no miniboss on this stage; skipping the fight checks)')
  } else {
    if (layout.vertical) {
      // Drop in from above the fight's own anchor so the trigger is entered on the
      // way down, and stand on the side the body is on: the gaoler clings to the
      // shaft wall at x=560, not to the open channel.
      await teleportAndRunY(mini.ty + 60, 2.0, mini.x)
    } else {
      await teleportAndRun(mini.tx + 60, 2.0)
    }
    const started = await snapshot()
    check(
      'mid-stage fight starts at its trigger',
      started !== null && started.minibossId === mini.id,
      `${started?.minibossId}`,
    )
    check(
      'mid-stage fight has HP',
      started !== null && started.minibossHp > 0,
      `${started?.minibossHp}`,
    )
    check(
      'the route is still shut while the mid-stage fight stands',
      started !== null && started.minibossRouteOpen === false,
    )

    // Stand in front of it and shoot until it is down.
    //
    // The stand-off distance has to be long enough to be in range and short enough
    // to be on solid ground: `mini.x - 130` put the player over the gap before
    // stage 3's ground slab, so the body fell through the world and not one shot
    // landed. Standing 60 to the left of the body keeps the player on the same
    // surface the fight is anchored to.
    //
    // On a vertical stage "in front of" means the same height, off to one side:
    // the player fires level, so standing above the body and shooting sideways
    // misses it entirely.
    let phaseSeen = 0
    let hpAfter = started?.minibossHp ?? 0
    for (let round = 0; round < 30; round += 1) {
      // Pin and fire in the same loop.
      //
      // The first version pinned for 0.9s and then fired for another 0.4s without
      // re-pinning - so during the only part that mattered the player was free to
      // drift off the ledge, and on stage 3 it did: the body fell into the gap
      // before its slabs and every shot went over the fight. A diagnostic that
      // pinned and fired together took the boss down in six volleys, which is what
      // pointed at the harness rather than the stage.
      const holdMs = 900
      const until = Date.now() + holdMs
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        code: 'KeyJ',
        key: 'KeyJ',
        windowsVirtualKeyCode: 74,
        nativeVirtualKeyCode: 74,
      })
      while (Date.now() < until) {
        const pinX = layout.vertical ? mini.x - 150 : mini.x - 80
        // Pin y as well as x, always.
        //
        // Setting only x leaves the body wherever the last pin left it in y, and
        // the first pin of a run happens when the player is still at the spawn
        // height. On a flat stage the next step drops it onto the floor; on stage
        // 3 the fight stands on a slab whose x range the body had already fallen
        // past, so it fell straight through the world and the whole volley went
        // nowhere. The verbose round print is what showed a player at y=44136.
        const pinY = layout.vertical ? mini.y : mini.y
        await evaluate(
          `(function(){var s=window.__contraGame.scene.getScene('Stage');
            s.world.player.position.x=${pinX}; s.world.player.position.y=${pinY};
            s.world.player.hearts=s.world.startingHearts; return true;})()`,
        )
        await sleep(60)
      }
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        code: 'KeyJ',
        key: 'KeyJ',
        windowsVirtualKeyCode: 74,
        nativeVirtualKeyCode: 74,
      })
      await sleep(120)
      const now = await snapshot()
      if (now === null) break
      // Report the harness's own view once per round. Without this, a fight that
      // silently takes no damage is indistinguishable from a harness pinning the
      // player somewhere useless - and both happened while stage 3 was being
      // brought up.
      if (process.env.CONTRA_E2E_VERBOSE === '1') {
        const dbg = await evaluate(
          `(function(){var s=window.__contraGame.scene.getScene('Stage');var w=s.world;
            var m=w.activeMiniboss;
            return {px:Math.round(w.player.position.x),py:Math.round(w.player.position.y),
              onGround:w.player.onGround,hp:m?m.hp:null,
              boxX:m?Math.round(m.box.x):null,boxY:m?Math.round(m.box.y):null,
              bullets:w.bullets.length};})()`,
        )
        console.log(`    round ${round}: ${JSON.stringify(dbg)}`)
      }
      phaseSeen = Math.max(phaseSeen, now.minibossPhase ?? 0)
      hpAfter = now.minibossHp ?? 0
      if (now.minibossId === null) break
    }
    const killed = await snapshot()
    check(
      'bullets damage the mid-stage fight',
      hpAfter < (started?.minibossHp ?? 0),
      `${started?.minibossHp} → ${hpAfter}`,
    )
    check('mid-stage fight reaches its second phase', phaseSeen >= 2, `phase ${phaseSeen}`)
    check(
      'finishing the fight clears it',
      killed !== null && killed.minibossId === null,
      `miniboss=${killed?.minibossId} hp=${killed?.minibossHp}`,
    )
    check(
      'finishing the fight opens its route',
      killed !== null && killed.minibossRouteOpen === true,
    )
  }

  const final = await snapshot()
  const fps = final?.fps ?? 0
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
