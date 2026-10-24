/**
 * REQ-NFR-005: 键盘与触屏双输入
 *
 * Named here so scripts/report-traceability.mjs can follow the chain from the
 * requirement through the task to this file.
 */
import { describe, expect, it } from 'vitest'
import {
  buttonsToInput,
  isPortrait,
  MIN_TOUCH_TARGET_PX,
  STICK_RADIUS_PX,
  stickAxis,
  TouchInputSource,
  wantsTouchControls,
} from '../src/web/TouchInput'

const ORIGIN = { x: 100, y: 400 }

describe('Virtual stick (T-M5-01)', () => {
  it('reports no movement inside the dead zone', () => {
    expect(stickAxis(ORIGIN, { x: 100, y: 400 })).toEqual({ x: 0, y: 0 })
    expect(stickAxis(ORIGIN, { x: 105, y: 405 })).toEqual({ x: 0, y: 0 })
  })

  it('maps a full drag to the cardinal directions', () => {
    expect(stickAxis(ORIGIN, { x: 100 + STICK_RADIUS_PX, y: 400 })).toEqual({ x: 1, y: 0 })
    expect(stickAxis(ORIGIN, { x: 100 - STICK_RADIUS_PX, y: 400 })).toEqual({ x: -1, y: 0 })
    expect(stickAxis(ORIGIN, { x: 100, y: 400 + STICK_RADIUS_PX })).toEqual({ x: 0, y: 1 })
    expect(stickAxis(ORIGIN, { x: 100, y: 400 - STICK_RADIUS_PX })).toEqual({ x: 0, y: -1 })
  })

  it('reaches all eight directions', () => {
    const seen = new Set<string>()
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        if (dx === 0 && dy === 0) continue
        const a = stickAxis(ORIGIN, {
          x: 100 + dx * STICK_RADIUS_PX,
          y: 400 + dy * STICK_RADIUS_PX,
        })
        seen.add(`${a.x},${a.y}`)
      }
    }
    expect(seen.size).toBe(8)
  })

  it('drives the same InputState the keyboard does', () => {
    const source = new TouchInputSource()
    source.setStick(ORIGIN, { x: 100 + STICK_RADIUS_PX, y: 400 - STICK_RADIUS_PX })
    source.press('fire')
    const state = source.poll()
    expect(state.moveX).toBe(1)
    expect(state.moveY).toBe(-1)
    expect(state.fire).toBe(true)
    source.dispose()
  })
})

describe('Touch buttons (T-M5-01)', () => {
  it('exposes exactly three buttons', () => {
    expect(buttonsToInput(new Set(['fire', 'jump', 'bomb']))).toEqual({
      fire: true,
      jump: true,
      bomb: true,
    })
  })

  it('reports released buttons as false', () => {
    expect(buttonsToInput(new Set())).toEqual({ fire: false, jump: false, bomb: false })
  })

  it('releases a button independently', () => {
    const source = new TouchInputSource()
    source.press('fire')
    source.press('jump')
    source.release('fire')
    const state = source.poll()
    expect(state.fire).toBe(false)
    expect(state.jump).toBe(true)
  })

  it('keeps targets at or above the 44px minimum', () => {
    expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44)
  })
})

describe('Touch layout detection (T-M5-01)', () => {
  it('detects portrait orientation', () => {
    expect(isPortrait(390, 844)).toBe(true)
    expect(isPortrait(844, 390)).toBe(false)
  })

  it('only offers touch controls on a real touch device', () => {
    expect(wantsTouchControls(true, 5)).toBe(true)
    expect(wantsTouchControls(false, 0)).toBe(false)
    expect(wantsTouchControls(true, 0)).toBe(false)
  })
})
