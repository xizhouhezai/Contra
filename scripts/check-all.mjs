#!/usr/bin/env node
/**
 * One-shot quality gate for milestones M0 and M1
 * (docs/guide/conventions.md §代码规范: pnpm verify 是唯一的提交门槛).
 *
 * `pnpm verify` runs the five pnpm-level checks. This script adds the gates a
 * package manager cannot express - the rule-layer boundary, and a guard that no
 * rendering library leaks into the layer below it - and reports every stage as a
 * single pass/fail table so a failure is obvious without scrolling logs.
 *
 * Usage:
 *   pnpm check           run every gate
 *   pnpm check --quiet   only print the summary table
 */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const quiet = process.argv.includes('--quiet')

/** Each gate: label, command, and whether a non-zero exit is fatal. */
const GATES = [
  {
    label: '规则层边界',
    detail: 'game-core 零依赖 + 无 phaser / 表现层导入',
    cmd: 'pnpm run boundary',
  },
  {
    label: '静态检查',
    detail: 'Biome lint + format',
    cmd: 'pnpm run lint',
  },
  {
    label: '类型检查',
    detail: '全工作区 tsc',
    cmd: 'pnpm run typecheck',
  },
  {
    label: '单元测试',
    detail: '全部包的 vitest',
    cmd: 'pnpm run test',
  },
  {
    label: '构建',
    detail: '各包 tsc + 文档站 VitePress',
    cmd: 'pnpm run build',
  },
]

/**
 * Gates that need a look at the artefact rather than an exit code.
 * Each returns a list of failure strings.
 */
const INSPECTIONS = [
  {
    label: '依赖方向',
    detail: 'game-platform / game-web 不得被 game-core 引用',
    run() {
      const manifest = JSON.parse(
        readFileSync(join(root, 'packages/game-core/package.json'), 'utf8'),
      )
      const deps = Object.keys(manifest.dependencies ?? {})
      if (deps.length > 0) return [`game-core 声明了依赖: ${deps.join(', ')}`]
      return []
    },
  },
  {
    label: '测试存在性',
    detail: '每个包至少有一个测试文件',
    run() {
      const failures = []
      const packages = ['core', 'cli', 'game-core', 'game-platform', 'game-web']
      for (const name of packages) {
        try {
          const dir = join(root, 'packages', name, 'test')
          const files = readdirSafe(dir).filter((f) => f.endsWith('.test.ts'))
          if (files.length === 0) failures.push(`${name} 没有测试文件`)
        } catch {
          failures.push(`${name} 缺少 test/ 目录`)
        }
      }
      return failures
    },
  },
]

function readdirSafe(dir) {
  return readdirSync(dir)
}

const results = []

for (const gate of GATES) {
  if (!quiet) {
    process.stdout.write(`\n\u25b6 ${gate.label} — ${gate.detail}\n`)
  }
  const started = Date.now()
  let ok = true
  try {
    execSync(gate.cmd, {
      cwd: root,
      stdio: quiet ? 'ignore' : 'inherit',
      shell: true,
    })
  } catch {
    ok = false
  }
  results.push({ ...gate, ok, ms: Date.now() - started })
}

for (const check of INSPECTIONS) {
  const failures = check.run()
  results.push({
    label: check.label,
    detail: check.detail,
    ok: failures.length === 0,
    ms: 0,
    failures,
  })
}

const failed = results.filter((r) => !r.ok)

process.stdout.write(`\n${'='.repeat(56)}\n`)
process.stdout.write('  质量门禁结果\n')
process.stdout.write(`${'='.repeat(56)}\n`)
for (const r of results) {
  const mark = r.ok ? '\u2713' : '\u2717'
  const time = r.ms > 0 ? ` (${(r.ms / 1000).toFixed(1)}s)` : ''
  process.stdout.write(`  ${mark} ${r.label.padEnd(12)} ${r.detail}${time}\n`)
  for (const f of r.failures ?? []) process.stdout.write(`      - ${f}\n`)
}
process.stdout.write(`${'='.repeat(56)}\n`)

if (failed.length > 0) {
  process.stdout.write(`\n\u2717 ${failed.length} 项未通过\n`)
  process.exit(1)
}
process.stdout.write('\n\u2713 全部通过\n')
