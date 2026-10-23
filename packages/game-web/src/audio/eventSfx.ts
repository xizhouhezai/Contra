import type { CoreEvent } from '@contra/game-core'
import { type SfxKey, WEAPON_SFX_KEYS } from './manifest'

/**
 * Which sound an event produces (T4).
 *
 * A pure function rather than a switch buried in the scene: the scene should
 * only have to answer "play this", not "which of ten events was that and which
 * weapon fired it".
 *
 * Two events are deliberately silent. enemyDied is silent because hit already
 * plays on the same frame, and two sounds a few milliseconds apart read as one
 * loud click rather than as two pieces of information. playerHealed is silent
 * because the rhythm refund is rare enough that the HUD change carries it and a
 * sound on a heart refund is noise in the middle of a fight.
 */
export function sfxForEvent(event: CoreEvent): SfxKey | null {
  switch (event.type) {
    case 'shot': {
      // Each of the ten weapons has its own report; an unknown id falls back to
      // the pulse so a new weapon is audible rather than silent.
      const weapon = String(event.weaponId)
      const known = WEAPON_SFX_KEYS.find((key) => key === weapon)
      return known ?? 'pulse'
    }
    case 'hit':
      return 'hit'
    case 'enemyDied':
      return null
    case 'playerHurt':
      return 'hurt'
    case 'playerHealed':
      return null
    case 'playerDied':
      return 'die'
    case 'weaponPicked':
      return 'pickup'
    case 'explosion':
      return 'explosion'
    case 'enemyTelegraph':
      return 'enemyTelegraph'
    case 'enemyShot':
      return 'enemyShot'
    case 'bossTelegraph':
      // The warning needs to be audible: a player looking at their own aim will
      // not see a wind-up that only draws on screen.
      return 'bossTelegraph'
    case 'bossAttack':
      return 'bossAttack'
    case 'bossPhaseChanged':
      return 'bossPhase'
    case 'stageCleared':
      return 'clear'
    default: {
      // Exhaustiveness: a new CoreEvent must be given a sound or be silenced
      // on purpose, never fall through by accident.
      const unreachable: never = event
      void unreachable
      return null
    }
  }
}

/** The sound a menu action makes. */
export const MENU_SFX: SfxKey = 'select'
