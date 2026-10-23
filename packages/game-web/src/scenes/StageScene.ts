import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  type CharacterId,
  type InputState,
  loadProgress,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  recordClear,
  type StageDefinition,
  saveProgress,
  World,
} from '@contra/game-core'
import {
  type InputSource,
  KeyboardInputSource,
  LocalStorageAdapter,
  MIN_TOUCH_TARGET_PX,
  STICK_RADIUS_PX,
  TouchInputSource,
  wantsTouchControls,
} from '@contra/game-platform'
import Phaser from 'phaser'
import {
  ANIMATION_CLIPS,
  type AnimationClip,
  type AnimationState,
  CLIP_FRAME_RATE,
  clipLoops,
  FRAME_SIZE,
  sheetKey,
  stateFor,
} from '../assets/animated'
import { bossArtKey } from '../assets/bosses'
import { ENEMY_FRAME_SIZE, enemyFrameKey } from '../assets/enemies'
import { resolveLook } from '../assets/looks'
import { portraitUrl } from '../assets/manifest'
import { preloadStageScene, stageSceneLoaded } from '../assets/stages'
import { WEAPON_ICON_SIZE, weaponIconKey } from '../assets/weapons'
import { AudioManager } from '../audio/AudioManager'
import { sfxForEvent } from '../audio/eventSfx'
import { bgmForStage, preloadBgm } from '../audio/manifest'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config'
import { CoreEventBridge } from '../events/CoreEventBridge'
import { applyFit } from '../fit'
import { ProjectileView } from '../render/ProjectileView'
import { publishStageProbe } from '../StageProbe'
import { ActorView, characterSprite, enemySprite } from '../sprites/ActorView'
import { HURT_SECONDS, motionFor, RECOIL_SECONDS } from '../sprites/motion'
import { createParallax, updateParallax } from '../stage/createParallax'
import { isVerticalStage, nextStage, resolveStage, type StageRequest } from '../stage/resolveStage'
import { drawPlatform, groundVariantFor, preloadTerrain } from '../stage/terrain'

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
/**
 * How tall the character is drawn, in world pixels.
 *
 * Deliberately larger than the collision box (24x40). The world view is 540
 * tall, so a body-sized sprite read as a speck; 90px puts the character at
 * roughly one sixth of the screen height, which is where a side-scrolling
 * platformer normally sits.
 *
 * This is presentation only. The box stays 24x40 so the physics - gravity,
 * jump arc, and the 24px pillars the player has to fit through - are
 * unchanged, and so is every existing test.
 */
const DISPLAY_HEIGHT = 90
export class StageScene extends Phaser.Scene {
  private world!: World
  private stage!: StageDefinition
  private request: StageRequest = {}

  private readonly bridge = new CoreEventBridge({
    shot: (event) => {
      this.showMuzzleFlash(event.position.x, event.position.y)
      this.playEventSound(event)
      // Recoil is driven by the real shot event, not a timer (REQ-MOT-002).
      this.secondsSinceShot = 0
    },
    hit: (event) => {
      this.showImpact(event.position.x, event.position.y)
      this.playEventSound(event)
    },
    enemyDied: (event) => this.showImpact(event.position.x, event.position.y),
    playerHurt: (event) => {
      this.showBanner(`受创 · 剩余 ${event.heartsLeft}`)
      this.playEventSound(event)
      // The shake lasts as long as the hurt reaction, then stops (REQ-MOT-002).
      this.hurtSeconds = HURT_SECONDS
    },
    playerHealed: (event) => this.showBanner(`回血 · 剩余 ${event.heartsLeft}`),
    playerDied: (event) => {
      this.showBanner('推理中断')
      this.playEventSound(event)
    },
    weaponPicked: (event) => {
      this.showBanner(`拾取 ${event.weaponId}`)
      this.playEventSound(event)
    },
    explosion: (event) => {
      this.showBlast(event.position.x, event.position.y, event.radius)
      this.playEventSound(event)
    },
    bossTelegraph: (event) => {
      // The warning is what makes the move dodgeable. Without it the boss
      // simply takes a heart at a moment the player could not have read.
      this.showTelegraph(event.seconds)
    },
    bossAttack: (event) => {
      this.showBossAttack(event.position.x, event.position.y, event.hit)
    },
    bossPhaseChanged: (event) => {
      this.showBanner(`形态 ${event.phase}`)
      this.playEventSound(event)
    },
    stageCleared: (event) => {
      this.showCleared(event.score)
      this.playEventSound(event)
    },
  })

  private parallax: Phaser.GameObjects.TileSprite[] = []
  private audio: AudioManager | null = null
  private inputSource: InputSource | null = null
  /** Touch controls, when the device has a touchscreen. */
  private touch: TouchInputSource | null = null
  private stickKnob: Phaser.GameObjects.Arc | null = null
  /**
   * The wind-up band for the current boss move.
   *
   * Held because a second telegraph has to replace the first: two bands filling
   * at once would read as two simultaneous attacks.
   */
  private telegraphBar: Phaser.GameObjects.Rectangle | null = null
  private playerView: ActorView | null = null
  /** Seconds since the last shot, for the recoil (REQ-MOT-001). */
  private secondsSinceShot = 99
  /** Seconds left on the hurt reaction (REQ-MOT-002). */
  private hurtSeconds = 0
  /** The scale the character art was drawn at, so motion can multiply it. */
  private playerBaseScale = 1
  /** Last frame's horizontal offset, so it is applied as a delta not an add. */
  private lastMotionOffsetX = 0
  /** True while the mouse is over the canvas, gating free aim (REQ-GUN-002). */
  private pointerInside = false
  /** The character being played, resolved once in create(). */
  private character: CharacterId = 'deepseek'
  private readonly targetViews = new Map<string, ActorView>()
  private readonly bulletViews = new Map<string, ProjectileView>()
  private hud: Phaser.GameObjects.Text | null = null
  /** The current weapon's icon, redrawn when the weapon changes. */
  private weaponIcon: Phaser.GameObjects.Image | null = null
  /** The weapon the icon currently shows, so it is not redrawn every frame. */
  private weaponIconFor: string | null = null
  /** The weapon name label next to the icon. */
  private weaponLabel: Phaser.GameObjects.Text | null = null
  /** Controls reminder, shown for the first few seconds of a stage. */
  private keyHints: Phaser.GameObjects.Text | null = null
  /** When the stage started, so the reminder can time itself out. */
  private readonly createdAtMs = Date.now()
  /** Paper-toned backing plate behind the HUD text, redrawn with the camera. */
  private hudPlate: Phaser.GameObjects.Rectangle | null = null
  private banner: Phaser.GameObjects.Text | null = null
  private exitZone: Phaser.GameObjects.Rectangle | null = null
  private prevX = 0
  private prevY = 0
  private clearedEvents = 0
  private clearedAt = 0

  constructor() {
    super('Stage')
  }

  /**
   * Loads this stage's four backdrop layers.
   *
   * Runs before create, and only for the stage being entered. Preloading all
   * twelve at boot cost 18MB on the first load for art the player would not
   * see for minutes; loading on entry costs one stage's worth and happens
   * behind the scene transition.
   */
  preload(): void {
    const stage = resolveStage(this.request)
    const stageId = stage.id

    // This stage's track. Music used to load at boot, which meant downloading
    // twelve tracks to hear one - 21MB of the 24MB first load.
    const bossStage = stage.bossId !== undefined && stage.bossId !== null
    preloadBgm(this.load, bgmForStage(stage.index, bossStage))

    // Ground and platforms: three shared ground strips and one nine-slice, so
    // this is cheap and never varies by stage.
    preloadTerrain(this.load)

    if (stageSceneLoaded(this, stageId)) return

    // The scene urls are lazy imports, so the queue is built asynchronously and
    // the loader is started by hand once it is ready.
    void preloadStageScene(this.load, stageId).then(() => {
      if (!this.load.isLoading()) this.load.start()
    })
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
      // CharacterSelect always sends one; a direct stage launch may not, and
      // World has its own default for that case. Spread rather than pass
      // undefined, which exactOptionalPropertyTypes rejects.
      ...(this.request.characterId === undefined
        ? {}
        : { characterId: this.request.characterId as CharacterId }),
      // Boss stages name their boss in the stage data (T3). Only boss stages
      // have one, so the key is spread in rather than passed as undefined.
      ...(this.stage.bossId === undefined ? {} : { bossId: this.stage.bossId }),
    })
  }

  private clearEvents(): void {
    this.clearedEvents = 0
    this.clearedAt = 0
  }

  create(): void {
    applyFit(this)
    const vertical = isVerticalStage(this.stage)
    this.parallax = createParallax(this, this.stage.widthPx, this.stage.id)
    this.createBossPortrait()
    this.drawStage()
    this.createViews()
    // Audio first so the opening frame already has music.
    this.audio = new AudioManager(this)
    this.audio.playStageBgm(this.stage.index, this.stage.bossId !== undefined)

    // Keyboard always exists; touch is added on top when the device offers it,
    // because a laptop with a touchscreen should keep working on its keyboard.
    // Esc opens the pause overlay; the stage is paused, not stopped, so
    // resuming continues from this exact frame.
    this.registerAnimations(this.character)

    // Free aim only while the pointer is over the canvas (REQ-GUN-002).
    this.input.on('pointermove', () => {
      this.pointerInside = true
    })
    this.input.on('pointerout', () => {
      this.pointerInside = false
    })

    this.input.keyboard?.once('keydown-ESC', () => {
      // run, not launch: pause() first would leave launch with a sleeping
      // manager and the overlay never appears.
      this.scene.run('Pause')
      this.scene.pause()
    })

    this.inputSource = new KeyboardInputSource(window)
    // Touch controls only on a device that has no mouse. A laptop with a
    // touchscreen reports maxTouchPoints 10, and showing a virtual stick there
    // put a "跳/射/弹" cluster in the middle of a desktop screen.
    const hasMouse = window.matchMedia('(pointer: fine)').matches
    if (!hasMouse && wantsTouchControls(navigator.maxTouchPoints > 0, navigator.maxTouchPoints)) {
      this.touch = new TouchInputSource()
      this.createTouchControls()
    }

    // HUD positioning.
    //
    // setScrollFactor(0) is the usual way to pin a HUD, and in this scene it
    // draws nothing at all: with the camera zoomed to 2 and bounded to the
    // stage, a zero-scroll-factor object at (16, 12) is transformed outside the
    // visible area. Measured directly - three texts, only the one without
    // scrollFactor appeared.
    //
    // These follow the camera's world view instead, repositioned each frame in
    // updateHud, which keeps them on screen however the camera moves.
    // A backing plate behind the HUD.
    //
    // The HUD is ink-coloured, which works on the paper background this game is
    // built around - but the parallax layers are dark teal, and dark ink on dark
    // teal is unreadable. Rather than pick a text colour that survives every
    // backdrop (there isn't one: the layers range from near-white sky to
    // near-black foreground), the HUD gets its own surface, like a printed
    // caption over a photograph.
    this.hudPlate = this.add
      .rectangle(0, 0, 10, 10, 0xf4f1ea, 0.86)
      .setOrigin(0, 0)
      .setDepth(99)
      .setStrokeStyle(1, 0x1a1a1a, 0.25)

    this.hud = this.add
      .text(16, 12, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: PALETTE.hud,
      })
      .setDepth(100)

    // Weapon readout, top-left above the debug line.
    //
    // Bottom-left was the first attempt and it was invisible: the ground band
    // is nearly black and PALETTE.hud is a light ink, so the icon had nothing
    // to separate it from. The top strip is the paper background, which is what
    // the rest of the HUD already draws against.
    this.weaponIcon = this.add
      .image(24, 62, weaponIconKey('pulse'))
      .setDepth(100)
      .setScale(40 / WEAPON_ICON_SIZE)
      .setVisible(false)

    this.keyHints = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: PALETTE.inkMuted,
        align: 'left',
      })
      .setDepth(100)

    this.weaponLabel = this.add
      .text(50, 62, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: PALETTE.hud,
      })
      .setOrigin(0, 0.5)
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
      this.touch?.dispose()
      this.touch = null
      this.audio?.stopBgm()
      this.audio = null
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

    const events = this.world.update(delta / 1000, this.pollInput(source))
    this.bridge.consume(events)
    this.syncViews()
    this.applyMotion(delta / 1000)
    updateParallax(this.parallax, this.cameras.main.scrollX)
    this.updateHud()
  }

  /**
   * Registers the free character's animation clips.
   *
   * Phaser anims are global and keyed by name, so creating one twice throws.
   * The guard is what lets a stage be entered, left and re-entered.
   */
  private registerAnimations(character: CharacterId): void {
    for (const clip of ANIMATION_CLIPS) {
      const key = sheetKey(character, clip)
      if (this.anims.exists(key)) continue
      if (!this.textures.exists(key)) continue

      // The frame count comes from the texture, not a table: pack-sprites.py
      // writes a different number of frames per clip and the code should not
      // hold a second copy of that number that can disagree with the image.
      const total = this.textures.get(key).frameTotal
      if (total <= 1) continue

      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: total - 1 }),
        frameRate: CLIP_FRAME_RATE[clip],
        repeat: 0,
      })
    }
  }

  /**
   * Plays the clip the gameplay state calls for (REQ-GUN-001).
   *
   * The animation is driven by the same state the rules already compute - not by
   * a timer and not by its own state machine - so the character cannot be shown
   * attacking when no shot was fired.
   */
  private syncAnimation(state: AnimationState): void {
    const view = this.playerView
    if (view === null) return

    const anim = view.sprite as Phaser.GameObjects.Sprite
    if (typeof anim.play !== 'function') return

    // 'die' has no authored frames; the hurt clip held to its last frame is
    // the closest thing, and a character with zero hearts is not moving anyway.
    const clip: AnimationClip = state === 'die' ? 'hurt' : state
    const key = sheetKey(this.character, clip)
    if (!this.anims.exists(key)) return
    if (anim.anims.currentAnim?.key === key && anim.anims.isPlaying) return

    anim.play({ key, repeat: clipLoops(clip) ? -1 : 0 })
  }

  /**
   * Applies the procedural motion to the player sprite (REQ-MOT-001).
   *
   * The offset and the scale come from motionFor, which is pure: this method
   * only reads the clock and the state, never writes to the World. The rule
   * layer does not learn that animation exists.
   */
  private applyMotion(dt: number): void {
    const view = this.playerView
    if (view === null) return

    this.secondsSinceShot += dt
    this.hurtSeconds = Math.max(0, this.hurtSeconds - dt)

    const input = this.pollInput(this.inputSource as InputSource)

    // The clip follows the same state the rules compute (REQ-GUN-001).
    this.syncAnimation(
      stateFor({
        moveX: input.moveX,
        // The trigger being held, not the recoil window: recoil lasts 0.12s and
        // would make the attack frame flash for a single frame.
        firing: input.fire,
        inAir: !this.world.player.onGround,
        hurt: this.hurtSeconds > 0,
        hearts: this.world.player.hearts,
      }),
    )

    const frame = motionFor(
      this.time.now / 1000,
      {
        moveX: input.moveX,
        firing: this.secondsSinceShot < RECOIL_SECONDS,
        hurtSeconds: this.hurtSeconds,
      },
      this.secondsSinceShot,
    )

    const sprite = view.sprite as Phaser.GameObjects.Sprite
    if (typeof sprite.setScale !== 'function') return

    sprite.setScale(this.playerBaseScale * frame.scaleX, this.playerBaseScale * frame.scaleY)
    sprite.setRotation(frame.rotation)
    sprite.x += frame.offsetX - this.lastMotionOffsetX
    this.lastMotionOffsetX = frame.offsetX
  }

  /** Persists the clear, then hands off to the result screen. */
  private leaveStage(): void {
    const storage = LocalStorageAdapter.fromGlobal()
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
    const groundVariant = groundVariantFor(this.stage.index ?? 1)
    for (const platform of this.stage.platforms) {
      drawPlatform(this, platform, groundVariant, PALETTE.platform)
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
    this.character = character
    // The look the player chose on the select screen (REQ-VAR-001). Falls back
    // to the painted portrait when the id names an image that is not loaded.
    const look = resolveLook(character, this.request.lookId, portraitUrl(character))
    // The portrait is the real artwork; the 48px generated sheet is a
    // placeholder. In-game the portrait is drawn scaled into the collision box,
    // which leaves the rule layer's 34x48 body untouched - the art follows the
    // physics, not the other way round.
    // A character that has animation frames is drawn as an animated sprite; the
    // others are a single illustration. The clip is picked from the same state
    // the rules compute, so the character attacks exactly when a shot fires.
    // A character with generated frames is drawn as an animated sprite; the
    // portrait is the fallback for one that has none. This is what decides
    // whether the player walks and shoots or slides around as a still image.
    const idleKey = sheetKey(character, 'idle')
    const useAnimated = this.textures.exists(idleKey)

    const portraitKey = useAnimated ? idleKey : look.textureKey
    if (this.textures.exists(portraitKey)) {
      const source = useAnimated
        ? { width: FRAME_SIZE, height: FRAME_SIZE }
        : this.textures.get(portraitKey).getSourceImage()
      // The art is drawn taller than the collision box on purpose.
      //
      // The rule layer's body is 24x40 and the world is 960x540. Drawn at body
      // size the character was 48px in a 540px tall view, which read as a
      // distant speck rather than the thing you are controlling. The sprite is
      // therefore drawn at DISPLAY_HEIGHT and anchored at the feet, so it looks
      // right without touching the physics: the box stays 24x40, and the level
      // geometry - which includes 24px pillars the player squeezes past - is
      // unaffected.
      const scale = useAnimated
        ? DISPLAY_HEIGHT / source.height
        : Math.min(58 / source.height, 42 / source.width)
      this.playerView = new ActorView(this, portraitKey, spawn.x, spawn.y, 20, 34, 48)
      this.playerView.sprite.setOrigin(0.5, 1)
      this.playerView.sprite.setScale(scale)
      // Remembered so the motion can multiply it rather than overwrite it.
      this.playerBaseScale = scale

      // No mask. This sprite used to be clipped to a rectangle drawn at the spawn
      // point, because the painted portraits were opaque illustrations with a
      // white background that had to be cropped to the character's bounds.
      //
      // The action frames are real RGBA with a transparent background, so there
      // is nothing to crop - and the mask was actively harmful: it is anchored
      // in world space, so once the player walked away from the spawn point the
      // mask no longer covered the sprite and the character was clipped out of
      // existence while still reporting visible, in the right place, on the
      // ground.
    } else {
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
    }

    for (const target of this.stage.targets) {
      // The archetype is declared by the stage data, not parsed out of the id:
      // ids run t1, t2, t3 in act 1 and mirror-1 in act 3, so splitting on '-'
      // picked the wrong enemy or none at all. A target with no archetype is a
      // plain destructible box and keeps the placeholder.
      const archetype = target.archetype

      // Generated art when it exists, the procedural placeholder otherwise. The
      // sprite is scaled to the target's own collision box, so a drone and a
      // charger are drawn at the size the rules actually give them rather than
      // at one size that fits neither.
      const artKey = archetype === undefined ? undefined : enemyFrameKey(archetype, 'idle')
      const hasArt = artKey !== undefined && this.textures.exists(artKey)
      const texture = hasArt && artKey !== undefined ? artKey : enemySprite(archetype ?? 'patrol')
      const view = new ActorView(this, texture, target.x, target.y, 15, 32, 32)

      if (hasArt) {
        // Stage targets carry their size flat (x/y/width/height), not in a box -
        // that shape only exists on the rule-layer state.
        view.sprite.setOrigin(0.5, 1)
        view.sprite.setScale(target.height / ENEMY_FRAME_SIZE)
      } else {
        view.sprite.setScale(1.2)
      }
      this.targetViews.set(target.id, view)
    }
  }
  /** The whole one-way sync: read the rule layer, write the renderer. */
  private syncViews(): void {
    const alpha = Math.min(1, this.world.pendingTime / this.world.fixedStepSeconds)
    const player = this.world.player.position
    // The rule layer's position is the top-left of the 24x40 collision box; the
    // sprite is anchored at its own bottom-centre. Passing y straight through
    // drew the character's feet 40px above the floor - exactly the box height -
    // and the gap was visible as the character standing in the air.
    //
    // The sprite is also wider than the box: it is drawn at DISPLAY_HEIGHT with
    // the frame's aspect ratio, so it is centred on the box rather than aligned
    // to its left edge.
    this.playerView?.sync(
      Phaser.Math.Linear(this.prevX, player.x, alpha) + PLAYER_WIDTH / 2,
      Phaser.Math.Linear(this.prevY, player.y, alpha) + PLAYER_HEIGHT,
    )

    for (const target of this.world.targets) {
      const view = this.targetViews.get(target.id)
      if (view === undefined) continue
      // Same correction the player needed: the rule layer's y is the top of the
      // box, the sprite is anchored at its bottom-centre. Passing y straight
      // through left every enemy standing 40px above the floor - the box height
      // again, and it read as enemies hovering rather than standing.
      view.sync(target.box.x + target.box.width / 2, target.box.y + target.box.height)
      view.setVisible(target.alive)
      view.setTint(target.alive ? null : PALETTE.targetDead)
    }

    const live = new Set<string>()
    for (const bullet of this.world.bullets) {
      live.add(bullet.id)
      let view = this.bulletViews.get(bullet.id)
      if (view === undefined) {
        view = new ProjectileView(
          this,
          bullet.weaponId,
          bullet.position.x,
          bullet.position.y,
          BULLET_WIDTH,
          BULLET_HEIGHT,
        )
        this.bulletViews.set(bullet.id, view)
      }
      view.sync(bullet.position.x, bullet.position.y, BULLET_WIDTH, BULLET_HEIGHT)
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
    const impact = this.add.rectangle(x, y, 10, 10, PALETTE.alertFill, 0.85).setDepth(18)
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
    const blast = this.add.circle(x, y, radius, PALETTE.alertFill, 0.35).setDepth(17)
    this.tweens.add({
      targets: blast,
      alpha: 0,
      scale: 1.2,
      duration: 240,
      onComplete: () => blast.destroy(),
    })
  }

  /** One-line notice in the banner slot, cleared after a moment. */
  /**
   * Shows the boss wind-up.
   *
   * Drawn as a band across the top of the play area rather than at the boss,
   * because the boss has no sprite in the world - the arena is the target. The
   * band's fill takes the length of the telegraph, so the player can read the
   * remaining time off it instead of counting.
   */
  private showTelegraph(seconds: number): void {
    if (this.telegraphBar !== null) {
      this.telegraphBar.destroy()
      this.telegraphBar = null
    }
    const view = this.cameras.main.worldView
    const bar = this.add
      .rectangle(view.x + 20, view.y + 70, view.width - 40, 6, PALETTE.alertFill, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(98)
    bar.setScale(0, 1)
    this.telegraphBar = bar

    this.tweens.add({
      targets: bar,
      scaleX: 1,
      duration: Math.max(120, seconds * 1000),
      onComplete: () => {
        bar.destroy()
        if (this.telegraphBar === bar) this.telegraphBar = null
      },
    })
  }

  /** Plays a boss move: a flash when it lands, nothing when the player dodged. */
  private showBossAttack(x: number, y: number, hit: boolean): void {
    if (!hit) return
    const flash = this.add.circle(x, y, 90, PALETTE.alertFill, 0.45).setDepth(18)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 320,
      onComplete: () => flash.destroy(),
    })
    this.cameras.main.shake(160, 0.012)
  }

  private showBanner(text: string): void {
    if (this.banner === null) return
    this.banner.setText(text)
    this.time.delayedCall(900, () => {
      if (this.banner?.text === text && !this.world.clearedStage) this.banner.setText('')
    })
  }

  /**
   * Merges the device inputs into one state.
   *
   * Keyboard and touch are added rather than switched between, because on a
   * touchscreen laptop both are live at once and a player reaching for the
   * stick should not have their keyboard go dead. Values are clamped so holding
   * a key and dragging the stick the same way does not double the speed - the
   * axis saturates at one, which is what InputState means.
   */
  private pollInput(keyboard: InputSource): InputState {
    const base = keyboard.poll()
    const touch = this.touch?.poll()

    const clamp = (value: number) => Math.max(-1, Math.min(1, value))
    const merged: InputState =
      touch === undefined
        ? base
        : {
            ...base,
            moveX: clamp(base.moveX + touch.moveX) as InputState['moveX'],
            moveY: clamp(base.moveY + touch.moveY) as InputState['moveY'],
            jump: base.jump || touch.jump,
            fire: base.fire || touch.fire,
            bomb: base.bomb || touch.bomb,
          }

    // Mouse aim (REQ-GUN-002). The pointer's offset from the character is a
    // direction, and passing it through lets a player shoot between the eight
    // directions. Only when the pointer is actually over the canvas: a mouse
    // parked outside the window should not silently aim somewhere.
    const pointer = this.input.activePointer
    if (this.pointerInside && this.playerView !== null) {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const origin = this.world.player.position
      const dx = world.x - origin.x
      const dy = world.y - origin.y
      if (Math.hypot(dx, dy) > 8) return { ...merged, aim: { x: dx, y: dy } }
    }

    return merged
  }

  /** Plays whatever the event maps to; silent events map to null. */
  private playEventSound(event: Parameters<typeof sfxForEvent>[0]): void {
    const key = sfxForEvent(event)
    if (key !== null) this.audio?.playSfx(key)
  }

  /**
   * Draws the virtual stick and the three action buttons (T-M5-01).
   *
   * Drawn with Phaser rather than DOM so the controls live in the same camera
   * space as the game and scale with it. Every element is at least
   * MIN_TOUCH_TARGET_PX across; the stick has a wider invisible hit area than
   * its visible circle, because a thumb does not aim.
   */
  private createTouchControls(): void {
    const stickX = 96
    const stickY = GAME_HEIGHT - 96

    this.add
      .circle(stickX, stickY, STICK_RADIUS_PX, PALETTE.hud as unknown as number, 0.15)
      .setScrollFactor(0)
      .setDepth(200)
    this.stickKnob = this.add
      .circle(stickX, stickY, 18, PALETTE.alert as unknown as number, 0.35)
      .setScrollFactor(0)
      .setDepth(201)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < GAME_WIDTH / 2) {
        this.touch?.setStick({ x: stickX, y: stickY }, { x: pointer.x, y: pointer.y })
        this.stickKnob?.setPosition(pointer.x, pointer.y)
      }
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || pointer.x >= GAME_WIDTH / 2) return
      this.touch?.setStick({ x: stickX, y: stickY }, { x: pointer.x, y: pointer.y })
      this.stickKnob?.setPosition(pointer.x, pointer.y)
    })
    this.input.on('pointerup', () => {
      this.touch?.clearStick()
      this.stickKnob?.setPosition(stickX, stickY)
    })

    const buttons: { id: 'fire' | 'jump' | 'bomb'; label: string; x: number; y: number }[] = [
      { id: 'fire', label: '射', x: GAME_WIDTH - 190, y: GAME_HEIGHT - 110 },
      { id: 'jump', label: '跳', x: GAME_WIDTH - 110, y: GAME_HEIGHT - 150 },
      { id: 'bomb', label: '弹', x: GAME_WIDTH - 90, y: GAME_HEIGHT - 70 },
    ]

    for (const button of buttons) {
      const zone = this.add
        .circle(
          button.x,
          button.y,
          MIN_TOUCH_TARGET_PX / 2,
          PALETTE.exit as unknown as number,
          0.25,
        )
        .setScrollFactor(0)
        .setDepth(200)
        .setInteractive()
      this.add
        .text(button.x, button.y, button.label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: PALETTE.hud,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201)

      zone.on('pointerdown', () => this.touch?.press(button.id))
      zone.on('pointerup', () => this.touch?.release(button.id))
      zone.on('pointerout', () => this.touch?.release(button.id))
    }
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

    // Anchored to the camera's view, not the world origin.
    const view = this.cameras.main.worldView
    const x = view.x + 8
    const y = view.y + 6

    // The plate sizes itself to the widest line so it never outgrows the content
    // or leaves a text hanging over its edge.
    if (this.hudPlate !== null) {
      const widest = Math.max(
        this.hud.width,
        this.weaponLabel?.width ?? 0,
        this.keyHints?.width ?? 0,
      )
      const bottom = this.keyHints !== null ? y + 72 : y + 32
      this.hudPlate.setPosition(x, y - 6)
      this.hudPlate.setSize(Math.max(120, widest + 24), bottom - (y - 6))
    }
    this.hud.setPosition(x, y)
    this.weaponIcon?.setPosition(x + 22, y + 28)
    this.weaponLabel?.setPosition(x + 46, y + 28)
    this.keyHints?.setPosition(x + 8, y + 52)

    // Shown for the first eight seconds, then removed: a permanent cheat-sheet
    // is clutter, but a stage with no on-screen controls leaves a new player
    // guessing which key jumps. Faded rather than cut so it does not blink out.
    if (this.keyHints !== null) {
      const shownFor = (this.time.now - this.createdAtMs) / 1000
      if (shownFor > 10) {
        this.keyHints.destroy()
        this.keyHints = null
      } else if (shownFor > 8) {
        this.keyHints.setAlpha(Math.max(0, 1 - (shownFor - 8) / 2))
        this.keyHints.setText(this.controlsText())
      } else {
        this.keyHints.setText(this.controlsText())
      }
    }

    const fps = this.game.loop.actualFps
    const status = this.world.clearedStage ? 'CLEARED' : 'RUN'
    this.hud.setText(
      `FPS ${fps.toFixed(1)}  ·  ${status}  ·  x=${this.world.player.position.x.toFixed(0)}  ·  score=${this.world.currentScore}`,
    )
    this.syncWeaponHud()
  }

  /** The controls reminder, spelled from the actual bindings. */
  private controlsText(): string {
    return '← → 移动 · ↑ ↓ 瞄准 · Space 跳 · J 射击 · K 炸弹 · Esc 暂停'
  }

  /**
   * Places the boss portrait for a stage that has a boss (T-M6-22).
   *
   * It sits behind the play area and follows the camera horizontally, so the
   * fight happens in front of the character it is about. A stage without a boss
   * never creates one, and a boss without a portrait is skipped rather than
   * leaving an empty frame.
   */
  private createBossPortrait(): void {
    const bossId = this.stage.bossId
    if (bossId === undefined) return

    const key = bossArtKey(bossId)
    if (!this.textures.exists(key)) return

    const source = this.textures.get(key).getSourceImage()
    const view = this.cameras.main.worldView

    // Anchored at the ground line, not at the bottom of the view: the floor is
    // a solid band across the lower third, and a portrait anchored to the view
    // had its legs hidden behind it and its head cut by the top.
    //
    // Sized to 62% of the visible height so the character reads as backdrop -
    // present, but clearly not something the player collides with.
    const height = GAME_HEIGHT * 0.62
    this.add
      .image(view.x + GAME_WIDTH * 0.72, view.y + GAME_HEIGHT * 0.78, key)
      .setOrigin(0.5, 1)
      .setDepth(-50)
      .setScale(height / source.height)
  }

  /**
   * Shows the weapon currently in hand (T-M6-21).
   *
   * Read from the rule layer's active slot rather than tracked here, so the
   * icon cannot disagree with what actually fires. The redraw is skipped while
   * the id is unchanged - swapping a texture every frame would be wasteful and
   * would restart the image each time.
   */
  private syncWeaponHud(): void {
    const slots = this.world.player.weaponSlots
    const active = slots[this.world.player.activeSlot]
    const weaponId = active?.weaponId ?? null
    if (weaponId === this.weaponIconFor) return
    this.weaponIconFor = weaponId

    if (weaponId === null) {
      this.weaponIcon?.setVisible(false)
      this.weaponLabel?.setVisible(false)
      return
    }

    const key = weaponIconKey(weaponId)
    if (!this.textures.exists(key)) {
      this.weaponIcon?.setVisible(false)
      this.weaponLabel?.setText(weaponId)
      return
    }

    this.weaponIcon?.setTexture(key).setVisible(true)
    this.weaponLabel?.setText(weaponId)
  }
}
