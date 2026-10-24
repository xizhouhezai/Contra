#!/usr/bin/env node
/**
 * Reports exports that nothing imports.
 *
 * Twice now a complete, well-tested module sat in the tree with no caller:
 * systems/Echoes.ts modelled the whole GPT interlude and the boss never split,
 * and the stage mechanics were a finished rule-layer module the game never
 * wired. Both had passing unit tests, because a test imports the module directly -
 * it does not need the game to.
 *
 * A unit test suite cannot catch this by construction: it is the thing doing the
 * importing. So the check is static and blunt - read what the package exports,
 * then look for those names anywhere else.
 *
 * Not every unused export is a bug. A package publishes an API, and some of it is
 * for callers outside this repository. The report is therefore a list to review,
 * not a failing gate.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pkg = process.argv[2] ?? 'game-core'
const pkgDir = join(root, 'packages', pkg)

/** Every .ts file under a directory, excluding build output. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

/** Names re-exported from the package entry point. */
function exportedNames(entryPath) {
  const source = readFileSync(entryPath, 'utf8')
  const names = new Set()

  // export { a, b as c } from './x.js'
  // export const a = ..., export function a(), export class A
  const blocks = source.matchAll(/export\s*\{([^}]+)\}\s*(?:from\s*['"][^'"]+['"])?/g)
  for (const block of blocks) {
    for (const part of (block[1] ?? '').split(',')) {
      const trimmed = part.trim()
      if (trimmed === '') continue
      const asMatch = /\bas\s+([A-Za-z0-9_$]+)$/.exec(trimmed)
      const name = asMatch ? asMatch[1] : trimmed
      if (name !== undefined && /^[A-Za-z0-9_$]+$/.test(name)) names.add(name)
    }
  }

  const decls = source.matchAll(
    /export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g,
  )
  for (const decl of decls) if (decl[1] !== undefined) names.add(decl[1])

  return names
}

const entry = join(pkgDir, 'src', 'index.ts')
const exported = exportedNames(entry)

// Every source file in the repo, so a caller in the web package counts too.
const corpus = []
for (const dir of ['packages']) {
  const base = join(root, dir)
  for (const entryName of readdirSync(base)) {
    const full = join(base, entryName)
    if (!statSync(full).isDirectory()) continue
    if (entryName === 'node_modules') continue
    corpus.push(...walk(full))
  }
}

const unused = []
for (const name of exported) {
  let uses = 0
  for (const file of corpus) {
    if (file === entry) continue
    const text = readFileSync(file, 'utf8')
    // A word-boundary match; the name may appear in a comment, which is why the
    // report is advisory rather than a gate.
    const re = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`)
    if (re.test(text)) uses += 1
  }
  if (uses === 0) unused.push(name)
}

console.log(`${pkg}: ${exported.size} exports`)
if (unused.length === 0) {
  console.log('  每个导出都有引用')
} else {
  console.log(`  ${unused.length} 个导出没有任何引用:`)
  for (const name of unused.sort()) console.log(`    ${name}`)
}
