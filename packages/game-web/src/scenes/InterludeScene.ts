import { INTERLUDES } from '@contra/game-core'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/**
 * Interlude card shown after the act bosses (T-M3-07).
 *
 * Deliberately static and skippable: it is a breather, not a gate. Progress was
 * already saved when the stage cleared, so skipping cannot lose anything.
 */
export class InterludeScene extends Phaser.Scene {
  private text = ''
  private nextStageId = ''

  constructor() {
    super('Interlude')
  }

  init(data: { stageId?: string; nextStageId?: string }): void {
    this.text = data.stageId ?? ''
    this.nextStageId = data.nextStageId ?? ''
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)
    const interlude = INTERLUDES[this.text]

    // Placeholder art: a single framed panel until real illustrations land in M4.
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 720, 260, 0xffffff, 1)
      .setStrokeStyle(2, 0x1a1a1a)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130, interlude?.title ?? '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, interlude?.body ?? '', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: PALETTE.inkMuted,
        align: 'center',
        wordWrap: { width: 620 },
        lineSpacing: 10,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, '空格继续 · Esc 跳过', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-SPACE', () => this.proceed())
    this.input.keyboard?.on('keydown-ESC', () => this.proceed())
  }

  private proceed(): void {
    if (this.nextStageId.length > 0) {
      this.scene.start('Stage', { stageId: this.nextStageId })
      return
    }
    this.scene.start('StageSelect')
  }
}
