#!/usr/bin/env node
/**
 * Maps each requirement to the tests that exercise it.
 *
 * The audit script answers "is there code for this", which systems/Echoes.ts
 * passed while doing nothing. This answers the next question: is there a test
 * that would fail if the behaviour broke. A requirement with code and no test is
 * unchecked; a requirement with a test that only asserts a symbol exists is
 * barely better.
 *
 * A test counts when the requirement id appears in the test file - the convention
 * is a comment at the top of the describe block naming what it covers.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

function testsUnder(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...testsUnder(full))
    else if (entry.name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const testFiles = [
  ...testsUnder(join(root, 'packages/game-core/test')),
  ...testsUnder(join(root, 'packages/game-web/test')),
]

/** Requirement id -> files that name it. */
const coverage = new Map()
for (const file of testFiles) {
  const text = readFileSync(file, 'utf8')
  const ids = text.match(/REQ-[A-Z]+-[0-9]{3}/g) ?? []
  for (const id of new Set(ids)) {
    const list = coverage.get(id) ?? []
    list.push(file.replace(`${root}\\`, '').replace(`${root}/`, ''))
    coverage.set(id, list)
  }
}

// The index is the contract; read the ids out of it rather than a hardcoded list.
const index = readFileSync(join(root, 'docs/game/requirements/index.md'), 'utf8')
const required = [...new Set(index.match(/REQ-[A-Z]+-[0-9]{3}/g) ?? [])].sort()

const covered = required.filter((id) => coverage.has(id))
const missing = required.filter((id) => !coverage.has(id))

console.log(`需求总数: ${required.length}`)
console.log(`有行为测试: ${covered.length}`)
console.log(`只有符号无测试: ${missing.length}`)
console.log('')
if (missing.length > 0) {
  console.log('缺少行为测试的需求:')
  for (const id of missing) console.log(`  ${id}`)
}
if (process.argv.includes('--verbose')) {
  console.log('')
  for (const id of covered) console.log(`  ${id}: ${coverage.get(id).length} 个文件`)
}
