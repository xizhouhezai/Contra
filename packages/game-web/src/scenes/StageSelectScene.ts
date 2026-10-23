import {
  CAMPAIGN_STAGES,
  type CampaignProgress,
  clearProgress,
  isUnlocked,
  loadProgress,
} from '@contra/game-core'
import { LocalStorageAdapter } from '@contra/game-platform'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import { applyFit } from '../fit'

/**
 * Stage select: eight stages in a 4x2 grid with saved progress.
 *
 * Progress is read through the rule layer's own loader, using the platform
 * Storage port, so the browser, a test double and any future adapter share one
 * code path (T-M2-12).
 */
export class StageSelectScene extends Phaser.Scene {
  private storage = LocalStorageAdapter.fromGlobal()
  private progress!: CampaignProgress
  /** Cards in campaign order, so arrow keys can walk them. */
  private cards: {
    stageId: string
    index: number
    unlocked: boolean
    x: number
    y: number
    width: number
    height: number
    container: Phaser.GameObjects.Container
  }[] = []
  private cursor = 0
  private highlight: Phaser.GameObjects.Rectangle | null = null
  private readonly columns = 4
  /** Carried from the character screen through to the stage scene. */
  private characterId: string | undefined
  /** The chosen look, carried the same way (REQ-VAR-001). */
  private lookId: string | undefined

  constructor() {
    super('StageSelect')
  }

  init(data: { characterId?: string; lookId?: string }): void {
    this.characterId = data?.characterId
    this.lookId = data?.lookId
  }

  create(): void {
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)
    this.storage = LocalStorageAdapter.fromGlobal()
    this.cards = []
    this.cursor = 0
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

    const columns = this.columns
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

      this.cards.push({
        stageId: stage.id,
        index: stage.index,
        unlocked,
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        container: card,
      })

      if (unlocked) {
        // The hit area goes on the background rectangle, not the container. A
        // Container's own hit test needs an explicit size and origin, and getting
        // it subtly wrong produces a card that looks clickable and never fires -
        // which is exactly the bug this replaced.
        const hit = this.add
          .rectangle(x, y, cardWidth, cardHeight, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true })
        hit.on('pointerdown', () => this.enterStage(stage.id))
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

    // Keyboard navigation. The title screen is keyboard-driven, so a player who
    // pressed Enter to get here expects to keep going with keys rather than
    // discovering they now need a mouse.
    this.input.keyboard?.on('keydown-LEFT', () => this.moveCursor(-1, 0))
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveCursor(1, 0))
    this.input.keyboard?.on('keydown-UP', () => this.moveCursor(0, -1))
    this.input.keyboard?.on('keydown-DOWN', () => this.moveCursor(0, 1))
    this.input.keyboard?.on('keydown-ENTER', () => this.enterSelected())
    this.input.keyboard?.on('keydown-SPACE', () => this.enterSelected())
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('CharacterSelect'))

    this.input.keyboard?.on('keydown-R', () => {
      clearProgress(this.storage)
      this.scene.restart()
    })

    this.focusFirstUnlocked()
  }

  /** Puts the cursor on the furthest stage the player has unlocked. */
  private focusFirstUnlocked(): void {
    const last = this.cards.reduce((best, card, position) => (card.unlocked ? position : best), 0)
    this.moveCursorTo(last)
  }

  /**
   * Moves the cursor one card.
   *
   * Rows wrap within the grid, and locked cards are skipped in the direction of
   * travel rather than being refused outright - pressing right on the last
   * unlocked stage should do nothing visible rather than appear broken.
   */
  private moveCursor(dx: number, dy: number): void {
    if (this.cards.length === 0) return
    let next = this.cursor
    for (let step = 0; step < this.cards.length; step += 1) {
      const column = next % this.columns
      const row = Math.floor(next / this.columns)
      const rows = Math.ceil(this.cards.length / this.columns)
      const nextColumn = (column + dx + this.columns) % this.columns
      const nextRow = (row + dy + rows) % rows
      next = nextRow * this.columns + nextColumn
      if (next >= this.cards.length) continue
      if (this.cards[next]?.unlocked === true) break
    }
    this.moveCursorTo(next)
  }

  private moveCursorTo(position: number): void {
    this.cursor = Math.max(0, Math.min(this.cards.length - 1, position))
    const card = this.cards[this.cursor]
    if (card === undefined) return

    if (this.highlight === null) {
      this.highlight = this.add
        .rectangle(card.x, card.y, card.width + 8, card.height + 8)
        .setStrokeStyle(3, 0xd6452c)
        .setDepth(10)
    }
    this.highlight.setPosition(card.x, card.y)
  }

  private enterSelected(): void {
    const card = this.cards[this.cursor]
    if (card === undefined || !card.unlocked) return
    this.enterStage(card.stageId)
  }

  /** Starts a stage, passing along whoever was chosen on the previous screen. */
  private enterStage(stageId: string): void {
    this.scene.start('Stage', {
      stageId,
      characterId: this.characterId,
      lookId: this.lookId,
    })
  }
}
