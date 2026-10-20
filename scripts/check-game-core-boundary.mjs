/**
 * Rule-layer boundary gate (docs/game/design/modules.md §依赖规则强制).
 *
 * Biome already forbids the imports; this covers the two things a linter cannot
 * see: the package manifest's dependency block, and imports from packages that
 * happen to resolve without a declared dependency.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const coreDir = join(root, 'packages', 'game-core')
const failures = []

const manifest = JSON.parse(readFileSync(join(coreDir, 'package.json'), 'utf8'))
for (const field of ['dependencies', 'optionalDependencies']) {
  const deps = manifest[field]
  if (deps && Object.keys(deps).length > 0) failures.push(`${field} 非空: ${Object.keys(deps)}`)
}

/** Every forbidden target the rule layer must never import (ADR-0003). */
const FORBIDDEN = [
  { group: /^phaser(\/|$)/, label: 'Phaser' },
  { group: /^@contra\/game-(web|platform)$/, label: '表现层/适配层包' },
]

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!path.endsWith('.ts')) continue
    check(path)
  }
}

function check(path) {
  const source = readFileSync(path, 'utf8')
  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[1]
    if (specifier === undefined || specifier.startsWith('.')) continue
    const hit = FORBIDDEN.find((rule) => rule.group.test(specifier))
    if (hit === undefined) continue
    failures.push(`${relative(root, path)} 越界导入 ${hit.label}: ${specifier}`)
  }
}

walk(join(coreDir, 'src'))

if (failures.length > 0) {
  console.error('game-core 依赖边界检查失败:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('game-core 依赖边界检查通过：零依赖，无 Phaser / 表现层 / 适配层导入')
