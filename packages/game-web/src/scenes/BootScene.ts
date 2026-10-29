import { CHARACTER_IDS } from '@contra/game-core'
import Phaser from 'phaser'
import { ANIMATION_CLIPS, FRAME_SIZE, sheetKey } from '../assets/animated'
import { sheetUrl } from '../assets/animatedSheets'
import { preloadEffects } from '../assets/effects'
import { preloadEnemies } from '../assets/enemies'
import { preloadEnemyProps } from '../assets/enemyProps'
import { preloadEnemyRounds } from '../assets/enemyRounds'
import {
  backgroundUrl,
  characterSheets,
  enemySheets,
  PARALLAX_LAYERS,
  portraitUrl,
} from '../assets/manifest'
import { preloadProjectiles } from '../assets/projectiles'
import { weaponIconKey, weaponIconUrl, weaponsWithIcons } from '../assets/weapons'
import { preloadAudio } from '../audio/manifest'
import { PALETTE } from '../config'
import { applyFit } from '../fit'

/**
 * Loads the textures needed to reach the title and start playing.
 *
 * The loader is driven by the manifest rather than a hand-written list: a sheet
 * that exists on disk is loaded, one that does not is simply absent, and the
 * scenes fall back to their grey-box rectangle. That keeps the M4 art additive -
 * the game runs with or without it.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    const width = this.scale.width
    const midY = this.scale.height / 2

    this.add.rectangle(0, midY, width, 4, 0x1a1a1a).setOrigin(0, 0.5)
    const bar = this.add.rectangle(0, midY, 0, 8, 0xd6452c).setOrigin(0, 0.5)

    this.load.on('progress', (value: number) => {
      bar.width = width * value
    })

    for (const sheet of characterSheets()) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }

    for (const sheet of enemySheets()) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }

    for (const key of PARALLAX_LAYERS) {
      const url = backgroundUrl(key)
      if (url !== undefined) this.load.image(key, url)
    }

    // Character portraits. These are the real artwork - the stage sprite sheets
    // are 48px generated placeholders - so the select screen shows each character
    // as drawn rather than as a coloured block.
    for (const id of CHARACTER_IDS) {
      const url = portraitUrl(id)
      if (url !== undefined) this.load.image(`portrait-${id}`, url)
    }

    // Chibi looks (REQ-VAR-001) are NOT preloaded. All 57 of them add 1.5MB
    // and push the first load past the 8MB budget (REQ-NFR-003), for images most
    // players will never look at. They are fetched on demand: the look switcher
    // loads a character's set when the player opens it, and the stage loads the
    // one that was chosen.

    // The free animated character (CC BY 4.0). These are the only sheets in the
    // project with real animation frames rather than a single illustration.
    for (const character of CHARACTER_IDS) {
      for (const clip of ANIMATION_CLIPS) {
        const url = sheetUrl(character, clip)
        if (url === undefined) continue
        this.load.spritesheet(sheetKey(character, clip), url, {
          frameWidth: FRAME_SIZE,
          frameHeight: FRAME_SIZE,
        })
      }
    }

    // Generated enemy art: ten archetypes, idle and hit.
    preloadEnemies(this.load)

    // Ten projectile sprites, 15KB in total. Small enough to load with the rest
    // of the shared art: a weapon's shot appearing a frame late would read as a
    // missed input, not as a loading state.
    preloadProjectiles(this.load)
    preloadEnemyRounds(this.load)
    preloadEnemyProps(this.load)

    // 25 combat effects - muzzle flashes, hit marks, charge auras and the eight
    // boss attacks - well under 300KB together. They load with the shared art
    // because a hit mark that arrives a frame late is worse than no hit mark.
    preloadEffects(this.load)

    // Per-stage backdrops are NOT preloaded here. 48 images at 1920x1080 took
    // the first load from 4.2MB to 22MB, nearly three times the budget, to
    // load eleven stage's worth of art the player will not see for minutes.
    // Each stage loads its own four layers on entry instead.

    // Character avatars are deliberately NOT loaded here, and not anywhere else
    // either: nothing in the game draws one. The select screen uses the painted
    // portrait, the HUD uses the weapon icon. They were being queued on every
    // boot at 0.62MB for a texture no scene asks for - the loader is driven by
    // the manifest, so "the file exists" was enough to put it on the wire.
    // `assets/avatars.ts` is kept for when a screen actually wants the square
    // crop; until then it costs nothing.

    // Weapon icons ARE loaded here: the HUD shows the current weapon from the
    // first frame of a stage, and a missing icon there reads as a bug. Ten files,
    // 0.16MB - small enough that deferring them would only move the problem.
    for (const weaponId of weaponsWithIcons()) {
      const url = weaponIconUrl(weaponId)
      if (url !== undefined) this.load.image(weaponIconKey(weaponId), url)
    }

    // Stamps and boss portraits are also deferred - they are a further 1.75MB
    // and neither can appear before the player clears a stage or reaches a boss
    // door. ResultScene draws the letter when a stamp is absent and
    // bossArtKeyFor returns null when a portrait is absent, so both paths already
    // degrade rather than break. See preloadStamp / preloadBossArt.

    preloadAudio(this.load)
  }

  create(): void {
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.scene.start('Title')
  }
}
