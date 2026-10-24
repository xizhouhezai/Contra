#!/usr/bin/env node
/**
 * Walks the traceability chain REQ -> task -> test and reports where it breaks.
 *
 * docs/game/tasks/backlog.md records, for every T-M task, which requirement it
 * traces to. Test files name the task in their describe block. The chain is
 * therefore complete on paper, but nothing checked that the middle or the end
 * existed - so "REQ-PLY-001 is tested" was an assumption, not a claim anyone had
 * verified.
 *
 * This reads all three and reports, per requirement, how far the chain reaches.
 * The distinction that matters is:
 *
 *   tested    a file names a task that traces to this requirement
 *   task-only a task traces to it but no test names that task
 *   orphan    no task traces to it at all
 *
 * A requirement can also be covered by a test that names it directly, which
 * counts as the strongest form and is reported separately.
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

// Every package's tests, not just the two largest. The platform package holds
// the input ports, and skipping it made REQ-NFR-005 look untested while
// touchInput.test.ts had covered it all along.
const testFiles = []
for (const pkg of readdirSync(join(root, 'packages'))) {
  const dir = join(root, 'packages', pkg, 'test')
  try {
    testFiles.push(...testsUnder(dir))
  } catch {
    // A package with no test directory simply contributes nothing.
  }
}

// Test file text, keyed by a short name for the report.
const tests = new Map()
for (const file of testFiles) {
  tests.set(file.replace(root, '').replace(/\\/g, '/'), readFileSync(file, 'utf8'))
}

// Task -> requirement, from the backlog's 追溯 field.
const backlog = readFileSync(join(root, 'docs/game/tasks/backlog.md'), 'utf8')
const taskToReq = new Map()
const taskBlocks = backlog.split(/^### /m).slice(1)
for (const block of taskBlocks) {
  const id = (block.match(/^(T-M[0-9]-[0-9]{2})/) ?? [])[1]
  if (id === undefined) continue
  const req = (block.match(/追溯\*{0,2}[：:]\s*(REQ-[A-Z]+-[0-9]{3})/) ?? [])[1]
  if (req !== undefined) taskToReq.set(id, req)
}

// Which tests name which task.
const taskTests = new Map()
const reqTests = new Map()
for (const [file, text] of tests) {
  for (const task of new Set(text.match(/T-M[0-9]-[0-9]{2}/g) ?? [])) {
    const list = taskTests.get(task) ?? []
    list.push(file)
    taskTests.set(task, list)
  }
  for (const req of new Set(text.match(/REQ-[A-Z]+-[0-9]{3}/g) ?? [])) {
    const list = reqTests.get(req) ?? []
    list.push(file)
    reqTests.set(req, list)
  }
}

/**
 * Requirements that cannot be covered by a unit test, and why.
 *
 * Keeping them in a list rather than leaving them as unexplained gaps means the
 * report can end at a number instead of "and some others". Each has a real
 * verification route, just not one that runs in this suite.
 */
const NOT_UNIT_TESTABLE = {
  'REQ-GDD-001': '美术方向（立绘 + 序列帧）是视觉判断，靠人工评审而非断言',
  'REQ-NFR-002': '首屏加载依赖真实网络往返，见 nfr-checklist 的未验证项',
}

const index = readFileSync(join(root, 'docs/game/requirements/index.md'), 'utf8')
const required = [...new Set(index.match(/REQ-[A-Z]+-[0-9]{3}/g) ?? [])].sort()

const direct = []
const viaTask = []
const taskOnly = []
const orphan = []

for (const req of required) {
  if (reqTests.has(req)) {
    direct.push(req)
    continue
  }
  const tasks = [...taskToReq.entries()].filter(([, r]) => r === req).map(([t]) => t)
  if (tasks.length === 0) {
    orphan.push(req)
    continue
  }
  const tested = tasks.filter((task) => taskTests.has(task))
  if (tested.length > 0) viaTask.push({ req, tasks: tested })
  else taskOnly.push({ req, tasks })
}

console.log(`需求总数: ${required.length}`)
console.log(`  直接测试（测试文件写了需求号）: ${direct.length}`)
console.log(`  经任务追溯测试:                ${viaTask.length}`)
console.log(`  有任务但无测试:                ${taskOnly.length}`)
console.log(`  无任务也无测试:                ${orphan.length}`)
console.log(``)
console.log(`已覆盖合计: ${direct.length + viaTask.length} / ${required.length}`)

const excluded = Object.keys(NOT_UNIT_TESTABLE).filter((req) => required.includes(req))
if (excluded.length > 0) {
  console.log('')
  console.log(`无法单测（已记录原因）: ${excluded.length}`)
  for (const req of excluded) console.log(`  ${req}  ${NOT_UNIT_TESTABLE[req]}`)
}

if (process.argv.includes('--verbose')) {
  if (taskOnly.length > 0) {
    console.log('')
    console.log('有任务但无测试:')
    for (const row of taskOnly) console.log(`  ${row.req}  (任务 ${row.tasks.join(', ')})`)
  }
  if (orphan.length > 0) {
    console.log('')
    console.log('无任务也无测试:')
    for (const req of orphan) console.log(`  ${req}`)
  }
}
