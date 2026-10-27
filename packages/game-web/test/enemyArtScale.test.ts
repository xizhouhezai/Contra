import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMY_ART_DRAWN_PX, ENEMY_FRAME_SIZE } from '../src/assets/enemies'
import { PROP_BOOST } from '../src/assets/enemyProps'

const scene = readFileSync(
  fileURLToPath(new URL('../src/scenes/StageScene.ts', import.meta.url)),
  'utf8',
)

/**
 * Enemy art has to be drawn at the size the design says, not at its frame size.
 *
 * The bug: the ratio was written as frame/drawn (128/72 = 1.78) instead of
 * drawn/frame (72/128 = 0.56). A 128px frame was therefore drawn 228px tall, or
 * 303px on a 540px stage once the camera's 1.33x zoom applied. That is larger than
 * the player and most of the viewport, so it read as a background object rather
 * than as an enemy.
 *
 * Three releases went into chasing an "invisible" wave enemy - depth sorting,
 * render batches, object pooling - while the enemy was the largest thing on
 * screen. The numbers are pinned here so the direction of the ratio cannot flip
 * again unnoticed.
 */
describe('enemy art scale', () => {
  it('draws a frame smaller than the frame, not larger', () => {
    // The direction of the ratio is the whole bug: a scale above 1 enlarges the art.
    expect(ENEMY_ART_DRAWN_PX).toBeLessThan(ENEMY_FRAME_SIZE)
    const scale = ENEMY_ART_DRAWN_PX / ENEMY_FRAME_SIZE
    expect(scale).toBeLessThan(1)
    expect(scale).toBeCloseTo(0.5625, 4)
  })

  it('scales by drawn over frame in the scene', () => {
    expect(scene).toMatch(/ENEMY_ART_DRAWN_PX\s*\/\s*ENEMY_FRAME_SIZE/)
    expect(scene).not.toMatch(/ENEMY_FRAME_SIZE\s*\/\s*ENEMY_ART_DRAWN_PX/)
  })

  it('draws an enemy no taller than the player is displayed', () => {
    // The player is drawn at DISPLAY_HEIGHT (90px). An enemy visibly taller than
    // that is a boss, and a boss standing in a wave is a design error, not art.
    const drawn = ENEMY_FRAME_SIZE * (ENEMY_ART_DRAWN_PX / ENEMY_FRAME_SIZE)
    expect(drawn).toBe(ENEMY_ART_DRAWN_PX)
    expect(drawn).toBeLessThanOrEqual(90)
  })

  it('keeps a mounted weapon in proportion to the enemy, not the collision box', () => {
    // The prop's scale used to come from the 40px collision box while the enemy was
    // drawn at 72px, so the gun was a third too small. With the boost the gun has to
    // stay under half the enemy's height or it reads as a separate object.
    const propHeight = 16 * (ENEMY_ART_DRAWN_PX / ENEMY_FRAME_SIZE) * PROP_BOOST
    expect(propHeight).toBeGreaterThan(4)
    expect(propHeight).toBeLessThan(ENEMY_ART_DRAWN_PX / 2)
  })
})
