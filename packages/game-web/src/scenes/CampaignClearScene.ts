import { CAMPAIGN_STAGES, totalCampaignSeconds } from '@contra/game-core'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import { applyFit } from '../fit'

/** Campaign clear screen (T-M3-08): shown once stage 12 falls. */
export class CampaignClearScene extends Phaser.Scene {
  constructor() {
    super('CampaignClear')
  }

  create(): void {
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)

    this.add
      .text(GAME_WIDTH / 2, 200, '战役结束', {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 280, '推理者的最后一役，到此为止。', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    const minutes = Math.round(totalCampaignSeconds(CAMPAIGN_STAGES) / 60)
    const rows = [
      ['关卡', String(CAMPAIGN_STAGES.length)],
      ['设计总时长', `${minutes} 分钟`],
      ['终点', '涌现 · 坍缩'],
    ]

    rows.forEach(([label, value], index) => {
      const y = 380 + index * 44
      this.add
        .text(GAME_WIDTH / 2 - 180, y, label, {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: PALETTE.inkMuted,
        })
        .setOrigin(0, 0.5)
      this.add
        .text(GAME_WIDTH / 2 + 180, y, value, {
          fontFamily: 'monospace',
          fontSize: '19px',
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
