import { gradeRun, type RunResult } from '@contra/game-core'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import { applyFit } from '../fit'

/**
 * Result screen: score, accuracy and clear time, plus a letter grade.
 *
 * The grade comes from the rule layer's grading function rather than being
 * computed here, so the thresholds stay with the rules (T-M2-13).
 */
export class ResultScene extends Phaser.Scene {
  private result!: RunResult

  constructor() {
    super('Result')
  }

  init(data: RunResult): void {
    this.result = data
  }

  create(): void {
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)

    const grade = gradeRun(this.result)

    this.add
      .text(GAME_WIDTH / 2, 120, '关卡完成', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 240, grade, {
        fontFamily: 'Georgia, serif',
        fontSize: '110px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    const rows = [
      ['分数', String(this.result.score)],
      ['命中率', `${(this.result.accuracy * 100).toFixed(1)}%`],
      ['用时', `${this.result.elapsedSeconds.toFixed(1)} 秒`],
    ]

    rows.forEach(([label, value], index) => {
      const y = 380 + index * 44
      this.add
        .text(GAME_WIDTH / 2 - 160, y, label, {
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          color: PALETTE.inkMuted,
        })
        .setOrigin(0, 0.5)
      this.add
        .text(GAME_WIDTH / 2 + 160, y, value, {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: PALETTE.ink,
        })
        .setOrigin(1, 0.5)
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '空格返回关卡选择', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('StageSelect'))
  }
}
