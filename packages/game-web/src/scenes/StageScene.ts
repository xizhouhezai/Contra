import type { TargetDefinition, TargetState } from '@contra/game-core'
import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  type CharacterId,
  type FightId,
  type InputState,
  loadProgress,
  MINIBOSS_IDS,
  MINIBOSSES,
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
import {
  bossArtKey,
  bossArtPreference,
  minibossFrameCount,
  minibossFrameKey,
  preloadMiniboss,
} from '../assets/bosses'
import {
  bossEffectForMove,
  bossEffectKey,
  effectKey,
  hasEffect,
  hasWaveWarning,
  muzzleForWeapon,
  preloadUi,
  waveWarningKey,
} from '../assets/effects'
import { ENEMY_ART_DRAWN_PX, ENEMY_FRAME_SIZE, enemyFrameKey } from '../assets/enemies'
import { hasEnemyProp, mountProp, PROP_OFFSET } from '../assets/enemyProps'
import { resolveLook } from '../assets/looks'
import { portraitUrl } from '../assets/manifest'
import { preloadStageScene, stageSceneLoaded } from '../assets/stages'
import { WEAPON_ICON_SIZE, weaponIconKey } from '../assets/weapons'
import { AudioManager } from '../audio/AudioManager'
import { sfxForEvent } from '../audio/eventSfx'
import { bgmForStage, preloadBgm } from '../audio/manifest'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, UI } from '../config'
import { CoreEventBridge } from '../events/CoreEventBridge'
import { applyFit } from '../fit'
import { ProjectileView } from '../render/ProjectileView'
import { publishStageProbe } from '../StageProbe'
import { ActorView, characterSprite, enemySprite } from '../sprites/ActorView'
import { HURT_SECONDS, motionFor, RECOIL_SECONDS } from '../sprites/motion'
import { createParallax, updateParallax } from '../stage/createParallax'
import { isVerticalStage, nextStage, resolveStage, type StageRequest } from '../stage/resolveStage'
import {
  drawAct1Platform,
  drawPlatform,
  groundVariantFor,
  preloadAct1Tiles,
  preloadTerrain,
  usesAct1Kit,
} from '../stage/terrain'

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

/**
 * Crimson wash for a boss that changed phase without changing form.
 *
 * art-style.md §5 assigns 改写者 and 涌现 a colour offset rather than a second
 * illustration, so a phase change with no new portrait is carried by tint. It
 * is the alert red the rest of the game already uses for danger.
 */
const BOSS_PHASE_TINT = 0xd6452c

/**
 * Display names for the act I mid-stage fights.
 *
 * Read from the rules layer's own definitions rather than retyped here: the name
 * a banner shows and the name the definition carries have to be the same string,
 * and a second copy is how they stop being.
 */
const MINIBOSS_TITLE: Readonly<Record<string, string>> = Object.fromEntries(
  MINIBOSS_IDS.map((id) => [id, MINIBOSSES[id].name]),
)

export class StageScene extends Phaser.Scene {
  private world!: World
  private stage!: StageDefinition
  private request: StageRequest = {}

  private readonly bridge = new CoreEventBridge({
    shot: (event) => {
      this.showMuzzleFlash(event.position.x, event.position.y, event.weaponId, 'player')
      this.playEventSound(event)
      // Recoil is driven by the real shot event, not a timer (REQ-MOT-002).
      this.secondsSinceShot = 0
    },
    hit: (event) => {
      this.showImpact(event.position.x, event.position.y, event.damage)
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
      // The world stops advancing on the next step; the prompt is what the
      // player needs next, so it goes up in the same frame as the banner.
      this.beginRetryWindow()
    },
    weaponPicked: (event) => {
      this.showBanner(`拾取 ${event.weaponId}`)
      this.playEventSound(event)
    },
    explosion: (event) => {
      this.showBlast(event.position.x, event.position.y, event.radius)
      this.playEventSound(event)
    },
    enemyTelegraph: (event) => {
      this.showEnemyTelegraph(event.position.x, event.position.y, event.seconds)
    },
    enemyShot: (event) => {
      this.showMuzzleFlash(event.position.x, event.position.y, event.weaponId, 'enemy')
    },
    bossTelegraph: (event) => {
      // The warning is what makes the move dodgeable. Without it the boss
      // simply takes a heart at a moment the player could not have read.
      this.showTelegraph(event.seconds)
    },
    bossAttack: (event) => {
      this.showBossAttack(event.position.x, event.position.y, event.hit, event.moveId)
    },
    bossPhaseChanged: (event) => {
      this.showBanner(`形态 ${event.phase}`)
      this.playEventSound(event)
      this.applyBossPhase(event.phase, event.bossId)
    },
    minibossStarted: (event) => {
      // A mid-stage fight has no entry in the stage's target list - it is not an
      // enemy - so this event is the only thing that puts its body on screen.
      this.createMinibossView(event.minibossId, event.position.x, event.position.y)
      this.showBanner(`中断 · ${MINIBOSS_TITLE[event.minibossId] ?? event.minibossId}`)
      this.playEventSound({
        type: 'bossTelegraph',
        bossId: event.minibossId,
        moveId: 'start',
        seconds: 0,
      })
    },
    minibossCleared: (event) => {
      this.toppleMinibossView()
      this.showBanner('通道解锁')
      this.playEventSound({
        type: 'bossAttack',
        bossId: event.minibossId,
        moveId: 'cleared',
        position: event.position,
        hit: false,
      })
    },
    waveStarted: (event) => {
      this.showWaveWarning(event.position.x, event.gates)
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
  /** Weapon props mounted on the enemies that carry one, by target id. */
  private readonly propViews = new Map<string, Phaser.GameObjects.Image>()
  /**
   * Wave enemies whose view is owed.
   *
   * A target can appear for the first time inside syncViews - the rule layer adds
   * it during world.update - and a sprite created at that point is added to the
   * display list after the current frame's render walk, so it is never drawn. It
   * looks like a depth or coordinate bug (every property reads correct and nothing
   * appears) and it is really an ordering one. The ids are collected here and the
   * views built at the top of the next update, before the world advances again.
   */
  private readonly pendingViews = new Set<string>()
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
  /** The boss portrait on screen; null on a stage without a boss. */
  private bossPortrait: Phaser.GameObjects.Image | null = null
  /** The phase the portrait is drawn for, so a texture swap happens once. */
  private bossPhase = 1
  /** Its height in world pixels, kept so a form swap rescales to the same size. */
  private bossPortraitHeight = 0
  /** Set once the death topple has started, so it cannot replay. */
  private bossToppled = false
  /**
   * The mid-stage fight's body on screen, or null when none is running.
   *
   * Separate from bossPortrait because the two behave differently: a stage boss
   * is painted at the arena from the first frame and never moves, while this one
   * does not exist until the player walks into its trigger and is placed where its
   * placement stands.
   */
  private minibossView: Phaser.GameObjects.Image | null = null
  /** Which frame of the mid-stage art is showing. */
  private minibossFrame = 1
  /** Set once this fight's topple has started, so it cannot replay. */
  private minibossToppled = false
  /** Its drawn height, kept so the phase swap rescales to the same size. */
  private minibossHeight = 0
  private prevX = 0
  private prevY = 0
  /** Set once the retry prompt is up, so a second death cannot stack a second prompt. */
  private retryArmed = false
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

    // Act I draws its floors from the expansion's room kit instead of the shared
    // ground strip. Both are queued rather than one or the other, because
    // `drawAct1Platform` falls back to the strip when a tile is missing and a
    // fallback path that was never loaded is a rectangle.
    if (usesAct1Kit(stage.index)) preloadAct1Tiles(this.load)

    // The gameplay UI: a wave warning band the act I beats draw when they fire.
    // Three files under 40KB, so it rides with the stage rather than the boot.
    if (usesAct1Kit(stage.index)) preloadUi(this.load)

    // A mid-stage fight's frames, per stage. Sixteen of them across act I is
    // about 1MB, which is why they are not in the boot load with the stage
    // bosses: a player on the title screen has not earned them yet.
    for (const placement of stage.minibosses ?? []) {
      preloadMiniboss(this.load, placement.minibossId)
    }

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
    for (const prop of this.propViews.values()) prop.destroy()
    this.propViews.clear()
    this.bulletViews.clear()
    this.playerView = null
    // The portrait belongs to the previous stage's display list, which shutdown
    // already destroyed: a stale reference would have syncBossPortrait write to
    // a dead object. The phase resets with it, or a stage entered after a
    // phase-2 fight would open on the wrong form.
    this.bossPortrait = null
    this.bossPhase = 1
    this.bossToppled = false
    // A mid-stage fight belongs to the stage that authored it. Phaser reuses this
    // scene, so a stale reference would make the next stage's first update write
    // to a destroyed object.
    this.minibossView?.destroy()
    this.minibossView = null
    this.minibossFrame = 1
    this.minibossToppled = false
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
      // The act sets how many enemies may hold a firing slot at once. Without
      // it the World defaults to act 1, so acts 2 and 3 would stay capped at one
      // shooter and the later stages would feel easier than the first.
      act: this.stage.act,
      // The stage definition carries what the mechanics need: the bounce walls,
      // the scroll mode and the moving platforms. Without it the World sees an
      // empty stage and every authored mechanic silently does nothing - the unit
      // tests build a World with the stage attached and never noticed, because
      // they bypass this call site entirely.
      stage: this.stage,
      // Waves, when the stage authors them. Spread rather than passed as undefined,
      // which exactOptionalPropertyTypes rejects; a stage without waves keeps its
      // enemies on frame one exactly as before.
      ...(this.stage.waves === undefined ? {} : { waves: this.stage.waves }),
      // Mid-stage fights (REQ-STG-009). Same reasoning: a stage without them keeps
      // exactly the behaviour it had.
      ...(this.stage.minibosses === undefined ? {} : { minibosses: this.stage.minibosses }),
      // Boss stages name their boss in the stage data (T3). Only boss stages
      // have one, so the key is spread in rather than passed as undefined.
      ...(this.stage.bossId === undefined ? {} : { bossId: this.stage.bossId }),
    })
  }

  private clearEvents(): void {
    this.clearedEvents = 0
    this.clearedAt = 0
    // Scene.restart reuses this instance, so every field that records "already
    // happened" has to be reset here. retryArmed left set would make the next
    // death show no prompt at all.
    this.retryArmed = false
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
      // Act I expansion state. Read straight off the World's own getters, so the
      // probe cannot report something the simulation disagrees with.
      wavesFired: (this.stage.waves ?? []).filter((wave) => this.world.hasWaveFired(wave.id))
        .length,
      wavesCleared: this.world.wavesCleared,
      routeOpen: this.world.routeOpen,
      minibossRouteOpen: this.world.minibossRouteOpen,
      minibossId: this.world.runningMiniboss?.bossId ?? null,
      minibossPhase: this.world.runningMiniboss?.phase ?? 0,
      minibossHp: this.world.activeMiniboss?.hp ?? 0,
      liveTargets: this.world.targets.filter((target) => target.alive).length,
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

    // Build any views owed from last frame before the world advances again, so a
    // new enemy is drawn on the frame after it appears rather than never.
    this.flushPendingViews()

    const before = this.world.player.position
    this.prevX = before.x
    this.prevY = before.y

    const events = this.world.update(delta / 1000, this.pollInput(source))
    this.bridge.consume(events)
    this.syncViews()
    this.syncBossPortrait()
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
  /**
   * Shows the retry prompt and arms the key that restarts the stage.
   *
   * REQ-VIS-002 asks for a retry within three seconds and REQ-PLY-007 for a
   * restart at the stage start with the weapon slots kept. Both were unreachable:
   * the rule layer had no failure state and this scene reacted to death with a
   * banner and nothing else, so a lost run simply kept running.
   *
   * The prompt stays up until the player acts. It does not auto-restart, because
   * a death the player did not understand is worth a second to read.
   */
  private beginRetryWindow(): void {
    if (this.retryArmed) return
    this.retryArmed = true

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, '按 R 重试本关', {
        fontFamily: 'serif',
        fontSize: '26px',
        color: '#f4f1ea',
      })
      .setOrigin(0.5)
      .setDepth(900)
      .setScrollFactor(0)
    prompt.setShadow(0, 2, '#1a1a1a', 6)

    this.input.keyboard?.once('keydown-R', () => {
      // A fresh scene is the cleanest reset: every view, timer and audio handle
      // belongs to the scene, and keeping the old one alive to re-initialise
      // would leave whichever ones this method forgot still running.
      this.scene.restart({ stageId: this.stage.id, characterId: this.request.characterId })
    })
  }

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
    const act1Kit = usesAct1Kit(this.stage.index ?? 1)
    for (const platform of this.stage.platforms) {
      // Act I uses the expansion's room kit; everything else keeps the shared
      // strip. Null means the kit piece did not load, so fall through rather than
      // drawing nothing.
      if (act1Kit) {
        const drawn = drawAct1Platform(this, platform)
        if (drawn !== null) continue
      }
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
      this.createTargetView(target)
    }

    // Wave enemies get their views here too, built during stage setup and hidden
    // until their wave releases them.
    //
    // Built now rather than when the wave fires for an ordering reason: a sprite
    // created from inside update() lands in the display list after that frame's
    // render walk, so it first appears one frame late at best. Building the whole
    // cast up front means a wave only has to flip visibility.
    //
    // Visibility, not position. An earlier version parked these off-stage at
    // -100000 and moved them in, which produced a second class of bug for no
    // benefit - and the reason it looked necessary was a wrong scale factor, not
    // an ordering problem at all (see the scale in createTargetView).
    for (const wave of this.stage.waves ?? []) {
      for (const spawn of wave.spawns) {
        this.createTargetView({
          id: spawn.target.id,
          x: wave.trigger.x + spawn.x,
          y: wave.trigger.y + spawn.y,
          width: spawn.target.width,
          height: spawn.target.height,
          hp: spawn.target.hp,
          score: spawn.target.score,
          ...(spawn.target.archetype === undefined ? {} : { archetype: spawn.target.archetype }),
        })
        // Hidden until the wave fires. Both halves of the view have to go: the
        // mounted weapon is a separate sprite, and hiding only the enemy left a
        // floating gun standing at every spawn point in the stage.
        this.targetViews.get(spawn.target.id)?.setVisible(false)
        this.propViews.get(spawn.target.id)?.setVisible(false)
      }
    }
  }

  /**
   * Builds the view for one target.
   *
   * Handles both target shapes: an authored target from the stage data, and one
   * the rule layer added mid-stage. Wave enemies are built during stage setup like
   * every authored target, so this runs in one place for one cast.
   */
  private createTargetView(target: TargetDefinition | TargetState): void {
    // Two shapes reach this method: authored targets carry x/y/width/height flat,
    // and rule-layer state carries them in a box. Normalising here keeps one
    // renderer for both, so a wave enemy is drawn by exactly the same code as a
    // stage enemy rather than by a near-copy that drifts.
    const rect =
      'box' in target
        ? target.box
        : { x: target.x, y: target.y, width: target.width, height: target.height }
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
    const view = new ActorView(this, texture, rect.x, rect.y, 15, 32, 32)

    if (hasArt) {
      // Drawn at a readable size, not at the collision box.
      //
      // Scaling to the box looked right on a grey rectangle and wrong the moment
      // the art landed: the box is 40px tall, so a 128px sprite was shrunk to
      // 0.31 and a hand-drawn enemy became a few orange pixels next to a 1.4x
      // placeholder that used to stand there. The box decides what the rules
      // collide with; the sprite decides what the player sees, and those are
      // different jobs.
      //
      // The ratio is drawn-pixels over frame-pixels, and it was written the wrong
      // way round for three releases. Inverted it drew a 128px frame at 1.78 - a
      // 228px enemy on a 540px stage, 303px after the camera's 1.33x zoom. That
      // creature filled most of the viewport and read as scenery, which is why an
      // afternoon went into depth sorting, render batches and object pooling
      // chasing an "invisible" enemy that was in fact the biggest thing on screen.
      const readable = ENEMY_ART_DRAWN_PX / ENEMY_FRAME_SIZE
      view.sprite.setScale(readable)
    } else {
      view.sprite.setScale(1.2)
    }
    view.sync(rect.x + rect.width / 2, rect.y + rect.height)
    this.targetViews.set(target.id, view)

    // Four archetypes carry a weapon the sprite does not include. Mounting it
    // is what lets a player see which drone is the one with the gun - the
    // difference between a readable fight and being shot by a blank robot.
    //
    // The prop is positioned every frame in syncViews, from the sprite rather than
    // from the box, so the two cannot drift apart when an enemy is drawn at a
    // different size than it collides.
    if (hasEnemyProp(archetype)) {
      const drawnHeight = hasArt ? ENEMY_ART_DRAWN_PX : rect.height
      const prop = mountProp(this, archetype, rect.x, rect.y, drawnHeight, 16)
      if (prop !== null) this.propViews.set(target.id, prop)
    }
  }

  /**
   * Builds the views queued by the last sync pass.
   *
   * Only targets the rule layer invents mid-stage take this path - the three
   * interlude echoes are the ones that exist today. Everything authored, waves
   * included, is built during stage setup.
   *
   * Done at the start of an update rather than inside syncViews for a plain
   * ordering reason: a sprite added after the frame's render walk cannot be drawn
   * until the next one, so building it here means it appears a frame after the
   * world creates it instead of never.
   */
  private flushPendingViews(): void {
    if (this.pendingViews.size === 0) return
    for (const id of this.pendingViews) {
      const target = this.world.targets.find((candidate) => candidate.id === id)
      if (target === undefined) continue
      this.createTargetView(target)
    }
    this.pendingViews.clear()
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
      // A target the rule layer invented mid-stage has no view yet. Queue it for
      // the top of the next update, where creating it is still ahead of that
      // frame's render walk.
      if (!this.targetViews.has(target.id)) {
        this.pendingViews.add(target.id)
        continue
      }
      const view = this.targetViews.get(target.id)
      if (view === undefined) continue
      // Same correction the player needed: the rule layer's y is the top of the
      // box, the sprite is anchored at its bottom-centre. Passing y straight
      // through left every enemy standing 40px above the floor - the box height
      // again, and it read as enemies hovering rather than standing.
      view.sync(target.box.x + target.box.width / 2, target.box.y + target.box.height)
      // Visibility is the only thing that separates a wave enemy waiting for its
      // beat from one on the field: both have a view from setup, and the world
      // simply does not list the waiting ones until their wave fires.
      view.setVisible(target.alive)
      view.setTint(target.alive ? null : PALETTE.targetDead)

      const prop = this.propViews.get(target.id)
      if (prop !== undefined) {
        // The prop is mounted in the sprite's own space, not the box's: the enemy
        // is drawn at ENEMY_ART_DRAWN_PX while its collision box is 40px, so a
        // position derived from the box would drift off the hand.
        const sprite = view.sprite
        prop.setPosition(
          sprite.x + sprite.displayWidth * (PROP_OFFSET.x - 0.5),
          sprite.y - sprite.displayHeight * (1 - PROP_OFFSET.y),
        )
        prop.setVisible(target.alive)
        if (target.alive) prop.clearTint()
        else prop.setTint(PALETTE.targetDead)
      }
    }

    const live = new Set<string>()
    for (const bullet of this.world.bullets) {
      live.add(bullet.id)
      let view = this.bulletViews.get(bullet.id)
      if (view === undefined) {
        view = new ProjectileView(
          this,
          bullet.weaponId,
          bullet.owner,
          bullet.enemyWeaponId,
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

  /**
   * A muzzle flash, coloured by faction and element.
   *
   * The flash is the only signal that distinguishes "my gun fired" from "someone
   * shot at me" at a glance when both are on screen, which is the whole point of
   * keeping the enemy flash on a different palette.
   */
  private showMuzzleFlash(x: number, y: number, weaponId: string, owner: string): void {
    const key = effectKey(muzzleForWeapon(weaponId, owner))
    if (!hasEffect(key)) return
    const flash = this.add
      .image(x, y, key)
      .setDepth(19)
      .setRotation(Math.random() * Math.PI)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 90,
      onComplete: () => flash.destroy(),
    })
  }

  /**
   * A hit mark at the point of impact.
   *
   * Three sizes exist because the set was drawn that way: a rifle tick, a
   * mid-sized burst and a heavy one. Picking by the damage dealt means a pierce
   * round looks different from a scatter pellet without the rule layer having to
   * say anything about art.
   */
  private showImpact(x: number, y: number, damage = 1): void {
    const size = damage >= 4 ? 'impact-big' : damage >= 2 ? 'impact-med' : 'impact-small'
    const key = effectKey(size)
    if (!hasEffect(key)) return
    const impact = this.add.image(x, y, key).setDepth(18)
    this.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.6,
      duration: 130,
      onComplete: () => impact.destroy(),
    })
  }

  /** A blast, scaled to the radius the rule layer reported. */
  private showBlast(x: number, y: number, radius: number): void {
    const key = effectKey('impact-big')
    if (!hasEffect(key)) return
    const blast = this.add.image(x, y, key).setDepth(17)
    // The art is 128px wide, so scale against the real radius rather than
    // against a number that only looks right at one blast size.
    const scale = Math.max(0.6, (radius * 2) / 128)
    blast.setScale(scale * 0.7)
    this.tweens.add({
      targets: blast,
      alpha: 0,
      scale: scale * 1.3,
      duration: 260,
      onComplete: () => blast.destroy(),
    })
  }

  /** One-line notice in the banner slot, cleared after a moment. */
  /**
   * Shows an enemy wind-up.
   *
   * Drawn at the enemy rather than in a fixed place, unlike the boss band,
   * because the player has to know *which* drone is about to shoot in order to
   * decide where to move. A growing ring is the smallest mark that answers that
   * and still reads at 32px.
   */
  private showEnemyTelegraph(x: number, y: number, seconds: number): void {
    const duration = Math.max(160, seconds * 1000)
    const auraKey = effectKey('charge-aura')
    if (hasEffect(auraKey)) {
      // A charge aura that grows over exactly the warning length, so the fill is
      // a clock rather than a decoration: when it reaches full size, the shot
      // leaves.
      const aura = this.add.image(x, y, auraKey).setDepth(19).setAlpha(0.35).setScale(0.4)
      this.tweens.add({
        targets: aura,
        scale: 1.15,
        alpha: 0.9,
        duration,
        onComplete: () => aura.destroy(),
      })
      this.tweens.add({
        targets: aura,
        angle: 360,
        duration: duration * 2,
      })
      return
    }
    const ring = this.add
      .circle(x, y, 14, 0xffffff, 0)
      .setStrokeStyle(2, PALETTE.alertFill, 0.9)
      .setDepth(19)
    this.tweens.add({
      targets: ring,
      radius: 34,
      alpha: 0.15,
      duration,
      onComplete: () => ring.destroy(),
    })
  }

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
  private showBossAttack(x: number, y: number, hit: boolean, moveId: string): void {
    if (!hit) return
    const effect = bossEffectForMove(moveId)
    const key = effect === null ? null : bossEffectKey(effect)
    if (key !== null && hasEffect(key)) {
      const flash = this.add.image(x, y, key).setDepth(18).setScale(0.5)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.4,
        duration: 340,
        onComplete: () => flash.destroy(),
      })
    } else {
      const flash = this.add.circle(x, y, 90, PALETTE.alertFill, 0.45).setDepth(18)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.8,
        duration: 320,
        onComplete: () => flash.destroy(),
      })
    }
    this.cameras.main.shake(160, 0.012)
  }

  /**
   * Warns the player that a wave just fired.
   *
   * Drawn at the trigger's centre rather than over the HUD, because the warning
   * has to say *where* the fight is coming from: a wave can arrive to the left or
   * the right depending on how the player entered, and a screen-wide banner would
   * say "something" without saying which way to turn.
   *
   * A gating wave is drawn in the alert colour and a passing one in paper. That is
   * the whole difference the player needs: one of these locks the door and the
   * other is pressure they may run through.
   */
  private showWaveWarning(x: number, gates: boolean): void {
    const key = waveWarningKey()
    const y = GAME_HEIGHT * 0.32
    // Paper for a passing wave, alert vermillion for one that locks the door.
    const tint = gates ? UI.vermillion : UI.paper

    if (hasWaveWarning()) {
      // The art is a 384x64 band. Drawn at the trigger's x so it reads as an event
      // at a place; the band itself says 波次 without a word of text.
      const band = this.add.image(x, y, key).setDepth(19).setTint(tint).setAlpha(0.9).setScale(0.5)
      this.tweens.add({
        targets: band,
        alpha: 0,
        scaleX: 1.1,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => band.destroy(),
      })
      return
    }

    // No art: a bar that grows and fades, in the same place. An unreadable wave is
    // a fight the player did not see coming, so the fallback is not optional.
    const bar = this.add.rectangle(x, y, 120, 6, tint, 0.85).setDepth(19)
    this.tweens.add({
      targets: bar,
      alpha: 0,
      scaleX: 1.6,
      duration: 600,
      onComplete: () => bar.destroy(),
    })
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
   * Places the boss portrait for the phase the fight opens in (T-M6-22).
   *
   * Anchored on the exit zone, not on the camera: the boss has no coordinates of
   * its own - the runtime state is a phase machine - so the arena it stands in
   * is its position. Depth keeps it behind the terrain and every actor, so it
   * reads as a backdrop the fight happens in front of and can never hide a
   * bullet or the player.
   *
   * A stage without a boss never creates one, and a boss whose art is missing
   * entirely is skipped rather than leaving an empty frame.
   */
  private createBossPortrait(): void {
    const bossId = this.stage.bossId
    if (bossId === undefined) return

    const key = this.bossArtKeyFor(bossId, this.bossPhase)
    if (key === null) return

    const exit = this.stage.exit
    this.bossPortraitHeight = GAME_HEIGHT * 0.62
    this.bossPortrait = this.add
      .image(exit.x + exit.width / 2, exit.y + exit.height, key)
      .setOrigin(0.5, 1)
      .setDepth(-50)
      .setScale(this.bossPortraitHeight / this.textures.get(key).getSourceImage().height)
    this.syncBossPortrait()
  }

  /**
   * Puts a mid-stage fight's body on screen.
   *
   * Built from the event rather than from a pre-built cast, unlike the wave
   * enemies: a fight's frames are four 360x360 images that a stage may never
   * reach, and unlike an enemy they are already loaded per stage (see preload), so
   * creating the sprite at the moment it starts is both cheap and correct. It also
   * cannot have the one-frame-late ordering problem the wave views had, because
   * this runs inside the event pass and is drawn on the same frame.
   *
   * The height is a third of a stage boss's, from the art spec: a mid-stage fight
   * that read as tall as the act boss would steal the climax from the stage it is
   * standing in.
   */
  private createMinibossView(bossId: FightId, x: number, y: number): void {
    const key = minibossFrameKey(bossId, 1)
    if (!this.textures.exists(key)) return

    this.minibossView?.destroy()
    this.minibossToppled = false
    this.minibossFrame = 1

    this.minibossHeight = GAME_HEIGHT * 0.34
    const view = this.add
      .image(x, y, key)
      .setOrigin(0.5, 1)
      // Behind the player and the enemies, in front of the parallax: the body has
      // to be visible but must not cover the thing the player is aiming with.
      .setDepth(-40)
      .setScale(this.minibossHeight / this.textures.get(key).getSourceImage().height)

    this.minibossView = view
    // A short drop in, so the body arriving is a beat rather than a pop.
    view.setAlpha(0)
    this.tweens.add({ targets: view, alpha: 1, duration: 220 })
  }

  /**
   * Swaps the mid-stage art when the fight changes phase.
   *
   * Frame 2 is the second phase's pose where the art has one. The art provides
   * four frames per fight, and only the first two are used: frame 1 is the idle
   * pose and frame 2 the wound-up one, which is what a phase change reads as.
   */
  private syncMinibossFrame(phase: number): void {
    const view = this.minibossView
    const bossId = this.world?.runningMiniboss?.bossId
    if (view === null || bossId === undefined) return

    const wanted = Math.max(1, Math.min(phase, minibossFrameCount(bossId)))
    if (wanted === this.minibossFrame) return
    this.minibossFrame = wanted

    const key = minibossFrameKey(bossId, wanted)
    if (!this.textures.exists(key)) return
    view.setTexture(key)
    view.setScale(this.minibossHeight / this.textures.get(key).getSourceImage().height)
  }

  /** The defeat pose for a mid-stage fight: it falls, then clears. */
  private toppleMinibossView(): void {
    const view = this.minibossView
    if (view === null || this.minibossToppled) return
    this.minibossToppled = true

    view.setTint(PALETTE.targetDead)
    this.tweens.add({ targets: view, angle: -78, duration: 520, ease: 'Quad.easeIn' })
    this.tweens.add({
      targets: view,
      alpha: 0,
      delay: 420,
      duration: 520,
      onComplete: () => {
        view.destroy()
        if (this.minibossView === view) this.minibossView = null
      },
    })
  }

  /**
   * The portrait texture to draw for one fight state, or null when none of the
   * candidate forms is loaded.
   *
   * The candidate order comes from the asset layer, which is the only place that
   * knows a phase without its own portrait has to fall back to another form:
   * a fight that switches to a form the art does not cover still shows the boss
   * instead of blinking to an empty stage.
   */
  private bossArtKeyFor(bossId: FightId, phase: number): string | null {
    for (const id of bossArtPreference(bossId, phase)) {
      const key = bossArtKey(id)
      if (this.textures.exists(key)) return key
    }
    return null
  }

  /**
   * Swaps the portrait when the boss crosses into the next phase.
   *
   * Driven by the event rather than polled: the form change is the beat the
   * fight is built around, and reading it a frame late is exactly the lag that
   * makes a phase switch feel like a bug. The fade covers the texture swap, so
   * the two forms are not one hard cut.
   *
   * `bossId` is taken from the event rather than read off the stage, because a
   * stage can now hold two fights: the event is the only thing that says which of
   * them just changed. A mid-stage fight only needs its frame swapped, since it
   * draws from its own four-frame sheet rather than from a portrait.
   */
  private applyBossPhase(phase: number, bossId: FightId): void {
    // A mid-stage fight's phase change is its own path: it is not the stage's
    // portrait and must not move it.
    if (this.world !== undefined && this.world.runningMiniboss?.bossId === bossId) {
      this.syncMinibossFrame(phase)
      return
    }

    this.bossPhase = phase
    const portrait = this.bossPortrait
    // A defeated boss stays down; reviving its portrait on a late phase event
    // would undo the one thing the death pose is telling the player.
    if (portrait === null || this.bossToppled) return

    const key = this.bossArtKeyFor(bossId, phase)
    if (key === null) return

    // A phase that keeps the same form still has to read as a change, and
    // art-style.md §5 is explicit that the form shift is a colour offset when
    // one illustration covers one form. Cross-fading a picture into itself
    // would look like a dropped frame, so the identical texture is tinted.
    if (key === portrait.texture.key) {
      if (phase > 1) portrait.setTint(BOSS_PHASE_TINT)
      return
    }

    this.tweens.add({
      targets: portrait,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        if (this.bossPortrait !== portrait) return
        portrait.setTexture(key)
        // The tint was this phase-shift's stand-in for art that does not exist;
        // the new form has its own, so carrying the wash over would report the
        // previous phase on top of the current one.
        portrait.clearTint()
        portrait.setScale(this.bossPortraitHeight / this.textures.get(key).getSourceImage().height)
        this.tweens.add({ targets: portrait, alpha: 1, duration: 220 })
      },
    })
  }

  /**
   * Keeps the portrait on the arena without letting the camera scroll it away.
   *
   * The camera follows the player, so an image pinned in world space at the
   * arena would spend the whole approach off screen and the boss would only
   * appear once the fight had already started. The anchor is the arena centre;
   * the clamp only moves it as far as it takes to stay inside the shot.
   */
  private syncBossPortrait(): void {
    const portrait = this.bossPortrait
    if (portrait === null) return

    if (!this.bossToppled && this.world.activeBoss?.defeated === true) {
      this.toppleBossPortrait(portrait)
      return
    }
    if (!portrait.visible) return

    const exit = this.stage.exit
    const x = exit.x + exit.width / 2
    // The portrait stays at the arena. An earlier version clamped it into the
    // camera view, which dragged a 300px-wide figure across the screen and put it
    // on top of the player standing at the exit: the boss was readable but the
    // character was inside its skirt. A backdrop is allowed to leave the frame;
    // what it must not do is follow the camera into the fight.
    if (portrait.x !== x) portrait.x = x
    if (portrait.y !== exit.y + exit.height) portrait.y = exit.y + exit.height
  }

  /**
   * The defeat pose: the body falls from its feet and then clears.
   *
   * The origin sits at the feet, so rotating drops the whole figure backward
   * from the ground instead of spinning it around its middle. The grey tint is
   * what separates "beaten" from "changed form" at a glance, because both are a
   * recoloured silhouette otherwise.
   */
  private toppleBossPortrait(portrait: Phaser.GameObjects.Image): void {
    this.bossToppled = true
    portrait.setTint(PALETTE.targetDead)
    this.tweens.add({
      targets: portrait,
      angle: -82,
      duration: 620,
      ease: 'Quad.easeIn',
    })
    this.tweens.add({
      targets: portrait,
      alpha: 0,
      delay: 900,
      duration: 700,
      onComplete: () => portrait.setVisible(false),
    })
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
