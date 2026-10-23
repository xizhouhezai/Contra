import { writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

/**
 * Proves the stage mechanics reach the game, in a real browser.
 *
 * The rule-layer unit tests all passed while every mechanic did nothing in play,
 * because they build a World directly and the game builds it somewhere else. This
 * drives the actual game and checks the observable outcome of each mechanic.
 *
 * It is the counterpart to the cheap source-level guard in
 * packages/game-web/test/stageMechanicWiring.test.ts: that one fails fast on
 * every commit, this one is the proof.
 */
const URL = process.env.CONTRA_URL ?? 'http://localhost:4180/'
const results = []
let failed = 0

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720 },
})

const record = (name, ok, detail) => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}  ${detail}`)
  if (!ok) failed += 1
}

try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
  await new Promise((r) => setTimeout(r, 6000))

  const enter = async (stageId) => {
    await page.evaluate((id) => {
      const g = window.__contraGame
      for (const key of ['Title', 'CharacterSelect', 'StageSelect', 'Stage']) g.scene.stop(key)
      g.scene.start('Stage', { stageId: id, characterId: 'deepseek' })
    }, stageId)
    await new Promise((r) => setTimeout(r, 3000))
  }

  // ── bounce-wall：第 2 关有两面弹墙 ──
  await enter('stage-02')
  const bounce = await page.evaluate(() => {
    const s = window.__contraGame.scene.getScene('Stage')
    const w = s.world
    const wall = s.stage.bounceWalls?.[0]
    if (!wall) return { ok: false, why: 'stage has no bounce wall' }
    w.player.position.x = wall.x - 150
    w.player.position.y = wall.y + 100
    const idle = { moveX: 0, moveY: 0, jump: false, fire: true, bomb: false }
    let reflected = false
    let minVx = 0
    for (let i = 0; i < 150; i += 1) {
      w.update(1 / 60, idle)
      w.player.position.x = wall.x - 150
      w.player.position.y = wall.y + 100
      for (const b of w.bullets) {
        if (b.owner !== 'player') continue
        if (b.velocity.x < minVx) minVx = b.velocity.x
        if (b.velocity.x < 0) reflected = true
      }
    }
    return { ok: reflected, why: `reflected=${reflected} minVx=${Math.round(minVx)}` }
  })
  record('bounce-wall reflects a round', bounce.ok, bounce.why)

  // ── moving-platform：第 10 关的平台带着站上去的人走 ──
  await enter('stage-10')
  const moving = await page.evaluate(() => {
    const s = window.__contraGame.scene.getScene('Stage')
    const w = s.world
    // Find a platform that declares motion.
    const plank = w.platforms.find((p) => p.motion !== undefined)
    if (!plank) return { ok: false, why: 'no moving platform on this stage' }
    const top = plank.y
    w.player.position.x = plank.x + plank.width / 2
    w.player.position.y = top - 40
    const idle = { moveX: 0, moveY: 0, jump: false, fire: false, bomb: false }
    let startX = 0
    let endX = 0
    for (let i = 0; i < 180; i += 1) {
      w.update(1 / 60, idle)
      if (i === 10) startX = w.player.position.x
      if (i === 170) endX = w.player.position.x
    }
    const moved = Math.abs(endX - startX)
    return { ok: moved > 4, why: `rider moved ${Math.round(moved)}px` }
  })
  record('moving-platform carries its rider', moving.ok, moving.why)

  // ── vertical-scroll：第 11 关是竖向 ──
  await enter('stage-11')
  const vertical = await page.evaluate(() => {
    const s = window.__contraGame.scene.getScene('Stage')
    return {
      ok: s.stage.scrollMode === 'vertical',
      why: `scrollMode=${s.stage.scrollMode}`,
    }
  })
  record('vertical-scroll stage scrolls vertically', vertical.ok, vertical.why)

  // ── armored-enemy：第 11 关的装甲兵正面免疫、背面受伤 ──
  const armour = await page.evaluate(() => {
    const s = window.__contraGame.scene.getScene('Stage')
    const w = s.world
    const armoured = w.targets.find((t) => t.archetype === 'armored')
    if (!armoured) return { ok: false, why: 'no armoured enemy on this stage' }

    // Fire at its face and at its back, and compare.
    const cx = armoured.box.x + armoured.box.width / 2
    const cy = armoured.box.y + armoured.box.height / 2
    const idle = { moveX: 0, moveY: 0, jump: false, fire: true, bomb: false }
    const hpBefore = armoured.hp

    // Front: the player stands to its right, so the shot arrives at the face.
    w.player.position.x = cx + 90
    w.player.position.y = cy - 20
    for (let i = 0; i < 90; i += 1) {
      w.update(1 / 60, idle)
      w.player.position.x = cx + 90
      w.player.position.y = cy - 20
    }
    const afterFront = armoured.hp

    // Back: the player moves to the other side.
    w.player.position.x = cx - 90
    for (let i = 0; i < 90; i += 1) {
      w.update(1 / 60, idle)
      w.player.position.x = cx - 90
      w.player.position.y = cy - 20
    }
    const afterBack = armoured.hp

    const frontBlocked = afterFront === hpBefore
    const backHurt = afterBack < afterFront
    return {
      ok: frontBlocked && backHurt,
      why: `front=${frontBlocked ? 'blocked' : 'hurt'} back=${backHurt ? 'hurt' : 'blocked'}`,
    }
  })
  record('armored-enemy present in act 3', armour.ok, armour.why)

  record('no page errors', errors.length === 0, errors.slice(0, 2).join(' | ') || 'none')

  writeFileSync('.tmp/mechanics-report.json', JSON.stringify(results, null, 2))
  console.log(`\n${failed === 0 ? '✓ 全部机制在游戏中生效' : `✗ ${failed} 项未生效`}`)
  if (failed > 0) process.exitCode = 1
} finally {
  await browser.close()
}
