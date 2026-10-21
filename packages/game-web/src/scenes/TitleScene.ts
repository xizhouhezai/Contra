import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/** Title screen: one key or one click opens the campaign. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title')
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'CONTRA', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 56, '推理者的最后一役', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, '十二关 · 六角色 · 三种 Boss 形态', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 72, '按 Enter / 空格 或点击开始', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 14, 'S 设置', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: PALETTE.hud,
      })
      .setOrigin(1, 1)

    this.input.keyboard?.once('keydown-ENTER', () => this.begin())
    this.input.keyboard?.once('keydown-SPACE', () => this.begin())
    this.input.once('pointerdown', () => this.begin())
  }

  private begin(): void {
    // Character first, then the stage: which runner you are decides the weapon
    // you walk in with, so picking the stage first would mean handing the player
    // a gun and then asking which character they wanted.
    this.scene.start('CharacterSelect')
  }
}
