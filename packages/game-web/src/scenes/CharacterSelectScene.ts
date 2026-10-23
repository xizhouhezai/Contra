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
  private readonly cardWidth = 232
  private readonly cardHeight = 156
  /** Card borders, kept so the selection state can be drawn, not hinted. */
  private readonly borders = new Map<CharacterId, Phaser.GameObjects.Rectangle>()
  /** Offset ink shadow, shown only on the selected card. */
  private readonly shadows = new Map<CharacterId, Phaser.GameObjects.Rectangle>()
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
      .text(GAME_WIDTH / 2, 120, '初始武器 / 被动 / 炸弹各不相同', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)

    // Two rows of three. Six cards in one row need 1210px against a 960px
    // canvas, which is how the first and last characters ended up off-screen.
    // The grid is sized against the space the header and the hint leave behind,
    // not chosen first and then allowed to overlap them.
    // Two rows plus the footer have to fit in 540px of canvas. Card height came
    // down from 196 after measuring: 156 + 168 * 2 + 12 = 504 for the grid,
    // against a footer needing 46px from 494. The overlap was ten pixels, so
    // the card loses eight more rather than the footer being pushed off-canvas.
    const cardWidth = this.cardWidth
    const cardHeight = this.cardHeight
    const gapX = 16
    const gapY = 12
    const columns = 3
    const totalWidth = columns * cardWidth + (columns - 1) * gapX
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2

    // The grid is laid out from the space the header and the footer leave
    // behind, and that space is measured rather than assumed. The previous
    // numbers gave a grid of 156..524 against a footer sitting at 510, so the
    // hint line and the look strip sat on top of the second row of cards - the
    // overlap was arithmetic, not a styling taste.
    //
    // Header ends at 138. Footer needs 48px for two lines at 526 and 502. That
    // leaves 388px for two rows plus the gap: 168 * 2 + 12 = 348, with 20px of
    // breathing room either side.
    const gridTop = 156
    const rowHeight = cardHeight + gapY
    const startY = gridTop + cardHeight / 2
    void rowHeight

    CHARACTER_IDS.forEach((id, index) => {
      const definition = characterDefinition(id)
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = startX + column * (cardWidth + gapX)
      const centerY = startY + row * (cardHeight + gapY)
      const card = this.add.container(x, centerY)

      // A Riso print does not glow or outline: a heavy shape is a second pass of
      // ink landing slightly off register. The selected card lifts off the page
      // as an offset ink shadow rather than wearing a coloured frame - a 4px
      // vermillion rectangle around a white card on cream paper reads as a
      // warning, not as a choice.
      const shadow = this.add
        .rectangle(6, 6, cardWidth, cardHeight, 0x1a1a1a, 0.18)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
      this.shadows.set(id, shadow)
      card.add(shadow)

      const border = this.add
        .rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 1)
        .setStrokeStyle(2, 0x1a1a1a)
      this.borders.set(id, border)
      card.add(border)
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
          .text(hasPortrait ? cardWidth * 0.24 : 0, -52, definition.name, {
            fontFamily: 'Georgia, serif',
            fontSize: '19px',
            color: PALETTE.ink,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(hasPortrait ? cardWidth * 0.24 : 0, -30, definition.codename, {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(hasPortrait ? cardWidth * 0.24 : 0, -11, definition.role, {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: PALETTE.inkMuted,
          })
          .setOrigin(0.5),
      )
      // The three stat lines start where the art ends and run to the card edge,
      // left-aligned. Centring them on the text column pushed a long id such as
      // "spread-resist" through both borders at once; wrapping is the only rule
      // that survives an id of any length, because the ids are data.
      const artWidth = cardWidth * 0.46
      const statsLeft = hasPortrait ? -cardWidth / 2 + artWidth + 12 : -cardWidth / 2 + 8
      card.add(
        this.add
          .text(
            statsLeft,
            34,
            [
              `武器 ${definition.initialWeapon}`,
              `被动 ${definition.passive}`,
              `炸弹 ${definition.bomb}`,
            ].join('\n'),
            {
              fontFamily: 'monospace',
              fontSize: '10px',
              color: PALETTE.ink,
              lineSpacing: 7,
              wordWrap: { width: cardWidth / 2 - (hasPortrait ? artWidth - cardWidth / 2 + 12 : 8) - 6 },
            },
          )
          .setOrigin(0, 0.5),
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
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)
      .setDepth(10)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 38, '方向键切换 · Q 换形象 · Enter 确认 · Esc 返回', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.inkMuted,
      })
      .setOrigin(0.5)
      .setDepth(10)

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

  /**
   * Highlights one card and dims the rest.
   *
   * The first version only scaled the chosen card to 1.04 and dropped the others
   * to 0.55 alpha. Both are real changes that a player failed to notice, because
   * a 4% size difference on a 232px card is nine pixels and dimming six cards at
   * once gives the eye no reference. The selection is now drawn: the chosen
   * border thickens to the alert colour, and the rest recede in both alpha and
   * stroke weight.
   */
  private select(id: CharacterId): void {
    this.selected = id

    CHARACTER_IDS.forEach((candidate, index) => {
      const card = this.cards[index]
      if (card === undefined) return
      const isChosen = candidate === id

      // Three signals together, because one was not enough and four was noisy:
      // full opacity against a dimmed field, a slightly heavier ink stroke, and
      // an ink shadow that lifts the card off the paper. Colour is left alone -
      // the accent bar already encodes the character, and a coloured frame
      // competed with it.
      card.setAlpha(isChosen ? 1 : 0.42)
      card.setScale(isChosen ? 1.03 : 0.98)

      const border = this.borders.get(candidate)
      if (border !== undefined) border.setStrokeStyle(isChosen ? 3 : 2, 0x1a1a1a)

      const shadow = this.shadows.get(candidate)
      if (shadow !== undefined) shadow.setVisible(isChosen)
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
    const boxWidth = cardWidth * 0.46
    const boxHeight = cardHeight - 20
    const centerX = -cardWidth / 2 + boxWidth / 2 + 6
    const centerY = 0

    // Scale to *contain*, and only to contain. The chibi files ship at 202x360,
    // 360x202 and 360x360 while a portrait is 506x900, so any single aspect rule
    // has to cope with both. A cover rule crops whichever dimension is short; a
    // minimum-height clamp makes a square source wider than the box and the art
    // then bleeds over the card border. Contain is the only rule that cannot
    // overflow, and overflow is the failure a player actually notices.
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

    // Build the replacement before removing the incumbent. The earlier order
    // destroyed the old image first and then bailed out when the new texture was
    // not in the cache, which left the card with no art at all - the look simply
    // vanished and nothing put it back. A swap that cannot complete must leave
    // the card exactly as it was.
    const image = this.addLookImage(look, this.cardWidth, this.cardHeight)
    if (image === null) return

    const old = this.lookImages.get(id)
    if (old !== undefined) {
      card.remove(old)
      old.destroy()
    }

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
