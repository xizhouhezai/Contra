import type Phaser from 'phaser'
import { hasProjectile, projectileKey } from '../assets/projectiles'

/**
 * On-screen size of a projectile, in world pixels.
 *
 * The bullet's collision box is 8x8 and the art is drawn on a 64x64 canvas, so
 * the two cannot be tied together directly: scaling 64 to 8 leaves the art as an
 * unreadable speck, and drawing it at 64 hides the player behind their own fire.
 * Twenty-six pixels is the size at which the silhouette still reads - a dart is
 * distinguishable from an orb - without covering the character.
 */
const DRAW_SIZE = 26

/**
 * One projectile sprite bound to one bullet.
 *
 * Separate from ActorView because a bullet is not drawn like a character. An
 * actor keeps the sprite's top-left on the entity box; a projectile is centred on
 * the box and drawn several times larger than it, so that origin and scale rule
 * would put the art off to the lower right of the bullet.
 *
 * Falls back to a flat marker when the weapon has no art, so a new weapon shows
 * as a visible shot rather than as nothing.
 */
export class ProjectileView {
  private readonly sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  private lastX = Number.NaN
  private lastY = Number.NaN

  constructor(
    scene: Phaser.Scene,
    weaponId: string,
    x: number,
    y: number,
    boxWidth: number,
    boxHeight: number,
    depth = 18,
  ) {
    if (hasProjectile(weaponId)) {
      const key = projectileKey(weaponId)
      this.sprite = scene.add
        .image(x, y, key)
        .setOrigin(0.5, 0.5)
        .setDepth(depth)
        .setScale(DRAW_SIZE / Math.max(1, scene.textures.get(key).getSourceImage().width))
    } else {
      this.sprite = scene.add
        .rectangle(x, y, boxWidth, boxHeight, 0xc8901f)
        .setOrigin(0.5, 0.5)
        .setDepth(depth)
    }
  }

  /** Centres the art on the bullet box. */
  sync(x: number, y: number, boxWidth: number, boxHeight: number): void {
    const cx = x + boxWidth / 2
    const cy = y + boxHeight / 2
    if (cx === this.lastX && cy === this.lastY) return
    this.lastX = cx
    this.lastY = cy
    this.sprite.setPosition(cx, cy)
  }

  destroy(): void {
    this.sprite.destroy()
  }
}
