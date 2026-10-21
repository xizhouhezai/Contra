import {
  type CharacterId,
  loadProgress,
  recordClear,
  type StageDefinition,
  saveProgress,
  World,
} from '@contra/game-core'
import { KeyboardInputSource, LocalStorageAdapter } from '@contra/game-platform'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, TEXTURES } from '../config'
import { CoreEventBridge } from '../events/CoreEventBridge'
import { publishStageProbe } from '../StageProbe'
import { ActorView, characterSprite, enemySprite } from '../sprites/ActorView'
import { createParallax, updateParallax } from '../stage/createParallax'
import { isVerticalStage, nextStage, resolveStage, type StageRequest } from '../stage/resolveStage'

/**
 * Plays one stage from the campaign (T1).
 *
 * The scene owns the only rendering code in the repository: it drives the
 * rule-layer World with a fixed step, then copies entity boxes onto sprites.
 * State flows one way - World to sprite - and the sprite never writes back.
 *
 * Which stage it plays comes from the init data, not from a constant, so all
 * twelve stages run through this one scene (docs/game/design/modules.md).
 */
export class StageScene extends Phaser.Scene {
  private world!: World
  private stage!: StageDefinition
  private request: StageRequest = {}

  private readonly bridge = new CoreEventBridge({
    shot: (event) => this.showMuzzleFlash(event.position.x, event.position.y),
    hit: (event) => this.showImpact(event.position.x, event.position.y),
    enemyDied: (event) => this.showImpact(event.position.x, event.position.y),
    playerHurt: (event) => this.showBanner(`受创 · 剩余 ${event.heartsLeft}`),
    playerDied: () => this.showBanner('推理中断'),
    weaponPicked: (event) => this.showBanner(`拾取 ${event.weaponId}`),
    explosion: (event) => this.showBlast(event.position.x, event.position.y, event.radius),
    bossPhaseChanged: (event) => this.showBanner(`形态 ${event.phase}`),
    stageCleared: (event) => this.showCleared(event.score),
  })

  private parallax: Phaser.GameObjects.TileSprite[] = []
  private inputSource: KeyboardInputSource | null = null
  private playerView: ActorView | null = null
  private readonly targetViews = new Map<string, ActorView>()
  private readonly bulletViews = new Map<string, ActorView>()
  private hud: Phaser.GameObjects.Text | null = null
  private banner: Phaser.GameObjects.Text | null = null
  private exitZone: Phaser.GameObjects.Rectangle | null = null
  private prevX = 0
  private prevY = 0
  private clearedEvents = 0
  private clearedAt = 0

  constructor() {
    super('Stage')
  }

  init(data: StageRequest): void {
    this.request = data ?? {}
    this.stage = resolveStage(this.request)
    // Reset per-run state: Phaser reuses the scene instance across stages.
    this.targetViews.clear()
    this.bulletViews.clear()
    this.playerView = null
    this.clearEvents()

    this.world = new World({
      spawn: this.stage.spawn,
      platforms: this.stage.platforms,
      targets: this.stage.targets,
      exit: this.stage.exit,
      characterId: this.request.characterId as never,
    })
  }

  private clearEvents(): void {
    this.clearedEvents = 0
    this.clearedAt = 0
  }

  create(): void {
    const vertical = isVerticalStage(this.stage)
    this.parallax = createParallax(this, this.stage.widthPx)
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

    this.add
      .text(GAME_WIDTH / 2, 36, `第 ${this.stage.index} 关 · ${this.stage.name}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: PALETTE.hud,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    const camera = this.cameras.main
    camera.setBounds(0, 0, this.stage.widthPx, this.stage.heightPx)
    if (this.playerView !== null) {
      camera.startFollow(this.playerView.sprite, true, 0.2, 0.2)
      // A vertical stage follows down the shaft rather than across it.
      if (vertical) camera.centerOn(this.stage.spawn.x, this.stage.spawn.y)
    }

    publishStageProbe(() => ({
      scene: 'Stage',
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

    // Hold the result screen for a beat before leaving the stage.
    if (this.clearedAt > 0) {
      if (_time - this.clearedAt > 1200) this.leaveStage()
      return
    }

    const before = this.world.player.position
    this.prevX = before.x
    this.prevY = before.y

    const events = this.world.update(delta / 1000, source.poll())
    this.bridge.consume(events)
    this.syncViews()
    updateParallax(this.parallax, this.cameras.main.scrollX)
    this.updateHud()
  }

  /** Persists the clear, then hands off to the result screen. */
  private leaveStage(): void {
    const storage = new LocalStorageAdapter()
    const ids = [this.stage.id]
    const progress = loadProgress(storage, ids)
    const next = nextStage(this.stage)
    saveProgress(
      storage,
      recordClear(
        progress,
        this.stage.id,
        this.world.currentScore,
        next?.index ?? this.stage.index,
      ),
    )

    this.scene.start('Result', {
      score: this.world.currentScore,
      accuracy: 1,
      elapsedSeconds: this.world.steps / 60,
      timeTargetSeconds: this.stage.timeTargetSeconds,
      stageId: this.stage.id,
    })
  }

  /** Platforms and the exit marker, drawn once from the stage definition. */
  private drawStage(): void {
    for (const platform of this.stage.platforms) {
      this.add
        .rectangle(platform.x, platform.y, platform.width, platform.height, PALETTE.platform)
        .setOrigin(0, 0)
        .setDepth(1)
    }

    const exit = this.stage.exit
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
    const spawn = this.stage.spawn
    this.prevX = spawn.x
    this.prevY = spawn.y
    // Real sprite sheet when the art shipped, grey box when it did not.
    const character: CharacterId = (this.request.characterId as CharacterId) ?? 'deepseek'
    this.playerView = new ActorView(
      this,
      characterSprite(character, 'idle'),
      spawn.x,
      spawn.y,
      20,
      34,
      48,
    )
    this.playerView.sprite.setScale(1.4)

    for (const target of this.stage.targets) {
      // Target ids are archetype-prefixed (charger-1, flyer-2), so the sheet is
      // chosen from the prefix and falls back to the patrol sheet.
      const archetype = target.id.split('-')[0] ?? 'patrol'
      const view = new ActorView(this, enemySprite(archetype), target.x, target.y, 15, 32, 32)
      view.sprite.setScale(1.2)
      this.targetViews.set(target.id, view)
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

  /** Short-lived square at a hit point; used for both damage and deaths. */
  private showImpact(x: number, y: number): void {
    const impact = this.add.rectangle(x, y, 10, 10, PALETTE.alert, 0.85).setDepth(18)
    this.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.8,
      duration: 120,
      onComplete: () => impact.destroy(),
    })
  }

  /** A blast ring sized by the radius the rule layer reported. */
  private showBlast(x: number, y: number, radius: number): void {
    const blast = this.add.circle(x, y, radius, PALETTE.alert, 0.35).setDepth(17)
    this.tweens.add({
      targets: blast,
      alpha: 0,
      scale: 1.2,
      duration: 240,
      onComplete: () => blast.destroy(),
    })
  }

  /** One-line notice in the banner slot, cleared after a moment. */
  private showBanner(text: string): void {
    if (this.banner === null) return
    this.banner.setText(text)
    this.time.delayedCall(900, () => {
      if (this.banner?.text === text && !this.world.clearedStage) this.banner.setText('')
    })
  }

  private showCleared(score: number): void {
    this.clearedEvents += 1
    this.clearedAt = this.time.now
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
