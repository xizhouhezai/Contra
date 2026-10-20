import { GRAYBOX_STAGE, type World, World as WorldClass } from '@contra/game-core'

/**
 * Seeds the rule-layer world from the gray-box stage definition.
 *
 * Kept free of Phaser so the wiring the StageScene relies on can be exercised in
 * plain Node: if this function and the stage data agree, the browser scene runs
 * the same simulation the test asserts on.
 */
export function createGrayboxWorld(): World {
  return new WorldClass({
    spawn: GRAYBOX_STAGE.spawn,
    platforms: GRAYBOX_STAGE.platforms,
    targets: GRAYBOX_STAGE.targets,
    exit: GRAYBOX_STAGE.exit,
  })
}
