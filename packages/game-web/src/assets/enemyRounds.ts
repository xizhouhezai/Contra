import type Phaser from 'phaser'

/**
 * Enemy projectile art.
 *
 * Seven rounds ship for the enemy side - pulse, pellet, homing, lobbed, mirror,
 * spike and heavy - and until now not one of them was drawn, because no enemy
 * could fire. The player's rounds are a separate set by design: when both are in
 * the air, the decision the player makes is which ones to walk into, and that
 * decision needs two visibly different sets.
 */

const KEY_BY_WEAPON: Readonly<Record<string, string>> = {
  'pulse-gun': 'pulse',
  pellet: 'pellet',
  'launcher-pod': 'homing',
  lobbed: 'lobbed',
  caster: 'mirror',
  'scatter-cannon': 'pellet',
  'ground-spike': 'spike',
  'elite-charge': 'heavy',
  charge: 'heavy',
  shield: 'heavy',
}

/** Texture key for one enemy round, or null when the weapon has no art. */
export function enemyRoundKey(weaponId: string): string | null {
  const name = KEY_BY_WEAPON[weaponId]
  return name === undefined ? null : `enemy-round-${name}`
}

const modules = import.meta.glob(
  '../../../../docs/game/requirements/assets/projectiles/enemy-*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const urls = new Map<string, string>()
const NAME = /enemy-([a-z]+)\.webp$/

for (const [path, url] of Object.entries(modules)) {
  const match = NAME.exec(path)
  const name = match?.[1]
  if (name !== undefined) urls.set(`enemy-round-${name}`, url)
}

/** True when this weapon's round has art. */
export function hasEnemyRound(weaponId: string): boolean {
  const key = enemyRoundKey(weaponId)
  return key !== null && urls.has(key)
}

/** Queues every enemy round. */
export function preloadEnemyRounds(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, url] of urls) load.image(key, url)
}
