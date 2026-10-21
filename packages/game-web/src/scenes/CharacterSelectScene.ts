import { CHARACTER_IDS, CHARACTERS, type CharacterId, characterDefinition } from '@contra/game-core'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'

/**
 * Character select.
 *
 * Six characters in one row, each showing what actually differs between them:
 * starting weapon, passive and bomb (backlog.md T-M1-11). The choice travels to
 * StageScene through the scene data rather than a module global, so a restart can
 * pick differently.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selected: CharacterId = CHARACTER_IDS[0] ?? 'deepseek'
  private readonly cards: Phaser.GameObjects.Container[] = []

  constructor() {
    super('CharacterSelect')
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background)

    this.add
      .text(GAME_WIDTH / 2, 70, '选择推理者', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 115, '初始武器 / 被动 / 炸弹各不相同', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    const cardWidth = 190
    const gap = 14
    const total = CHARACTER_IDS.length * cardWidth + (CHARACTER_IDS.length - 1) * gap
    const startX = (GAME_WIDTH - total) / 2 + cardWidth / 2
    const centerY = GAME_HEIGHT / 2 + 20

    CHARACTER_IDS.forEach((id, index) => {
      const definition = characterDefinition(id)
      const x = startX + index * (cardWidth + gap)
      const card = this.add.container(x, centerY)

      card.add(this.add.rectangle(0, 0, cardWidth, 290, 0xffffff, 1).setStrokeStyle(2, 0x1a1a1a))
      card.add(
        this.add.rectangle(
          0,
          -143,
          cardWidth,
          8,
          Phaser.Display.Color.HexStringToColor(definition.primary).color,
        ),
      )
      card.add(
        this.add
          .text(0, -108, definition.name, {
            fontFamily: 'Georgia, serif',
            fontSize: '21px',
            color: PALETTE.ink,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(0, -76, definition.codename, {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(0, -46, definition.role, {
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(
            0,
            40,
            [
              `武器  ${definition.initialWeapon}`,
              `被动  ${definition.passive}`,
              `炸弹  ${definition.bomb}`,
            ].join('\n'),
            {
              fontFamily: 'monospace',
              fontSize: '13px',
              color: PALETTE.ink,
              lineSpacing: 10,
            },
          )
          .setOrigin(0.5),
      )

      // The hit area lives on a real rectangle, not the container: a Container's
      // own hit test silently fails to fire when its size and origin disagree,
      // which is the bug that made the stage cards unclickable.
      const hit = this.add
        .rectangle(x, centerY, cardWidth, 290, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
      hit.on('pointerdown', () => this.select(id))
      this.cards.push(card)
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 55, '方向键切换 · Enter 确认 · Esc 返回', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-SPACE', () => this.confirm())
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm())
    this.input.keyboard?.on('keydown-LEFT', () => this.step(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.step(1))
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'))

    this.select(this.selected)
  }

  /** Highlights one card and dims the rest. */
  private select(id: CharacterId): void {
    this.selected = id
    CHARACTER_IDS.forEach((candidate, index) => {
      const card = this.cards[index]
      if (card === undefined) return
      card.setAlpha(candidate === id ? 1 : 0.55)
      card.setScale(candidate === id ? 1.04 : 1)
    })
  }

  private step(direction: 1 | -1): void {
    const current = CHARACTER_IDS.indexOf(this.selected)
    const next = (current + direction + CHARACTER_IDS.length) % CHARACTER_IDS.length
    const id = CHARACTER_IDS[next]
    if (id !== undefined) this.select(id)
  }

  private confirm(): void {
    // The choice is carried forward, not applied here: the stage screen picks
    // which fight, and the stage scene is the only place a World is built.
    this.scene.start('StageSelect', { characterId: CHARACTERS[this.selected].id })
  }
}
