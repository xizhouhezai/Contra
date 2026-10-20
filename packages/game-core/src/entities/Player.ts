import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../data/constants.js'
import type { MutableVec2, Rect, Vec2 } from '../data/types.js'

/** Mutable rule-layer state of the player. */
export interface PlayerState {
  /** Top-left corner of the collision box, in world pixels. */
  readonly position: MutableVec2
  readonly velocity: MutableVec2
  onGround: boolean
  facing: 1 | -1
}

/** Creates a grounded-unknown player whose top-left corner sits at `spawn`. */
export function createPlayer(spawn: Vec2): PlayerState {
  return {
    position: { x: spawn.x, y: spawn.y },
    velocity: { x: 0, y: 0 },
    onGround: false,
    facing: 1,
  }
}

/** The axis-aligned collision box the player occupies right now. */
export function playerRect(player: PlayerState): Rect {
  return {
    x: player.position.x,
    y: player.position.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  }
}
