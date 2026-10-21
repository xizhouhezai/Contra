import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config'
import { BootScene } from './scenes/BootScene'
import { CampaignClearScene } from './scenes/CampaignClearScene'
import { CharacterSelectScene } from './scenes/CharacterSelectScene'
import { InterludeScene } from './scenes/InterludeScene'
import { ResultScene } from './scenes/ResultScene'
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
  ],
}

export const game = new Phaser.Game(config)
