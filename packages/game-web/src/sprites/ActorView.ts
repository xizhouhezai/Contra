import type Phaser from 'phaser'

/**
 * One Phaser sprite bound to one rule-layer entity.
 *
 * The sync is strictly one-way: the sprite reads the entity box every frame and
 * writes it to the renderer. Nothing here ever writes back to the entity
 * (docs/game/design/modules.md §表现层模块 · 精灵封装).
 */
export class ActorView {
  readonly sprite: Phaser.GameObjects.Sprite
  private lastX = Number.NaN
  private lastY = Number.NaN

  constructor(scene: Phaser.Scene, texture: string, x: number, y: number, depth = 10) {
    this.sprite = scene.add.sprite(x, y, texture).setOrigin(0, 0).setDepth(depth)
  }

  /** Copies an entity box onto the sprite; no-op when the box has not moved. */
  sync(x: number, y: number): void {
    if (x === this.lastX && y === this.lastY) return
    this.lastX = x
    this.lastY = y
    this.sprite.setPosition(x, y)
  }

  setTint(color: number | null): void {
    if (color === null) {
      this.sprite.clearTint()
      return
    }
    this.sprite.setTint(color)
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible)
  }

  destroy(): void {
    this.sprite.destroy()
  }
}
