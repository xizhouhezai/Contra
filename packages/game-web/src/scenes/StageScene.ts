import { GRAYBOX_STAGE } from '@contra/game-core'
import { KeyboardInputSource } from '@contra/game-platform'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, TEXTURES } from '../config'
import { CoreEventBridge } from '../events/CoreEventBridge'
import { publishStageProbe } from '../StageProbe'
import { ActorView } from '../sprites/ActorView'
import { createGrayboxWorld } from '../stage/createGrayboxWorld'

/**
 * The gray-box stage (T-M0-06 / T-M0-07).
 *
 * This scene owns the only rendering code in the repository: it drives the
 * rule-layer World with a fixed step, then copies entity boxes onto sprites.
 * State flows one way — World to sprite — and the sprite never writes back
 * (docs/game/design/modules.md §表现层模块).
 */
export class StageScene extends Phaser.Scene {
  private readonly world = createGrayboxWorld()

  private readonly bridge = new CoreEventBridge({
    shot: (event) => this.showMuzzleFlash(event.position.x, event.position.y),
    stageCleared: (event) => this.showCleared(event.score),
  })

  private inputSource: KeyboardInputSource | null = null
  private playerView: ActorView | null = null
  private readonly targetViews = new Map<string, ActorView>()
  private readonly bulletViews = new Map<string, ActorView>()
  private hud: Phaser.GameObjects.Text | null = null
  private banner: Phaser.GameObjects.Text | null = null
  private exitZone: Phaser.GameObjects.Rectangle | null = null
  private prevX = GRAYBOX_STAGE.spawn.x
  private prevY = GRAYBOX_STAGE.spawn.y
  private clearedEvents = 0

  constructor() {
    super('StageScene')
  }

  create(): void {
    this.drawStage()
    this.createViews()
    this.inputSource = new KeyboardInputSource(window)

    this.hud = this.add
      .text(16, 12, '', { fontFamily: 'monospace', fontSize: '14px', color: PALETTE.hud })
      .setScrollFactor(0)
      .setDepth(100)

    this.banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    const camera = this.cameras.main
    camera.setBounds(0, 0, GRAYBOX_STAGE.widthPx, GRAYBOX_STAGE.heightPx)
    if (this.playerView !== null) camera.startFollow(this.playerView.sprite, true, 0.2, 0.2)

    publishStageProbe(() => ({
      scene: 'StageScene',
      steps: this.world.steps,
      cleared: this.world.clearedStage,
      score: this.world.currentScore,
      playerX: this.world.player.position.x,
      stageClearedEvents: this.clearedEvents,
      fps: this.game.loop.actualFps,
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      publishStageProbe(null)
      this.inputSource?.dispose()
      this.inputSource = null
    })
  }

  override update(_time: number, delta: number): void {
    const source = this.inputSource
    if (source === null) return

    const before = this.world.player.position
    this.prevX = before.x
    this.prevY = before.y

    const events = this.world.update(delta / 1000, source.poll())
    this.bridge.consume(events)
    this.syncViews()
    this.updateHud()
  }

  /** Floor, planks and the exit marker, drawn once from the stage definition. */
  private drawStage(): void {
    for (const platform of GRAYBOX_STAGE.platforms) {
      this.add
        .rectangle(platform.x, platform.y, platform.width, platform.height, PALETTE.platform)
        .setOrigin(0, 0)
        .setDepth(1)
    }

    const exit = GRAYBOX_STAGE.exit
    this.exitZone = this.add
      .rectangle(exit.x, exit.y, exit.width, exit.height, PALETTE.exit, 0.35)
      .setOrigin(0, 0)
      .setDepth(2)

    this.add
      .text(exit.x + exit.width / 2, exit.y - 16, 'EXIT', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: PALETTE.alert,
      })
      .setOrigin(0.5)
      .setDepth(2)
  }

  private createViews(): void {
    const spawn = GRAYBOX_STAGE.spawn
    this.playerView = new ActorView(this, TEXTURES.player, spawn.x, spawn.y, 20)

    for (const target of GRAYBOX_STAGE.targets) {
      this.targetViews.set(target.id, new ActorView(this, TEXTURES.target, target.x, target.y, 15))
    }
  }

  /** The whole one-way sync: read the rule layer, write the renderer. */
  private syncViews(): void {
    const alpha = Math.min(1, this.world.pendingTime / this.world.fixedStepSeconds)
    const player = this.world.player.position
    this.playerView?.sync(
      Phaser.Math.Linear(this.prevX, player.x, alpha),
      Phaser.Math.Linear(this.prevY, player.y, alpha),
    )

    for (const target of this.world.targets) {
      const view = this.targetViews.get(target.id)
      if (view === undefined) continue
      view.sync(target.box.x, target.box.y)
      view.setVisible(target.alive)
      view.setTint(target.alive ? null : PALETTE.targetDead)
    }

    const live = new Set<string>()
    for (const bullet of this.world.bullets) {
      live.add(bullet.id)
      let view = this.bulletViews.get(bullet.id)
      if (view === undefined) {
        view = new ActorView(this, TEXTURES.bullet, bullet.position.x, bullet.position.y, 18)
        this.bulletViews.set(bullet.id, view)
      }
      view.sync(bullet.position.x, bullet.position.y)
    }
    for (const [id, view] of this.bulletViews) {
      if (live.has(id)) continue
      view.destroy()
      this.bulletViews.delete(id)
    }
  }

  private showMuzzleFlash(x: number, y: number): void {
    const flash = this.add.rectangle(x, y, 16, 16, PALETTE.bullet, 0.9).setDepth(19)
    this.tweens.add({ targets: flash, alpha: 0, duration: 80, onComplete: () => flash.destroy() })
  }

  private showCleared(score: number): void {
    this.clearedEvents += 1
    this.banner?.setText(`STAGE CLEARED  ·  ${score} pts`)
    this.exitZone?.setFillStyle(PALETTE.exitCleared, 0.6)
    console.info(`[contra] stageCleared score=${score}`)
  }

  private updateHud(): void {
    if (this.hud === null) return
    const fps = this.game.loop.actualFps
    const status = this.world.clearedStage ? 'CLEARED' : 'RUN'
    this.hud.setText(
      `FPS ${fps.toFixed(1)}  ·  ${status}  ·  x=${this.world.player.position.x.toFixed(0)}  ·  score=${this.world.currentScore}`,
    )
  }
}
