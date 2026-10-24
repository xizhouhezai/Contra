#!/usr/bin/env node
/**
 * Checks every requirement for evidence in the source.
 *
 * The requirement index is the contract. Three separate defects in this project
 * were "implemented and never wired", which is exactly the gap a spec-versus-code
 * audit is meant to close: a requirement can be ticked off in a design review and
 * still not exist at runtime.
 *
 * Each check names the symbols that would have to exist for the requirement to be
 * real, and looks for them. It is a coarse instrument - a symbol can exist and do
 * nothing, as systems/Echoes.ts proved - but it catches "there is no code for this
 * at all", which is the cheapest and most common failure.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const source = [
  ...walk(join(root, 'packages/game-core/src')),
  ...walk(join(root, 'packages/game-web/src')),
  ...walk(join(root, 'packages/game-platform/src')),
]
const corpus = source.map((file) => readFileSync(file, 'utf8')).join('\n')

/** Symbols that would have to exist for each requirement to be real. */
const EVIDENCE = {
  'REQ-VIS-001': ['ACT_III_STAGES'],
  'REQ-VIS-002': ['restartStage', 'retryStage', 'scene.restart'],
  'REQ-VIS-003': ['KEYBOARD_ACTIONS', 'hintText'],
  'REQ-VIS-004': ['bgmForStage', 'hasStageScene', 'stagesWithScenes'],
  'REQ-PLY-001': ['updateMovement', 'MOVE_SPEED'],
  'REQ-PLY-002': ['aimDirection', 'moveY'],
  'REQ-PLY-003': ['WEAPON_SLOT_COUNT', 'weaponSlots', 'equipWeapon'],
  'REQ-PLY-004': ['INITIAL_WEAPON'],
  'REQ-PLY-005': ['PassiveState', 'createPassiveState', 'registerRhythmKill'],
  'REQ-PLY-006': ['PLAYER_HEARTS', 'playerHealed', 'hearts'],
  'REQ-PLY-007': ['createPlayer', 'spawn'],
  'REQ-PLY-008': ['BossRuntimeState', 'hpFraction', 'bossPhaseChanged'],
  'REQ-PLY-009': ['score', 'combo', 'currentScore'],
  'REQ-PLY-010': ['COOP', 'coopEnabled', 'playerSlotCount'],
  'REQ-CHR-001': ['CHARACTER_IDS', 'characterDefinition'],
  'REQ-CHR-002': ['initialWeapon', 'spread'],
  'REQ-CHR-003': ['initialWeapon', 'rifle'],
  'REQ-CHR-004': ['initialWeapon', 'homing'],
  'REQ-CHR-005': ['initialWeapon', 'pulse'],
  'REQ-CHR-006': ['passive', 'bomb'],
  'REQ-CHR-007': ['claude-auditor', 'claude-rewriter'],
  'REQ-CHR-008': ['gpt-corpus', 'gpt-emergent'],
  'REQ-CHR-009': ['portrait', 'characterSprite'],
  'REQ-CHR-010': ['replay', 'long-context', 'kimi'],
  'REQ-CHR-011': ['prism', 'multimodal', 'gemini'],
  'REQ-STG-001': ['ACT_III_STAGES', 'CAMPAIGN_STAGES'],
  'REQ-STG-002': ['bgmForStage', 'hasStageScene'],
  'REQ-STG-003': ['bossId'],
  'REQ-STG-004': ['stage-01'],
  'REQ-STG-005': ['mechanics'],
  'REQ-STG-006': ['scrollMode', 'vertical'],
  'REQ-STG-007': ['gptPhaseFor', 'ECHO_COUNT'],
  'REQ-STG-008': ['campaign.ts', 'stageTypes'],
  'REQ-GDD-001': ['characterSprite', 'enemyFrameKey'],
  'REQ-GDD-002': ['BGM_KEYS', 'SFX_KEYS'],
  'REQ-GDD-003': ['ENEMY_IDS'],
  'REQ-GDD-004': ['命中率', 'ResultScene'],
  'REQ-GDD-005': ['SettingsScene', 'setMuted'],
  'REQ-GDD-006': ['main.ts', 'scale'],
  'REQ-CMB-001': ['stepEnemyAttacks', 'enemyShot'],
  'REQ-CMB-002': ['telegraphSeconds', 'bossTelegraph', 'enemyTelegraph'],
  'REQ-CMB-003': ['damageBossBy', 'bulletHitsBoss'],
  'REQ-CMB-004': ['maxConcurrentShooters'],
  'REQ-ART-004': ['effectKey', 'muzzleForWeapon', 'preloadEffects'],
  'REQ-NFR-004': ['game-core', 'vitest'],
  'REQ-NFR-005': ['KeyboardInputSource', 'TouchInputSource'],
  'REQ-NFR-006': ['LocalStorageAdapter'],
  'REQ-VAR-001': ['looksFor', 'cycleLook'],
  'REQ-VAR-002': ['loadLookChoices', 'saveLookChoice'],
  'REQ-VAR-003': ['addLookImage', 'resolveLook'],
  'REQ-MOT-001': ['stateFor', 'hurt'],
  'REQ-MOT-002': ['syncAnimation', 'motionFor'],
  'REQ-GUN-001': ['WEAPON_SFX_KEYS', 'weaponId'],
  'REQ-GUN-002': ['aimVector', 'freeAim'],
}

const missing = []
const present = []
for (const [req, symbols] of Object.entries(EVIDENCE)) {
  const hits = symbols.filter((s) =>
    new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\./g, '\\.')}\\b`).test(
      corpus,
    ),
  )
  if (hits.length === 0) missing.push({ req, symbols })
  else present.push({ req, hits })
}

console.log(`需求条目: ${Object.keys(EVIDENCE).length}`)
console.log(`有代码证据: ${present.length}`)
console.log(`完全找不到: ${missing.length}`)
for (const m of missing) {
  console.log(`  ✗ ${m.req}  找过: ${m.symbols.join(', ')}`)
}
