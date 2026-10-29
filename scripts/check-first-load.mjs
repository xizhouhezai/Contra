import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

/**
 * First-load budget check (REQ-NFR-003).
 *
 * The budget is about bytes that cross the network before the player can move,
 * so three corrections separate it from "the size of dist":
 *
 * 1. Scope is the ESM import graph reachable from index.html, not the folder.
 *    A dynamic import is a separate chunk the browser fetches only when that
 *    code path runs, so a lazy chunk and the art it names are deferred. Walking
 *    the directory instead counted 50MB here against ~3.7MB of real traffic.
 * 2. Static imports are followed transitively, so a chunk pulled in by the
 *    entry chunk counts even though index.html never names it.
 * 3. Text is measured gzipped. Every static host compresses a Vite build, and
 *    the entry chunk on disk is 1.51MB but 0.46MB on the wire; counting raw
 *    disk bytes would overstate the JS bundle by more than a megabyte. Media
 *    (webp/ogg) is already compressed and is counted at its file size.
 *
 * The cross-check that fixed this script was a CDP run reading
 * Network.loadingFinished.encodedDataLength: it reported 3.64MB of payload
 * (3.66MB once response headers are included) while the old directory walk
 * reported 31MB. This script reproduces the payload figure within ~14KB of
 * HTTP header overhead, which it deliberately does not model - the number to
 * guard is what the build costs, not what one CDN's headers add to it. No
 * browser is involved, so CI can enforce it.
 */

const root = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(root, 'packages', 'game-web', 'dist')
const BUDGET = 8 * 1024 * 1024

/**
 * Globs whose only load site is a lazy scene, which the module graph cannot see.
 *
 * Every other asset glob is queued by BootScene on the way to the title, so
 * "the entry chunk names this url" really does mean "the title screen fetches
 * it". These two are the exceptions: preloadBgm() and preloadTerrain() are
 * called from StageScene.preload, and StageScene is itself behind a dynamic
 * import. Their urls still sit in the entry chunk because the modules that own
 * them are reachable from it, so chunk-reference alone over-counts - which is
 * how the same mistake made this load look like 8.41MB when it was 2.79MB, and
 * how 26MB of music ended up inside a "first load".
 *
 * Keyed by source glob so a renamed file cannot silently fall out of the rule,
 * and kept to a literal list so the next exception has to be argued for.
 */
const DEFERRED_GLOBS = [
  {
    prefix: 'audio/bgm/',
    why: 'preloadBgm() 只在 StageScene.preload 入队，标题页不会请求任何一首',
  },
  {
    prefix: 'terrain/',
    why: 'preloadTerrain() 同样只在 StageScene.preload 入队',
  },
  {
    prefix: 'stamps/',
    why: 'preloadStamp() 在 ResultScene.preload 入队，通关结算才用得上',
  },
  {
    prefix: 'bosses/',
    why: 'preloadBossArt() 在 StageScene.preload 入队，走到 Boss 门才用得上',
  },
  {
    prefix: 'avatars/',
    why: '全项目没有任何场景绘制头像，BootScene 已于 2026-10-29 停止加载',
  },
]

const INDEX = join(DIST, 'index.html')
if (!existsSync(INDEX)) {
  console.log('未构建，跳过首包检查')
  process.exit(0)
}
const html = readFileSync(INDEX, 'utf8')

const STATIC_FROM = /\bfrom\s*["']([^"']+)["']/g
const STATIC_BARE = /\bimport\s*["']([^"']+)["']/g
const ASSET_URL = /\/assets\/[\w.-]+/g
// A module the browser can execute or apply, versus bytes it only displays.
const CHUNK_FILE = /\.(?:m?js|css|html)$/
// Text compresses well; webp and ogg are already compressed and would be served
// as-is, so gzipping them here would understate what the player downloads.
const COMPRESSIBLE = /\.(?:m?js|css|html|json|svg|map|txt)$/

function resolveRelative(owner, spec) {
  if (!spec.startsWith('.')) return null
  return posix.normalize(posix.join(posix.dirname(owner), spec))
}

// index.html is the only file the browser is told to fetch up front; anything
// else arrives because some chunk imports it.
const entryPoints = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)]
  .map((match) => match[1].replace(/^\//, ''))
  .filter((ref) => /\.(?:js|css)$/.test(ref))

// index.html itself is the first byte on the wire, so it counts with the chunks.
const eagerChunks = new Set(['index.html'])
const pending = [...entryPoints]

while (pending.length > 0) {
  const rel = pending.pop()
  if (eagerChunks.has(rel) || !existsSync(join(DIST, rel))) continue
  eagerChunks.add(rel)
  const source = readFileSync(join(DIST, rel), 'utf8')
  for (const pattern of [STATIC_FROM, STATIC_BARE]) {
    for (const match of source.matchAll(pattern)) {
      const next = resolveRelative(rel, match[1])
      if (next !== null) pending.push(next)
    }
  }
  // A dynamic import target is deliberately not enqueued: the browser fetches
  // it when the code path runs, which is the definition of deferred.
}

const eagerSource = [...eagerChunks]
  .map((rel) => {
    try {
      return readFileSync(join(DIST, rel), 'utf8')
    } catch {
      return ''
    }
  })
  .join('\n')

/** Urls a chunk that boots would name. Global matching is safe: they are literals. */
const eagerUrls = new Set(eagerSource.match(ASSET_URL) ?? [])

/**
 * Url -> source path under docs/game/requirements/assets.
 *
 * Vite compiles an eager import.meta.glob into a map from the source path to
 * either an inlined url or a module-level variable holding it, so both shapes
 * have to be read to recover which source folder produced a url.
 */
function globOrigins(source) {
  const variables = new Map()
  for (const match of source.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*"(\/assets\/[^"]+)"/g)) {
    variables.set(match[1], match[2])
  }

  const origins = new Map()
  const entryPattern =
    /"((?:\.\.\/)+docs\/game\/requirements\/assets\/([^"]+))":\s*(?:"([^"]+)"|([A-Za-z_$][\w$]*))/g
  for (const match of source.matchAll(entryPattern)) {
    const url = match[3] ?? variables.get(match[4])
    if (url !== undefined) origins.set(url, match[2])
  }
  return origins
}

const origins = globOrigins(eagerSource)

function deferredReason(url) {
  const origin = origins.get(url)
  if (origin === undefined) return null
  const rule = DEFERRED_GLOBS.find((candidate) => origin.startsWith(candidate.prefix))
  return rule === undefined ? null : rule
}

/** Every file in dist, as a posix path relative to it. */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(relative(DIST, full).split(sep).join('/'))
  }
  return out
}

/** Bytes on the wire: text is compressed by the host, media is already compressed. */
function wireSize(rel) {
  const full = join(DIST, rel)
  if (!COMPRESSIBLE.test(rel)) return statSync(full).size
  return gzipSync(readFileSync(full), { level: 9 }).length
}

const CATEGORY = [
  ['js', /\.(?:m?js)$/],
  ['css', /\.css$/],
  ['html', /\.html$/],
  ['image', /\.(?:webp|png|jpe?g|gif|svg|avif)$/],
  ['audio', /\.(?:ogg|mp3|wav|m4a)$/],
]

function categoryOf(rel) {
  for (const [name, pattern] of CATEGORY) if (pattern.test(rel)) return name
  return 'other'
}

const firstByCategory = new Map()
const deferredByCategory = new Map()
// Deferred reasons are tracked per rule so the report can name them, rather
// than lumping a deliberate lazy-load together with an unreached chunk.
const deferredByRule = new Map()
const deferredUnreferenced = []
const deferredChunks = []

function add(map, key, bytes) {
  map.set(key, (map.get(key) ?? 0) + bytes)
}

for (const rel of walk(DIST)) {
  const bytes = wireSize(rel)
  const category = categoryOf(rel)
  const url = `/${rel}`

  if (CHUNK_FILE.test(rel)) {
    // A chunk's own bytes are first load only when the static graph reaches it;
    // a dynamic import is fetched later, together with whatever it names.
    if (eagerChunks.has(rel)) {
      add(firstByCategory, category, bytes)
    } else {
      add(deferredByCategory, category, bytes)
      deferredChunks.push(rel)
    }
    continue
  }

  const rule = deferredReason(url)
  if (eagerUrls.has(url) && rule === null) {
    add(firstByCategory, category, bytes)
    continue
  }

  add(deferredByCategory, category, bytes)
  if (rule !== null) add(deferredByRule, rule, bytes)
  else deferredUnreferenced.push(rel)
}

const sum = (map) => [...map.values()].reduce((total, bytes) => total + bytes, 0)
const firstTotal = sum(firstByCategory)
const deferredTotal = sum(deferredByCategory)

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`
const ORDER = ['js', 'css', 'html', 'image', 'audio', 'other']

function report(map, total) {
  for (const key of ORDER) {
    const bytes = map.get(key)
    if (bytes === undefined || bytes === 0) continue
    const share = ((bytes / total) * 100).toFixed(1)
    console.log(`  ${key.padEnd(6)}${mb(bytes).padStart(8)}  ${share.padStart(5)}%`)
  }
}

console.log(`首包（启动必需）: ${mb(firstTotal)}`)
report(firstByCategory, firstTotal)

console.log(`按需加载（音乐 + 梗图）: ${mb(deferredTotal)}`)
report(deferredByCategory, deferredTotal)

// Split the deferred pile the way the budget cares about it: bytes this project
// chose to defer, and bytes no eager chunk ever names.
const unreferencedBytes = deferredUnreferenced.reduce((total, rel) => total + wireSize(rel), 0)
const chunkBytes = deferredTotal - unreferencedBytes - sum(deferredByRule)
if (unreferencedBytes > 0) {
  console.log(`  懒加载图片${mb(unreferencedBytes).padStart(8)}  ${deferredUnreferenced.length} 个`)
}
if (chunkBytes > 0) {
  console.log(`  懒加载块  ${mb(chunkBytes).padStart(8)}  ${deferredChunks.length} 个`)
}
for (const [rule, bytes] of deferredByRule) {
  console.log(`  ${rule.prefix.padEnd(10)}${mb(bytes).padStart(8)}`)
  console.log(`    ${rule.why}`)
}

const basis = '口径：index.html 的 ESM 静态导入图；文本按 gzip、媒体按原始字节'
if (firstTotal > BUDGET) {
  const worst = [...firstByCategory].sort((a, b) => b[1] - a[1])[0]
  console.log(`✗ 首包超过 ${mb(BUDGET)} 预算：超出 ${mb(firstTotal - BUDGET)}`)
  if (worst !== undefined) console.log(`  最大来源：${worst[0]} ${mb(worst[1])}`)
  console.log(`  ${basis}`)
  process.exit(1)
}

console.log(`✓ 首包在 ${mb(BUDGET)} 预算内（剩余 ${mb(BUDGET - firstTotal)}）`)
console.log(`  ${basis}`)
