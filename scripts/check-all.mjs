#!/usr/bin/env node
/**
 * One-shot quality gate for milestones M0 and M1
 * (docs/guide/conventions.md §代码规范: pnpm verify is the commit gate).
 *
 * `pnpm verify` runs the five package-level checks. This adds the gates a
 * package manager cannot express — the rule layer must declare no dependencies,
 * and no rendering library may appear below the presentation layer — and prints
 * every stage as one pass/fail table so a failure is visible without scrolling.
 *
 * Every tool is launched as `node <js entry point>` rather than through its
 * shim. The .bin shims on Windows are .cmd wrappers that re-spawn node, which
 * breaks whenever the invoking shell does not have node on PATH; going straight
 * to the entry point removes that failure mode and keeps the gate usable from
 * any shell.
 *
 * Usage:
 *   pnpm check           run every gate
 *   pnpm check --quiet   only print the summary table
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, delimiter as pathDelimiter, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const quiet = process.argv.includes('--quiet')

/** Workspace packages, in dependency order. */
const WORKSPACE_PACKAGES = ['core', 'cli', 'game-core', 'game-platform', 'game-web']

/** Directory holding the running node executable. */
function nodeDir() {
  return process.execPath.slice(0, process.execPath.lastIndexOf(sep))
}

/**
 * Environment for child processes.
 *
 * Most gates run fine under an inherited environment, but the ones that shell
 * out - VitePress spawns esbuild, tsc resolves its own binaries - still need the
 * node directory and the local .bin on PATH. Passing it explicitly keeps the
 * gate working from a shell that has neither, which is the whole point of
 * launching tools by absolute entry point above.
 */
function childEnv() {
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH'
  const parts = (process.env[pathKey] ?? '').split(pathDelimiter).filter(Boolean)
  for (const dir of [join(root, 'node_modules', '.bin'), nodeDir()].reverse()) {
    if (!parts.includes(dir)) parts.unshift(dir)
  }
  return { ...process.env, [pathKey]: parts.join(pathDelimiter) }
}

/** Locates a tool's script entry point, following the pnpm virtual store. */
function toolEntry(name) {
  const candidates = [join(root, 'node_modules', name)]
  try {
    const store = join(root, 'node_modules', '.pnpm')
    for (const entry of readdirSync(store)) {
      if (!entry.startsWith(`${name}@`)) continue
      candidates.push(join(store, entry, 'node_modules', name))
    }
  } catch {
    // No virtual store: a plain node_modules layout, the first candidate applies.
  }

  for (const base of candidates) {
    for (const file of ['vitest.mjs', 'bin/vitepress.js', 'index.mjs', 'bin/tsc']) {
      try {
        const path = join(base, file)
        readFileSync(path)
        return path
      } catch {
        // Try the next shape.
      }
    }
  }
  throw new Error(`找不到 ${name} 的入口`)
}

/**
 * Path to the Biome executable.
 *
 * Biome ships a shell wrapper plus a per-platform binary. The wrapper execs the
 * binary, so launching it through node would hand a shell script to the JS
 * parser; resolve the binary beside it instead.
 */
function biomeBinary() {
  const store = join(root, 'node_modules', '.pnpm')
  const candidates = []
  try {
    for (const entry of readdirSync(store)) {
      if (!entry.startsWith('@biomejs+biome@') && !entry.startsWith('@biomejs/biome@')) continue
      const base = join(store, entry, 'node_modules', '@biomejs', 'biome')
      candidates.push(join(base, 'bin', 'biome'), join(base, 'biome'))
    }
  } catch {
    // No virtual store; fall through to the direct layout.
  }
  // The native binary ships in a platform package, not in the wrapper package.
  const platformPkg = {
    win32: 'cli-win32-x64',
    darwin: process.arch === 'arm64' ? 'cli-darwin-arm64' : 'cli-darwin-x64',
    linux: process.arch === 'arm64' ? 'cli-linux-arm64' : 'cli-linux-x64',
  }[process.platform]

  if (platformPkg !== undefined) {
    const exe = process.platform === 'win32' ? 'biome.exe' : 'biome'
    candidates.push(join(root, 'node_modules', '@biomejs', platformPkg, exe))
    try {
      const prefix = `@biomejs+${platformPkg}@`

      for (const entry of readdirSync(store)) {
        if (entry.startsWith(prefix)) {
          candidates.push(join(store, entry, 'node_modules', '@biomejs', platformPkg, exe))
        }
      }
    } catch {
      // Already covered by the direct layout above.
    }
  }

  for (const candidate of candidates) {
    try {
      const head = readFileSync(candidate)
      // The wrapper starts with a shebang; the binary does not.
      if (head.slice(0, 2).toString() === '#!') continue
      return candidate
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error('找不到 biome 可执行文件')
}

/**
 * The gates, in the order a failure is cheapest to fix.
 *
 * Each `run` returns the argument vector for one child process, so the caller
 * can report a duration and a status instead of streaming raw build output.
 */
const GATES = [
  {
    label: '规则层边界',
    detail: 'game-core 零依赖 + 无 phaser / 表现层导入',
    run: () => [join(root, 'scripts', 'check-game-core-boundary.mjs')],
  },
  {
    label: '静态检查',
    detail: 'Biome lint + format',
    native: biomeBinary,
    args: ['check', '.'],
  },
  {
    label: '类型检查',
    detail: '全工作区 tsc -b',
    run: () => [toolEntry('typescript'), '-b', 'tsconfig.json'],
  },
  {
    // The root tsconfig only references core, cli and game-core. game-web was
    // never in that list, so every "used but not imported" defect in the web
    // package - preloadEnemies, hudOrigin, bossArtKey, preloadBgm, ProjectileView
    // - passed a green build and failed in the browser instead. This gate closes
    // that hole; it had accumulated 37 errors by the time it was added.
    label: '界面类型',
    detail: 'game-web tsc --noEmit',
    run: () => [
      toolEntry('typescript'),
      '--noEmit',
      '-p',
      'packages/game-web/tsconfig.typecheck.json',
    ],
  },
  {
    // Not a bare `vitest run`: from the repository root that found one test file
    // and reported green on five tests. scripts/test-all.mjs runs each package
    // under its own config and aggregates the verdict.
    label: '单元测试',
    detail: '全部包的 vitest',
    run: () => ['scripts/test-all.mjs'],
  },
  {
    label: '构建',
    detail: '各包 tsc + 文档站 VitePress',
    run: () => [toolEntry('vitepress'), 'build', 'docs'],
  },
]

/**
 * Gates that inspect an artefact instead of running a command.
 * Each returns a list of failure strings.
 */
const INSPECTIONS = [
  {
    label: '自托管',
    detail: '无第三方 CDN 依赖（REQ-NFR-021 / 006）',
    run() {
      try {
        execFileSync(process.execPath, [join(root, 'scripts', 'check-selfhosted.mjs')], {
          cwd: root,
          stdio: 'pipe',
        })
        return []
      } catch (error) {
        const stdout = error instanceof Error ? String(error.stdout ?? '') : ''
        return [stdout.trim().split('\n')[0] || '存在外部资源引用']
      }
    },
  },
  {
    label: '依赖方向',
    detail: 'game-core 不声明任何运行时依赖',
    run() {
      const manifest = JSON.parse(
        readFileSync(join(root, 'packages/game-core/package.json'), 'utf8'),
      )
      const deps = Object.keys(manifest.dependencies ?? {})
      return deps.length > 0 ? [`game-core 声明了依赖: ${deps.join(', ')}`] : []
    },
  },
  {
    label: '测试存在性',
    detail: '每个包至少有一个测试文件',
    run() {
      const failures = []
      for (const name of WORKSPACE_PACKAGES) {
        try {
          const dir = join(root, 'packages', name, 'test')
          const files = readdirSync(dir).filter((file) => file.endsWith('.test.ts'))
          if (files.length === 0) failures.push(`${name} 没有测试文件`)
        } catch {
          failures.push(`${name} 缺少 test/ 目录`)
        }
      }
      return failures
    },
  },
]

const results = []

for (const gate of GATES) {
  if (!quiet) process.stdout.write(`\n▶ ${gate.label} — ${gate.detail}\n`)
  const started = Date.now()
  let ok = true
  let detail
  try {
    // A native executable runs itself; a JS entry point runs under this node.
    const isNative = gate.native !== undefined
    const executable = isNative ? gate.native() : process.execPath
    const args = isNative ? gate.args : gate.run()
    execFileSync(executable, args, {
      cwd: root,
      env: childEnv(),
      stdio: quiet ? 'ignore' : 'inherit',
    })
  } catch (error) {
    ok = false
    detail = error instanceof Error ? error.message.split('\n')[0] : String(error)
  }
  results.push({ ...gate, ok, ms: Date.now() - started, failures: detail ? [detail] : [] })
}

for (const check of INSPECTIONS) {
  const failures = check.run()
  results.push({ ...check, ok: failures.length === 0, ms: 0, failures })
}

const failed = results.filter((r) => !r.ok)
const rule = '='.repeat(56)

process.stdout.write(`\n${rule}\n  质量门禁结果\n${rule}\n`)
for (const r of results) {
  const mark = r.ok ? '\u2713' : '\u2717'
  const time = r.ms > 0 ? ` (${(r.ms / 1000).toFixed(1)}s)` : ''
  process.stdout.write(`  ${mark} ${r.label.padEnd(12)} ${r.detail}${time}\n`)
  for (const failure of r.failures ?? []) {
    process.stdout.write(`      - ${failure}\n`)
  }
}
process.stdout.write(`${rule}\n`)

if (failed.length > 0) {
  process.stdout.write(`\n\u2717 ${failed.length} 项未通过\n`)
  process.exit(1)
}
process.stdout.write('\n\u2713 全部通过\n')
