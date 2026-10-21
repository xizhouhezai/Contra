/**
 * Self-hosting guard (REQ-NFR-021, REQ-NFR-006).
 *
 * Every asset must be bundled. A stray CDN URL would both break the
 * self-hosting requirement and ping a third party on every launch, which the
 * privacy requirement forbids. This scans source for http(s) links that are not
 * obviously ours.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_DIRS = [
  'packages/game-web/src',
  'packages/game-core/src',
  'packages/game-platform/src',
]
const SOURCE_EXT = /\.[tj]sx?$|\.vue$|\.html$/
const URL_RE = /https?:\/\/[^"'\s)]+/g

/** Hosts that are legitimately ours or local. */
const ALLOWED = ['contra', 'localhost', '127.0.0.1', '0.0.0.0']

const offenders = []

function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!SOURCE_EXT.test(entry)) continue

    const text = readFileSync(path, 'utf8')
    for (const url of text.match(URL_RE) ?? []) {
      if (ALLOWED.some((host) => url.includes(host))) continue
      offenders.push(`${relative(root, path)} -> ${url}`)
    }
  }
}

for (const dir of SOURCE_DIRS) walk(join(root, dir))

if (offenders.length > 0) {
  console.error('发现外部资源引用，违反自托管要求（REQ-NFR-021）:')
  for (const offender of offenders) console.error(`  - ${offender}`)
  process.exit(1)
}

console.log('OK: 无第三方 CDN 依赖')
