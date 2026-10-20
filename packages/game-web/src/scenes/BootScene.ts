import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, TEXTURES } from '../config'

/** Box dimensions must match the rule-layer collision boxes in @contra/game-core. */
const BOXES = [
  { key: TEXTURES.player, width: 24, height: 40, color: PALETTE.player },
  { key: TEXTURES.target, width: 32, height: 40, color: PALETTE.target },
  { key: TEXTURES.bullet, width: 8, height: 8, color: PALETTE.bullet },
] as const

/**
 * Loads the gray-box texture atlas.
 *
 * M0 ships no image files: every texture is a solid rectangle drawn at boot, so
 * the whole presentation layer stays placeholder art until M4 (milestones.md).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '载入灰盒资源…', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    for (const box of BOXES) {
      if (this.textures.exists(box.key)) continue
      const graphics = this.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(box.color, 1)
      graphics.fillRect(0, 0, box.width, box.height)
      graphics.generateTexture(box.key, box.width, box.height)
      graphics.destroy()
    }
  }

  create(): void {
    this.scene.start('TitleScene')
  }
}
