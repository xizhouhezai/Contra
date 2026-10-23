#!/usr/bin/env node
/**
 * Runs every package's tests and reports one verdict.
 *
 * This exists because the quality gate used to run a bare `vitest run` from the
 * repository root, where there is no config. Vitest found exactly one test file -
 * game-core's stageRunner - and the gate reported a green workspace on five
 * tests while the other 453 were never executed. A green gate that runs 1% of
 * the suite is worse than no gate, because it is trusted.
 *
 * Each package keeps its own vitest.config.ts: game-web and cli alias workspace
 * packages to source so a test never needs a prior build. A root project config
 * would have to re-declare those aliases, and pnpm does not hoist vitest to the
 * root, so that config cannot even resolve its own import. Spawning per package
 * keeps each package's settings authoritative.
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

/** Finds each package that declares its own vitest config. */
function testablePackages() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(packagesDir, name, 'vitest.config.ts')))
    .sort()
}

function vitestEntry(name) {
  // Resolved through the suite one package actually depends on.
  const candidates = [
    join(packagesDir, name, 'node_modules', 'vitest', 'vitest.mjs'),
    join(root, 'node_modules', 'vitest', 'vitest.mjs'),
  ]
  const found = candidates.find((path) => existsSync(path))
  if (found === undefined) throw new Error(`vitest not installed for ${name}`)
  return found
}

function runOne(name) {
  return new Promise((resolveRun) => {
    const dir = join(packagesDir, name)
    // A resolved entry path keeps vitest from reading it as a filename filter.
    const child = spawn(process.execPath, [vitestEntry(name), 'run', '--reporter=basic'], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
    })

    let out = ''
    child.stdout.on('data', (chunk) => {
      out += chunk
    })
    child.stderr.on('data', (chunk) => {
      out += chunk
    })
    child.on('close', (code) => {
      const counts = /Tests\s+(\d+) passed/.exec(out)
      const failed = /Tests\s+.*?(\d+) failed/.exec(out)
      const files = /Test Files\s+(\d+) passed/.exec(out)
      resolveRun({
        name,
        code,
        passed: counts ? Number(counts[1]) : 0,
        failed: failed ? Number(failed[1]) : 0,
        files: files ? Number(files[1]) : 0,
        tail: out.trim().split('\n').slice(-4).join('\n'),
      })
    })
  })
}

const names = testablePackages()
const results = []
for (const name of names) results.push(await runOne(name))

const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
const bad = results.filter((r) => r.code !== 0)

for (const r of results) {
  const mark = r.code === 0 ? 'ok  ' : 'FAIL'
  console.log(`${mark} ${r.name.padEnd(15)} files=${r.files} passed=${r.passed} failed=${r.failed}`)
  if (r.code !== 0) console.log(r.tail)
}

console.log(
  `\n总计 ${results.length} 个包 · ${totalPassed} 通过` +
    (totalFailed > 0 ? ` · ${totalFailed} 失败` : ''),
)

if (bad.length > 0) process.exit(1)
