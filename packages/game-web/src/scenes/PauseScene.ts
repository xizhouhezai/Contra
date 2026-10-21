import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/**
 * Pause menu (T-M5-03).
 *
 * Runs as an overlay: the stage scene is paused, not stopped, so resuming
 * continues from the exact frame it left. A paused World does not advance -
 * the stage's update returns early while this scene is on top, which is what
 * makes the pause honest rather than a cosmetic dimming.
 */
export class PauseScene extends Phaser.Scene {
  private cursor = 0
  private labels: Phaser.GameObjects.Text[] = []
  private readonly items = ['继续', '设置', '返回关卡选择']

  constructor() {
    super('Pause')
  }

  create(): void {
    this.cursor = 0
    this.labels = []

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0, 0)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, '暂停', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: PALETTE.background,
      })
      .setOrigin(0.5)

    this.items.forEach((item, index) => {
      this.labels.push(
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30 + index * 44, item, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: PALETTE.background,
          })
          .setOrigin(0.5),
      )
    })

    this.input.keyboard?.on('keydown-UP', () => this.move(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.choose())
    this.input.keyboard?.on('keydown-ESC', () => this.resume())

    this.refresh()
  }

  private move(delta: number): void {
    this.cursor = (this.cursor + delta + this.items.length) % this.items.length
    this.refresh()
  }

  private choose(): void {
    if (this.cursor === 0) {
      this.resume()
      return
    }
    if (this.cursor === 1) {
      this.scene.start('Settings')
      return
    }
    this.scene.stop('Stage')
    this.scene.start('StageSelect')
  }

  private resume(): void {
    this.scene.resume('Stage')
    this.scene.stop()
  }

  private refresh(): void {
    this.labels.forEach((label, index) => {
      label.setColor(index === this.cursor ? PALETTE.alert : PALETTE.background)
    })
  }
}
