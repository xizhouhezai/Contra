import type { InputState } from '@contra/game-core'
import type { InputSource } from '../interfaces/Input.js'

/**
 * Touch controls (T-M5-01).
 *
 * A virtual stick on the left and three buttons on the right, all mapped onto the
 * same {@link InputState} the keyboard produces, so the rule layer never learns
 * which device is being used (ADR-0003).
 *
 * The numbers here are deliberately not physics: stick radius and button size are
 * ergonomics. 44px is the smallest target a thumb hits reliably, which is why
 * MIN_TOUCH_TARGET_PX exists as a constant rather than a magic number in a style.
 */

/** Smallest reliable touch target, px (WCAG 2.5.5 asks for 44). */
export const MIN_TOUCH_TARGET_PX = 44

/** Radius of the virtual stick's travel, px. */
export const STICK_RADIUS_PX = 56

/** A circle the stick is dragged inside. */
export interface StickOrigin {
  readonly x: number
  readonly y: number
}

/** A point the stick has been dragged to. */
export interface StickPoint {
  readonly x: number
  readonly y: number
}

export type Axis = -1 | 0 | 1

/**
 * Maps a drag position onto a stick axis.
 *
 * The dead zone is a third of the radius: a thumb resting on the stick must not
 * register movement, and a third is far enough in that the eight aim directions
 * are still reachable. Diagonals snap by comparing absolute offsets.
 */
export function stickAxis(
  origin: StickOrigin,
  point: StickPoint,
): { readonly x: Axis; readonly y: Axis } {
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  const dead = STICK_RADIUS_PX / 3

  const axisX: Axis = Math.abs(dx) < dead ? 0 : dx > 0 ? 1 : -1
  const axisY: Axis = Math.abs(dy) < dead ? 0 : dy > 0 ? 1 : -1
  return { x: axisX, y: axisY }
}

/** The buttons a touch layout offers. */
export const TOUCH_BUTTONS = ['fire', 'jump', 'bomb'] as const
export type TouchButton = (typeof TOUCH_BUTTONS)[number]

/**
 * Turns held buttons into input fields.
 *
 * Separate from the DOM so it can be tested without a browser: the only thing
 * that needs a real screen is where the buttons are drawn.
 */
export function buttonsToInput(
  held: ReadonlySet<TouchButton>,
): Pick<InputState, 'fire' | 'jump' | 'bomb'> {
  return {
    fire: held.has('fire'),
    jump: held.has('jump'),
    bomb: held.has('bomb'),
  }
}

/** True when the viewport is taller than it is wide, i.e. a phone held upright. */
export function isPortrait(width: number, height: number): boolean {
  return height > width
}

/**
 * Whether a device should get the touch layout.
 *
 * Checked once at startup: a laptop with a touchscreen keeps its keyboard, and a
 * phone never shows the on-screen stick twice.
 */
export function wantsTouchControls(hasTouch: boolean, maxTouchPoints: number): boolean {
  return hasTouch && maxTouchPoints > 0
}

/** The `Element` subset a touch source needs, so tests stay DOM-free. */
export interface TouchTarget {
  addEventListener(type: string, listener: (event: unknown) => void): void
  removeEventListener(type: string, listener: (event: unknown) => void): void
}

/**
 * A touch input source.
 *
 * Holds the current stick axis and button set, updated by the scene that draws
 * the controls. The scene owns the pixels; this owns the state the rule layer
 * polls, which keeps the two concerns from bleeding into each other.
 */
export class TouchInputSource implements InputSource {
  private axis: { x: Axis; y: Axis } = { x: 0, y: 0 }
  private readonly held = new Set<TouchButton>()

  setStick(origin: StickOrigin, point: StickPoint): void {
    this.axis = stickAxis(origin, point)
  }

  clearStick(): void {
    this.axis = { x: 0, y: 0 }
  }

  press(button: TouchButton): void {
    this.held.add(button)
  }

  release(button: TouchButton): void {
    this.held.delete(button)
  }

  poll(): InputState {
    return {
      moveX: this.axis.x,
      moveY: this.axis.y,
      ...buttonsToInput(this.held),
    }
  }

  dispose(): void {
    this.held.clear()
    this.clearStick()
  }
}
