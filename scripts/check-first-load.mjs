import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const DIST = join(process.cwd(), 'packages', 'game-web', 'dist')

/**
 * First-load budget check (REQ-NFR-003).
 *
 * The budget is about what a player downloads to start playing, not about
 * every byte the build produced. Music loads when a stage starts and the
 * chibi looks load when the player opens the look switcher, so neither is part
 * of the first load.
 *
 * Measuring the whole dist folder is what made this look like an 8.41MB
 * regression when the first load was 2.79MB and 5.62MB of it was music that
 * was never needed to start.
 */

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

if (!existsSync(DIST)) {
  console.log('未构建，跳过首包检查')
  process.exit(0)
}

let first = 0
let deferred = 0

for (const file of walk(DIST)) {
  const size = statSync(file).size
  const name = basename(file)
  // Audio and the chibi looks are fetched when needed, not to start.
  const isDeferred = name.endsWith('.ogg') || /^[0-9]+-[A-Za-z0-9_-]+\.webp$/.test(name)
  if (isDeferred) deferred += size
  else first += size
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`
console.log(`首包（启动必需）: ${mb(first)}`)
console.log(`按需加载（音乐 + 梗图）: ${mb(deferred)}`)

if (first > 8 * 1024 * 1024) {
  console.log('✗ 首包超过 8MB 预算')
  process.exit(1)
}
console.log('✓ 首包在 8MB 预算内')
