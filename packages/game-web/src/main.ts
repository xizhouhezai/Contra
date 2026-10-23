import Phaser from 'phaser'
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config'
import { applyFit, bufferSize } from './fit'
import { BootScene } from './scenes/BootScene'
import { CampaignClearScene } from './scenes/CampaignClearScene'
import { CharacterSelectScene } from './scenes/CharacterSelectScene'
import { InterludeScene } from './scenes/InterludeScene'
import { PauseScene } from './scenes/PauseScene'
import { ResultScene } from './scenes/ResultScene'
import { SettingsScene } from './scenes/SettingsScene'
import { StageScene } from './scenes/StageScene'
import { StageSelectScene } from './scenes/StageSelectScene'
import { TitleScene } from './scenes/TitleScene'

/** Mount point in index.html; Phaser parents to the same element. */
const MOUNT_ID = 'game-root'

/**
 * The one part of a canvas the probe touches.
 *
 * Structural rather than HTMLCanvasElement so the decision can be exercised with
 * a stub in a node test: what matters is which context ids the canvas refuses.
 */
export type CanvasLike = {
  getContext(contextId: string, options?: unknown): unknown
}

// Allocate the backing buffer once, from the real window, capped at 2x. The
// canvas then holds that many pixels regardless of how the CSS scales it, so
// text is rasterised at close to its display density without paying for 4K.
const initial =
  typeof window === 'undefined'
    ? { width: GAME_WIDTH, height: GAME_HEIGHT }
    : bufferSize(window.innerWidth, window.innerHeight)

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: MOUNT_ID,
  width: initial.width,
  height: initial.height,
  backgroundColor: PALETTE.background,
  // Antialiasing stays on. pixelArt:true also forces it off, which is right for
  // sprite pixels and wrong for text: the glyphs here are real font rendering at
  // 12-38px, and nearest-neighbour stretching turned every curve into stair steps.
  // Sprites keep their crisp edges through setTexture filtering, not through a
  // global flag that also degrades the UI.
  antialias: true,
  roundPixels: false,
  scale: {
    // FIT with a capped backing buffer (src/fit.ts). Rendering one pixel per
    // display pixel was crisp and unplayable - 16.8fps at 2560x1440 - so the
    // buffer is bounded at 2x the design size and the browser scales that.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    CharacterSelectScene,
    StageSelectScene,
    StageScene,
    ResultScene,
    InterludeScene,
    CampaignClearScene,
    SettingsScene,
    PauseScene,
  ],
}

/**
 * Whether this browser can hand Phaser a WebGL context.
 *
 * Phaser.AUTO answers the same question by itself, but it answers it by silently
 * dropping to the Canvas renderer, which draws a subset of what this game draws:
 * tinted sprites and pipeline work come out wrong or not at all. A broken screen
 * with no explanation is what we are replacing here, so the question is asked
 * before the game exists rather than trusted to the renderer fallback.
 *
 * The canvas factory is a parameter so the decision stays testable outside a
 * browser, and so the caller owns the DOM lookup.
 */
export function hasWebGL(createCanvas: () => CanvasLike | null): boolean {
  try {
    const canvas = createCanvas()
    if (canvas === null) return false

    const acquired = (contextId: string): boolean => {
      const context: unknown = canvas.getContext(contextId)
      return context !== null && context !== undefined
    }

    // webgl2 first: a browser that has it also answers 'webgl', but accepting
    // either keeps the check honest on hardware that only offers the older id.
    return acquired('webgl2') || acquired('webgl')
  } catch {
    // getContext throws when the GPU is blocklisted or the context budget is
    // spent, which is exactly the state this fallback exists for.
    return false
  }
}

/**
 * Markup for the WebGL fallback screen.
 *
 * Returned as a string rather than built through the DOM so the copy and the
 * inks can be asserted in a node test. It is printed like the rest of the game -
 * paper, ink, square corners - because the player arrived at a game, not at a
 * browser error page.
 */
export function webglNoticeHtml(): string {
  return `<div style="position:fixed;inset:0;overflow:auto;padding:8vh 24px;background:${PALETTE.background};color:${PALETTE.ink};font-family:${FONTS.title};line-height:1.7">
  <div style="max-width:36rem;margin:0 auto">
    <p style="margin:0 0 2rem;font-family:${FONTS.label};font-size:0.75rem;letter-spacing:0.18em;color:${PALETTE.inkMuted}">CONTRA · 灰盒</p>
    <h1 style="margin:0 0 1.25rem;font-size:1.75rem;font-weight:normal;line-height:1.4">你的浏览器不支持 WebGL</h1>
    <p style="margin:0 0 1.75rem;font-size:1rem">
      这个游戏用 WebGL 绘制画面。当前浏览器创建不出 WebGL 上下文，所以游戏没有启动，画面也就不会出现。
    </p>
    <p style="margin:0 0 0.5rem;font-family:${FONTS.label};font-size:0.75rem;letter-spacing:0.18em;color:${PALETTE.inkMuted}">可以这样解决</p>
    <ul style="margin:0;padding-left:1.25rem;list-style:square;font-size:0.9375rem">
      <li>换用新版 Chrome、Edge、Firefox 或 Safari 打开本页</li>
      <li>在浏览器设置里开启「硬件加速」，然后刷新页面</li>
      <li>远程桌面或虚拟机中，改用本机浏览器运行</li>
      <li>更新显卡驱动后重试</li>
    </ul>
  </div>
</div>`
}

declare global {
  interface Window {
    __contraGame?: Phaser.Game
  }
}

/**
 * Mounts the game, or prints the fallback screen in its place.
 *
 * Returns undefined when nothing was mounted: outside a browser (the node tests
 * import this module) and when the page has no mount point to draw into.
 */
function startGame(): Phaser.Game | undefined {
  if (typeof document === 'undefined' || typeof window === 'undefined') return undefined
  const mount = document.getElementById(MOUNT_ID)
  if (mount === null) return undefined

  if (!hasWebGL(() => document.createElement('canvas'))) {
    mount.innerHTML = webglNoticeHtml()
    return undefined
  }

  const created = new Phaser.Game(config)

  /**
   * Re-fits every live camera to the canvas.
   *
   * One listener rather than one per scene: a resize reaches all of them at once,
   * and a scene created later picks the fit up in its own create.
   */
  created.scale.on(Phaser.Scale.Events.RESIZE, () => {
    for (const scene of created.scene.getScenes(true)) {
      if (scene.scene.isActive()) applyFit(scene)
    }
  })

  /**
   * Debug handle (also the handle end-to-end checks drive the game through).
   *
   * Exposed unconditionally rather than behind a build flag: this project ships no
   * secrets, and a handle that only exists in some builds is exactly the kind that
   * turns out to be missing when a release needs diagnosing.
   */
  window.__contraGame = created

  return created
}

export const game = startGame()
