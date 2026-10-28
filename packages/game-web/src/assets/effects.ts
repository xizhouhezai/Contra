import type Phaser from 'phaser'

/**
 * Combat effect art.
 *
 * Twenty-five sprites shipped for the combat feedback the design doc calls for -
 * muzzle flashes, impact marks, charge auras, ground warnings, and the eight boss
 * attacks - and not one of them was drawn. Every effect in the game was a
 * rectangle or a circle built at runtime, so a muzzle flash and a hit and a blast
 * were all the same shape in different colours.
 *
 * These are one-shot effects rather than actors: each is created, tweened and
 * destroyed, which is why they are addressed by name instead of being bound to an
 * entity id.
 */

export type EffectName =
  | 'muzzle-blue'
  | 'muzzle-orange'
  | 'muzzle-purple'
  | 'muzzle-white'
  | 'muzzle-hostile'
  | 'impact-small'
  | 'impact-med'
  | 'impact-big'
  | 'impact-pierce'
  | 'impact-laser'
  | 'aim-line'
  | 'charge-aura'
  | 'charge-spark'
  | 'ground-warn'

export type BossEffectName =
  | 'boss-beam'
  | 'boss-burst'
  | 'boss-chain'
  | 'boss-lance'
  | 'boss-scythe'
  | 'boss-swarm'
  | 'boss-sweep'
  | 'boss-vines'

/** Texture key for one enemy attack effect. */
export function effectKey(name: EffectName): string {
  return `effect-${name}`
}

/** Texture key for one boss attack effect. */
export function bossEffectKey(name: BossEffectName): string {
  return `boss-effect-${name}`
}

/**
 * Which muzzle flash belongs to which weapon.
 *
 * Colour carries the faction and the element, not the individual gun: blue for
 * energy, orange for kinetic, purple for the arcane, white for the piercing and
 * beam weapons. Ten guns do not need ten flashes, but a player does need to see
 * at a glance that the flash near them is enemy fire.
 */
const MUZZLE_BY_WEAPON: Readonly<Record<string, EffectName>> = {
  pulse: 'muzzle-blue',
  rifle: 'muzzle-blue',
  laser: 'muzzle-white',
  pierce: 'muzzle-white',
  scatter: 'muzzle-orange',
  cluster: 'muzzle-orange',
  grenade: 'muzzle-orange',
  homing: 'muzzle-purple',
  replay: 'muzzle-purple',
  prism: 'muzzle-purple',
}

/**
 * Enemy flashes use a colour no player weapon uses.
 *
 * This was muzzle-orange, which three of the ten player weapons also use - so the
 * comment promising that enemy fire "never reads as the player's own" was describing
 * something the code did not do. A hostile flash is now its own texture.
 */
const ENEMY_MUZZLE: EffectName = 'muzzle-hostile'

export function muzzleForWeapon(weaponId: string, owner: string): EffectName {
  if (owner === 'enemy') return ENEMY_MUZZLE
  return MUZZLE_BY_WEAPON[weaponId] ?? 'muzzle-white'
}

/**
 * Which boss effect belongs to which boss move.
 *
 * Keyed by move id rather than by boss, because a boss's phases mix several
 * moves and the effect has to match the move that is actually landing.
 */
const BOSS_EFFECT_BY_MOVE: Readonly<Record<string, BossEffectName>> = {
  'audit-beam': 'boss-beam',
  'clause-chain': 'boss-chain',
  'rewrite-sweep': 'boss-sweep',
  'redline-lance': 'boss-lance',
  'corpus-swarm': 'boss-swarm',
  'harvest-vines': 'boss-vines',
  'emergence-burst': 'boss-burst',
  'reaper-scythe': 'boss-scythe',
  // The GPT fight's own moves were missing from this table, which meant the final
  // boss of the game telegraphed nothing: every attack arrived with no visual
  // warning at all. Each is mapped to the shape closest to what it does rather
  // than all to one default, so a player can tell a wave from a spread.
  'data-flood': 'boss-swarm',
  'compress-wave': 'boss-sweep',
  'sample-draw': 'boss-chain',
  'emergent-proliferation': 'boss-burst',
  overfit: 'boss-vines',
  collapse: 'boss-beam',
  'final-check': 'boss-lance',
  'rule-rewrite': 'boss-sweep',
  'text-storm': 'boss-swarm',

  // Act I's mid-stage fights (REQ-STG-009). Every one of these moves warns before
  // it lands, and a warning with no picture is the "invisible damage source" the
  // design principles forbid outright - the test below caught these four fights
  // shipping with no visual at all.
  //
  // Mapped to the shape closest to what each does rather than to one default, the
  // same rule the GPT moves follow: a swing reads as a sweep, a stamp as a lance
  // coming down, a scan as a beam, a valve burst as an area burst.
  'crane-swing': 'boss-sweep',
  'hook-drag': 'boss-chain',
  'valve-burst': 'boss-burst',
  'pipe-sweep': 'boss-sweep',
  'hook-drop': 'boss-lance',
  'jib-swing': 'boss-sweep',
  'clause-stamp': 'boss-lance',
  'ledger-scan': 'boss-beam',
}

export function bossEffectForMove(moveId: string): BossEffectName | null {
  return BOSS_EFFECT_BY_MOVE[moveId] ?? null
}

const effectModules = import.meta.glob('../../../../docs/game/requirements/assets/effects/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const bossModules = import.meta.glob(
  '../../../../docs/game/requirements/assets/boss-effects/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const urls = new Map<string, string>()

function collect(modules: Record<string, string>, prefix: string, pattern: RegExp): void {
  for (const [path, url] of Object.entries(modules)) {
    const match = pattern.exec(path)
    const name = match?.[1]
    if (name !== undefined) urls.set(`${prefix}${name}`, url)
  }
}

collect(effectModules, 'effect-', /effects\/([a-z-]+)\.webp$/)
collect(bossModules, 'boss-effect-', /boss-effects\/([a-z-]+)\.webp$/)

/** True when the effect has art. */
export function hasEffect(key: string): boolean {
  return urls.has(key)
}

/** Every effect key that has art, for the asset audit. */
export function effectKeys(): string[] {
  return [...urls.keys()].sort()
}

/** Queues every combat effect. 25 sprites, well under 300KB in total. */
export function preloadEffects(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, url] of urls) load.image(key, url)
}

/**
 * Act I's gameplay UI art.
 *
 * Source of truth: docs/game/design/stage-art-prompts-batch1.md §7. The intent
 * batch holds three pieces - a wave warning band, a route map and a room-type icon
 * set - and they live in their own folder because they are interface rather than
 * combat effects: nothing about them belongs to a hit or an explosion, and the
 * route map is drawn once per stage rather than per frame.
 */
const uiModules = import.meta.glob('../../../../docs/game/requirements/assets/ui/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const uiUrls = new Map<string, string>()
collect(uiModules, 'ui-', /ui\/(ui-[a-z-]+)\.webp$/)

/** Texture key for the wave warning band. */
export function waveWarningKey(): string {
  return 'ui-ui-wave-warning'
}

/** True when the warning band shipped. */
export function hasWaveWarning(): boolean {
  return uiUrls.has(waveWarningKey())
}

/** Queues the gameplay UI pieces. Three files, about 40KB together. */
export function preloadUi(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, url] of uiUrls) load.image(key, url)
}
