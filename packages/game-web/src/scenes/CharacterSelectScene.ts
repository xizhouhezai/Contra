import { CHARACTER_IDS, CHARACTERS, type CharacterId, characterDefinition } from '@contra/game-core'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import { applyFit } from '../fit'

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
    applyFit(this)
    this.cameras.main.setBackgroundColor(PALETTE.background)

    this.add
      .text(GAME_WIDTH / 2, 70, '选择推理者', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: PALETTE.ink,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 110, '初始武器 / 被动 / 炸弹各不相同', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    // Two rows of three. Six cards in one row need 1210px against a 960px
    // canvas, which is how the first and last characters ended up off-screen.
    // The grid is sized against the space the header and the hint leave behind,
    // not chosen first and then allowed to overlap them.
    const cardWidth = 236
    // Tall enough for a portrait plus four lines of stats. The text sits to the
    // right of the art, so the height is driven by the art, not the text.
    const cardHeight = 196
    const gapX = 16
    const gapY = 14
    const columns = 3
    const totalWidth = columns * cardWidth + (columns - 1) * gapX
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2
    // Header occupies y=56..126; the grid starts below it.
    const startY = 214

    CHARACTER_IDS.forEach((id, index) => {
      const definition = characterDefinition(id)
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = startX + column * (cardWidth + gapX)
      const centerY = startY + row * (cardHeight + gapY)
      const card = this.add.container(x, centerY)

      card.add(
        this.add.rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 1).setStrokeStyle(2, 0x1a1a1a),
      )
      card.add(
        this.add
          .rectangle(
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            6,
            Phaser.Display.Color.HexStringToColor(definition.primary).color,
          )
          .setOrigin(0, 0),
      )

      // The portrait is the point of this screen: a player picks a character by
      // recognising them, and six text rows with names on them do not do that.
      // Falls back to nothing when the art is missing, so the screen still works
      // without it.
      const portraitKey = `portrait-${id}`
      const hasPortrait = this.textures.exists(portraitKey)
      if (hasPortrait) {
        const source = this.textures.get(portraitKey).getSourceImage()
        const boxWidth = cardWidth * 0.46
        const boxHeight = cardHeight - 20

        // Two shapes of source art ship here: full-body portraits at 506x900 and
        // one square 160x160 avatar with a white background. Scaling a square to
        // fit a tall box would shrink it to a stamp, so it is scaled to *cover*
        // the box and cropped instead - a face fills a portrait frame better than
        // a letterboxed thumbnail does.
        const isSquare = Math.abs(source.width - source.height) < 8
        if (isSquare) {
          const cover = Math.max(boxWidth / source.width, boxHeight / source.height)
          const image = this.add
            .image(-cardWidth * 0.26, 0, portraitKey)
            .setOrigin(0.5, 0.5)
            .setScale(cover)
          const maskShape = this.make.graphics({}, false)
          maskShape.fillRect(
            x - cardWidth * 0.26 - boxWidth / 2,
            centerY - boxHeight / 2,
            boxWidth,
            boxHeight,
          )
          image.setMask(maskShape.createGeometryMask())
          card.add(image)
        } else {
          const scale = Math.min(boxWidth / source.width, boxHeight / source.height)
          card.add(
            this.add
              .image(-cardWidth * 0.26, -cardHeight / 2 + 10, portraitKey)
              .setOrigin(0.5, 0)
              .setScale(scale),
          )
        }
      }
      card.add(
        this.add
          .text(hasPortrait ? cardWidth * 0.24 : 0, -58, definition.name, {
            fontFamily: 'Georgia, serif',
            fontSize: '19px',
            color: PALETTE.ink,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(hasPortrait ? cardWidth * 0.24 : 0, -34, definition.codename, {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(hasPortrait ? cardWidth * 0.24 : 0, -14, definition.role, {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(
            0,
            hasPortrait ? cardWidth * 0.24 : 0,
            42,
            [
              `武器 ${definition.initialWeapon}`,
              `被动 ${definition.passive}`,
              `炸弹 ${definition.bomb}`,
            ].join('\n'),
            {
              fontFamily: 'monospace',
              fontSize: '12px',
              color: PALETTE.ink,
              lineSpacing: 9,
            },
          )
          .setOrigin(0.5),
      )

      // The hit area lives on a real rectangle, not the container: a Container's
      // own hit test silently fails to fire when its size and origin disagree,
      // which is the bug that made the stage cards unclickable.
      const hit = this.add
        .rectangle(x, centerY, cardWidth, cardHeight, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
      hit.on('pointerdown', () => this.select(id))
      this.cards.push(card)
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, '方向键切换 · Enter 确认 · Esc 返回', {
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
