import Phaser from 'phaser'
import { backgroundUrl, characterSheets, enemySheets, PARALLAX_LAYERS } from '../assets/manifest'
import { PALETTE } from '../config'

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
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.scene.start('Title')
  }
}
