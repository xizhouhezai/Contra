import { CHARACTER_IDS } from '@contra/game-core'
import Phaser from 'phaser'
import { ANIMATION_CLIPS, FRAME_SIZE, sheetKey } from '../assets/animated'
import { sheetUrl } from '../assets/animatedSheets'
import { preloadEnemies } from '../assets/enemies'
import {
  backgroundUrl,
  characterSheets,
  enemySheets,
  PARALLAX_LAYERS,
  portraitUrl,
} from '../assets/manifest'
import { preloadAudio } from '../audio/manifest'
import { PALETTE } from '../config'
import { applyFit } from '../fit'

/**
 * Loads every texture, then hands off to the title.
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

    preloadAudio(this.load)
  }

  create(): void {
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.scene.start('Title')
  }
}
