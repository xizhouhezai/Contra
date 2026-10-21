import {
  CAMPAIGN_STAGES,
  type CampaignProgress,
  clearProgress,
  isUnlocked,
  loadProgress,
} from '@contra/game-core'
import { LocalStorage } from '@contra/game-platform'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/**
 * Stage select: eight stages in a 4x2 grid with saved progress.
 *
 * Progress is read through the rule layer's own loader, using the platform
 * Storage port, so the browser, a test double and any future adapter share one
 * code path (T-M2-12).
 */
export class StageSelectScene extends Phaser.Scene {
  private storage = new LocalStorage()
  private progress!: CampaignProgress

  constructor() {
    super('StageSelect')
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.storage = new LocalStorage()
    this.progress = loadProgress(
      this.storage,
      CAMPAIGN_STAGES.map((stage) => stage.id),
    )

    this.add
      .text(GAME_WIDTH / 2, 70, '选择关卡', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    const columns = 4
    const cardWidth = 220
    const cardHeight = 130
    const gapX = 20
    const gapY = 24
    const startX = (GAME_WIDTH - (columns * cardWidth + (columns - 1) * gapX)) / 2 + cardWidth / 2
    const startY = 220

    CAMPAIGN_STAGES.forEach((stage, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = startX + column * (cardWidth + gapX)
      const y = startY + row * (cardHeight + gapY)
      const unlocked = isUnlocked(this.progress, stage.index)
      const record = this.progress.stages.find((entry) => entry.stageId === stage.id)

      const card = this.add.container(x, y)
      card.add(
        this.add
          .rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 1)
          .setStrokeStyle(2, unlocked ? 0x1a1a1a : 0xbbbbbb),
      )
      card.add(
        this.add
          .text(0, -34, `第 ${stage.index} 关`, {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: unlocked ? PALETTE.ink : '#999999',
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(0, -4, stage.name, {
            fontFamily: 'Georgia, serif',
            fontSize: '20px',
            color: unlocked ? PALETTE.ink : '#999999',
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(
            0,
            32,
            unlocked ? (record?.cleared ? `已通关 · ${record.bestScore} 分` : '未通关') : '未解锁',
            { fontFamily: 'monospace', fontSize: '12px', color: PALETTE.inkMuted },
          )
          .setOrigin(0.5),
      )

      if (unlocked) {
        card.setSize(cardWidth, cardHeight)
        card.setInteractive(
          new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
          Phaser.Geom.Rectangle.Contains,
        )
        card.on('pointerdown', () => this.scene.start('Stage', { stageId: stage.id }))
      } else {
        card.setAlpha(0.5)
      }
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'R 重置存档', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-R', () => {
      clearProgress(this.storage)
      this.scene.restart()
    })
  }
}
