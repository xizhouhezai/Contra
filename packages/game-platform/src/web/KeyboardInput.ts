import type { InputState } from '@contra/game-core'
import type { InputSource } from '../interfaces/Input.js'

/** Key bindings from docs/game/requirements/gameplay.md §操作. */
const MOVE_LEFT = new Set(['ArrowLeft', 'KeyA'])
const MOVE_RIGHT = new Set(['ArrowRight', 'KeyD'])
const AIM_UP = new Set(['ArrowUp', 'KeyW'])
const AIM_DOWN = new Set(['ArrowDown', 'KeyS'])
const JUMP = new Set(['Space', 'KeyZ'])
const FIRE = new Set(['KeyJ', 'KeyX'])
const BOMB = new Set(['KeyK', 'ShiftLeft', 'ShiftRight'])

type Axis = -1 | 0 | 1

/** The keyboard event shape the source reads; kept tiny so tests stay DOM-free. */
export interface KeyEventLike {
  readonly code: string
  preventDefault?(): void
}

/** The `EventTarget` subset the keyboard source needs. */
export interface KeyboardTarget {
  addEventListener(type: 'keydown' | 'keyup', listener: (event: KeyEventLike) => void): void
  removeEventListener(type: 'keydown' | 'keyup', listener: (event: KeyEventLike) => void): void
}

function hasAny(held: ReadonlySet<string>, keys: ReadonlySet<string>): boolean {
  for (const key of keys) if (held.has(key)) return true
  return false
}

function isGameKey(code: string): boolean {
  for (const set of [MOVE_LEFT, MOVE_RIGHT, AIM_UP, AIM_DOWN, JUMP, FIRE, BOMB]) {
    if (set.has(code)) return true
  }
  return false
}

function axisOf(held: ReadonlySet<string>, negative: Set<string>, positive: Set<string>): Axis {
  const neg = hasAny(held, negative)
  const pos = hasAny(held, positive)
  if (neg === pos) return 0
  return pos ? 1 : -1
}

/**
 * Maps keyboard events to {@link InputState}.
 *
 * Opposing keys cancel, which is what keeps the eight aim directions stable when
 * the player rolls from one key to another. Game keys are `preventDefault`-ed so
 * arrows and space do not scroll the page.
 */
export class KeyboardInputSource implements InputSource {
  private readonly held = new Set<string>()
  private readonly target: KeyboardTarget
  private readonly onKeyDown: (event: KeyEventLike) => void
  private readonly onKeyUp: (event: KeyEventLike) => void

  constructor(target: KeyboardTarget) {
    this.target = target
    this.onKeyDown = (event) => {
      if (isGameKey(event.code)) event.preventDefault?.()
      this.held.add(event.code)
    }
    this.onKeyUp = (event) => {
      this.held.delete(event.code)
    }
    this.target.addEventListener('keydown', this.onKeyDown)
    this.target.addEventListener('keyup', this.onKeyUp)
  }

  poll(): InputState {
    return {
      moveX: axisOf(this.held, MOVE_LEFT, MOVE_RIGHT),
      moveY: axisOf(this.held, AIM_UP, AIM_DOWN),
      jump: hasAny(this.held, JUMP),
      fire: hasAny(this.held, FIRE),
      bomb: hasAny(this.held, BOMB),
    }
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown)
    this.target.removeEventListener('keyup', this.onKeyUp)
    this.held.clear()
  }
}
