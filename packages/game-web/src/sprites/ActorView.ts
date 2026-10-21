import type { CharacterId } from '@contra/game-core'
import type Phaser from 'phaser'
import { characterTexture, enemyTexture } from '../assets/manifest'

/**
 * One Phaser sprite bound to one rule-layer entity.
 *
 * The sync is strictly one-way: the sprite reads the entity box every frame and
 * writes it to the renderer. Nothing here ever writes back to the entity
 * (docs/game/design/modules.md 表现层模块 · 精灵封装).
 *
 * Two constructors: a sprite sheet when the art exists, a flat rectangle when it
 * does not. The game must not depend on art being present - a missing sheet
 * degrades to the grey box rather than to an invisible entity.
 */
export class ActorView {
  readonly sprite: Phaser.GameObjects.GameObject
  private lastX = Number.NaN
  private lastY = Number.NaN

  constructor(
    scene: Phaser.Scene,
    texture: string,
    x: number,
    y: number,
    depth = 10,
    width = 24,
    height = 40,
  ) {
    this.sprite = scene.textures.exists(texture)
      ? scene.add.sprite(x, y, texture).setOrigin(0, 0).setDepth(depth)
      : scene.add.rectangle(x, y, width, height, 0x1a1a1a).setOrigin(0, 0).setDepth(depth)
  }

  /** Copies an entity box onto the sprite; no-op when the box has not moved. */
  sync(x: number, y: number): void {
    if (x === this.lastX && y === this.lastY) return
    this.lastX = x
    this.lastY = y
    if (this.sprite instanceof Object && 'setPosition' in this.sprite) {
      ;(this.sprite as Phaser.GameObjects.Sprite).setPosition(x, y)
    }
  }

  setTint(color: number | null): void {
    const sprite = this.sprite as Phaser.GameObjects.Sprite
    if (typeof sprite.setTint !== 'function') return
    if (color === null) sprite.clearTint()
    else sprite.setTint(color)
  }

  setVisible(visible: boolean): void {
    ;(this.sprite as Phaser.GameObjects.Sprite).setVisible(visible)
  }

  destroy(): void {
    this.sprite.destroy()
  }
}

/** Texture key for a character's animation sheet, with a grey-box fallback. */
export function characterSprite(
  character: CharacterId,
  state: 'idle' | 'run' | 'jump' | 'hurt',
): string {
  return characterTexture(character, state)
}

/** Texture key for an enemy sheet. */
export function enemySprite(enemyId: string): string {
  return enemyTexture(enemyId)
}
