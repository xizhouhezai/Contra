import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config'
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

// Allocate the backing buffer once, from the real window, capped at 2x. The
// canvas then holds that many pixels regardless of how the CSS scales it, so
// text is rasterised at close to its display density without paying for 4K.
const initial =
  typeof window === 'undefined'
    ? { width: GAME_WIDTH, height: GAME_HEIGHT }
    : bufferSize(window.innerWidth, window.innerHeight)

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
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

export const game = new Phaser.Game(config)

/**
 * Re-fits every live camera to the canvas.
 *
 * One listener rather than one per scene: a resize reaches all of them at once,
 * and a scene created later picks the fit up in its own create.
 */
game.scale.on(Phaser.Scale.Events.RESIZE, () => {
  for (const scene of game.scene.getScenes(true)) {
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
declare global {
  interface Window {
    __contraGame?: Phaser.Game
  }
}
window.__contraGame = game
