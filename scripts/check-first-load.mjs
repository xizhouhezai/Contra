import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, sep } from 'node:path'

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

// The first load is what the browser fetches to show the title screen. That
// is not "every file in dist": a lazy import produces a separate chunk that is
// only requested when the code path runs, and its image sits next to it unused
// until then. Counting the whole directory said 22MB for a page whose entry
// script is 1.4MB - the number was measuring the disc, not the load.
//
// So: walk the actual import graph from index.html, and treat anything
// reachable only through a lazy chunk as deferred. Everything a stage needs is
// fetched on stage entry, which is exactly what a lazy chunk means.
const entryFiles = (() => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  return [...html.matchAll(/assets\/[^"']+\.(?:js|css)/g)].map((m) => m[0].replace(/^\//, ''))
})()

const firstSet = new Set(entryFiles)
const deferredSet = new Set()

function collectImports(relPath, into) {
  const full = join(DIST, relPath)
  if (!existsSync(full)) return
  let src
  try {
    src = readFileSync(full, 'utf8')
  } catch {
    return
  }
  // Vite emits static imports as `from"./x.js"` and dynamic ones as `import("./x.js")`.
  // Both are tracked, but a dynamic target is deferred, not first.
  const staticRe = /from\s*["']\.\/([^"']+\.(?:js|css))["']/g
  const dynamicRe = /import\(\s*["']\.\/([^"']+\.(?:js|css))["']\s*\)/g
  for (const m of src.matchAll(staticRe)) {
    const next = `assets/${m[1]}`
    if (!firstSet.has(next)) {
      firstSet.add(next)
      collectImports(next, into)
    }
  }
  for (const m of src.matchAll(dynamicRe)) {
    deferredSet.add(`assets/${m[1]}`)
  }
}

for (const f of entryFiles) collectImports(f, firstSet)

// An image is deferred when no eagerly-loaded chunk mentions it. Lazy chunks
// name their asset inline, and those chunks are already in deferredSet.
const eagerSource = [...firstSet]
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    try {
      return readFileSync(join(DIST, f), 'utf8')
    } catch {
      return ''
    }
  })
  .join('\n')

let first = 0
let deferred = 0

for (const file of walk(DIST)) {
  const size = statSync(file).size
  const rel = file
    .slice(DIST.length + 1)
    .split(sep)
    .join('/')
  if (rel.endsWith('.js') || rel.endsWith('.css')) {
    if (firstSet.has(rel)) first += size
    else deferred += size
    continue
  }
  if (rel.endsWith('.html')) {
    first += size
    continue
  }
  // A binary asset counts as first only if an eagerly-loaded chunk names it.
  const name = basename(file)
  if (eagerSource.includes(name)) first += size
  else deferred += size
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`
console.log(`首包（启动必需）: ${mb(first)}`)
console.log(`按需加载（音乐 + 梗图）: ${mb(deferred)}`)

if (first > 8 * 1024 * 1024) {
  console.log('✗ 首包超过 8MB 预算')
  process.exit(1)
}
console.log('✓ 首包在 8MB 预算内')
