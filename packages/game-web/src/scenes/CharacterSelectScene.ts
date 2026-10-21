import { CHARACTER_IDS, CHARACTERS, type CharacterId, characterDefinition } from '@contra/game-core'
import Phaser from 'phaser'
import { loadChibi } from '../assets/chibi'
import { type CharacterLook, looksFor, resolveLook } from '../assets/looks'
import { portraitUrl } from '../assets/manifest'
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
  /** The look chosen for each character, so switching back keeps it. */
  private readonly chosenLooks = new Map<CharacterId, string>()
  /** The art object currently shown on each card, replaced when the look changes. */
  private readonly lookImages = new Map<CharacterId, Phaser.GameObjects.Image>()
  private lookStrip: Phaser.GameObjects.Text | null = null

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
      .text(GAME_WIDTH / 2, 116, '初始武器 / 被动 / 炸弹各不相同', {
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
    const startY = 216

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
      const look = this.currentLook(id)
      const lookImage = this.addLookImage(look, cardWidth, cardHeight)
      if (lookImage !== null) {
        card.add(lookImage)
        this.lookImages.set(id, lookImage)
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

    // Which look is active, and how many there are (REQ-VAR-001).
    this.lookStrip = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 8, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '方向键切换 · Q 换形象 · Enter 确认 · Esc 返回', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    this.input.keyboard?.on('keydown-SPACE', () => this.confirm())
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm())
    this.input.keyboard?.on('keydown-LEFT', () => this.step(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.step(1))
    // Q cycles the looks of the selected character (REQ-VAR-001).
    this.input.keyboard?.on('keydown-Q', () => this.cycleLook(1))
    this.input.keyboard?.on('keydown-E', () => this.cycleLook(-1))
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
    this.refreshLookStrip()
  }

  private step(direction: 1 | -1): void {
    const current = CHARACTER_IDS.indexOf(this.selected)
    const next = (current + direction + CHARACTER_IDS.length) % CHARACTER_IDS.length
    const id = CHARACTER_IDS[next]
    if (id !== undefined) this.select(id)
  }

  /** Every look available for a character. */
  private looksFor(id: CharacterId): CharacterLook[] {
    return looksFor(id, portraitUrl(id))
  }

  /** The look currently chosen for a character. */
  private currentLook(id: CharacterId): CharacterLook {
    const chosen = this.chosenLooks.get(id)
    return resolveLook(id, chosen, portraitUrl(id))
  }

  /**
   * Draws a look into the card's art area.
   *
   * Two shapes of source art ship here: full-body portraits at 506x900 and
   * square avatars with a white background. The chibi set mixes 202x360,
   * 360x202 and 360x360. A square scaled to fit a tall box would shrink to a
   * stamp, so squares are scaled to *cover* the box and cropped; everything else
   * is scaled to fit.
   */
  private addLookImage(
    look: CharacterLook,
    cardWidth: number,
    cardHeight: number,
  ): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(look.textureKey)) return null

    const source = this.textures.get(look.textureKey).getSourceImage()
    // The art area: left portion of the card, inset from every border so the
    // stroke and the accent bar stay visible.
    const boxWidth = cardWidth * 0.44
    const boxHeight = cardHeight - 24
    const centerX = -cardWidth / 2 + boxWidth / 2 + 8
    const centerY = 0

    // Scale to *contain*: the whole image fits inside the art area whatever its
    // aspect ratio. The chibi files are 202x360, 360x202 and 360x360, so an
    // aspect-independent rule is the only one that cannot overflow.
    const scale = Math.min(boxWidth / source.width, boxHeight / source.height)

    return this.add.image(centerX, centerY, look.textureKey).setOrigin(0.5, 0.5).setScale(scale)
  }

  /**
   * Moves to the next look of the selected character (REQ-VAR-001).
   *
   * Only the selected character's set is cycled. Showing all 57 chibi images at
   * once would need every one of them on screen and would put the whole set in
   * the first load, which does not fit the budget.
   */
  private cycleLook(direction: 1 | -1): void {
    const looks = this.looksFor(this.selected)
    if (looks.length <= 1) return

    const current = this.currentLook(this.selected)
    const index = looks.findIndex((look) => look.id === current.id)
    const next = looks[(index + direction + looks.length) % looks.length]
    if (next === undefined) return

    this.chosenLooks.set(this.selected, next.id)
    this.refreshLookStrip()

    // A chibi image is fetched on demand (REQ-VAR-001): the 57 images are not
    // in the first load, so the one being switched to has to arrive first.
    if (next.kind === 'chibi' && !this.textures.exists(next.textureKey)) {
      const name = next.id.replace('chibi-', '')
      void loadChibi(this, this.selected, name).then((loaded) => {
        if (loaded) this.swapLookImage(this.selected, next)
      })
      return
    }

    this.swapLookImage(this.selected, next)
  }

  /** Replaces the art on a card when the look changes. */
  private swapLookImage(id: CharacterId, look: CharacterLook): void {
    const cardIndex = CHARACTER_IDS.indexOf(id)
    const card = this.cards[cardIndex]
    if (card === undefined) return

    const old = this.lookImages.get(id)
    if (old !== undefined) {
      card.remove(old)
      old.destroy()
      this.lookImages.delete(id)
    }

    const image = this.addLookImage(look, 236, 196)
    if (image === null) return
    card.add(image)
    this.lookImages.set(id, image)
  }

  /** Shows which look is active and how many there are. */
  private refreshLookStrip(): void {
    if (this.lookStrip === null) return
    const looks = this.looksFor(this.selected)
    const current = this.currentLook(this.selected)
    if (looks.length <= 1) {
      this.lookStrip.setText('')
      return
    }
    const index = looks.findIndex((look) => look.id === current.id)
    this.lookStrip.setText(`形象 ${current.label}  ${index + 1}/${looks.length}  ·  Q 切换`)
  }

  private confirm(): void {
    // The choice is carried forward, not applied here: the stage screen picks
    // which fight, and the stage scene is the only place a World is built.
    this.scene.start('StageSelect', {
      characterId: CHARACTERS[this.selected].id,
      lookId: this.currentLook(this.selected).id,
    })
  }
}
