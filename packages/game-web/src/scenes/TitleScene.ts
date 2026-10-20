import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/** Title screen: one key or one click drops into the gray-box stage. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48, 'CONTRA', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, 'M0 灰盒 · 跑到右侧终点', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 64, '按 Enter / 空格 或点击开始', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    this.input.keyboard?.once('keydown-ENTER', () => this.startStage())
    this.input.keyboard?.once('keydown-SPACE', () => this.startStage())
    this.input.once('pointerdown', () => this.startStage())
  }

  private startStage(): void {
    this.scene.start('StageScene')
  }
}
