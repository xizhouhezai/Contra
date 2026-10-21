import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config'
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

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.background,
  pixelArt: true,
  scale: {
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
