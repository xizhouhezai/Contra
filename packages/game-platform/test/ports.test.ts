import type { InputState } from '@contra/game-core'
import { describe, expect, it, vi } from 'vitest'
import type {
  AudioPort,
  HapticPattern,
  Haptics,
  InputSource,
  Lifecycle,
  Storage,
} from '../src/index.js'
import {
  DocumentLifecycle,
  KeyboardInputSource,
  LocalStorageAdapter,
  NoopLifecycle,
  VibrationHaptics,
  WebAudioAdapter,
} from '../src/index.js'

/** Compile-time proof that the browser classes satisfy the five ports. */
const inputSource: InputSource = new KeyboardInputSource({
  addEventListener: () => {},
  removeEventListener: () => {},
})
const storage: Storage = new LocalStorageAdapter(null)
const audio: AudioPort = new WebAudioAdapter(() => ({
  volume: 0,
  currentTime: 0,
  play: () => {},
  pause: () => {},
}))
const lifecycle: Lifecycle = new NoopLifecycle()
const haptics: Haptics = new VibrationHaptics(null)

function fakeTarget() {
  const listeners = new Map<string, ((event: { code: string; preventDefault(): void }) => void)[]>()
  return {
    addEventListener(
      type: string,
      listener: (event: { code: string; preventDefault(): void }) => void,
    ) {
      const list = listeners.get(type) ?? []
      list.push(listener)
      listeners.set(type, list)
    },
    removeEventListener(
      type: string,
      listener: (event: { code: string; preventDefault(): void }) => void,
    ) {
      const list = listeners.get(type) ?? []
      listeners.set(
        type,
        list.filter((entry) => entry !== listener),
      )
    },
    dispatch(type: string, code: string) {
      for (const listener of listeners.get(type) ?? []) listener({ code, preventDefault: () => {} })
    },
    count(type: string) {
      return (listeners.get(type) ?? []).length
    },
  }
}

describe('platform ports (T-M0-08)', () => {
  it('exposes the five interfaces as assignable contracts', () => {
    const probe: InputState = inputSource.poll()
    expect(Object.keys(probe).sort()).toEqual(['bomb', 'fire', 'jump', 'moveX', 'moveY'])

    storage.set('k', 'v')
    expect(storage.get('k')).toBe('v')
    lifecycle.onPause(() => {})
    lifecycle.onResume(() => {})
    const pattern: HapticPattern = 'light'
    haptics.pulse(pattern)
    audio.setVolume('master', 0.5)
    expect(audio).toBeDefined()
  })

  it('maps keyboard state to InputState and cancels opposing keys', () => {
    const target = fakeTarget()
    const source = new KeyboardInputSource(target)

    target.dispatch('keydown', 'KeyD')
    expect(source.poll()).toEqual({ moveX: 1, moveY: 0, jump: false, fire: false, bomb: false })

    target.dispatch('keydown', 'ArrowLeft')
    expect(source.poll().moveX).toBe(0)

    target.dispatch('keyup', 'ArrowLeft')
    target.dispatch('keydown', 'KeyW')
    expect(source.poll().moveX).toBe(1)
    expect(source.poll().moveY).toBe(-1)

    target.dispatch('keydown', 'Space')
    expect(source.poll().jump).toBe(true)

    source.dispose()
    expect(target.count('keydown')).toBe(0)
  })

  it('prevents the default browser action for game keys only', () => {
    const target = fakeTarget()
    const source = new KeyboardInputSource(target)
    const prevented: string[] = []
    const listeners: ((event: { code: string; preventDefault(): void }) => void)[] = []
    const spyTarget = {
      addEventListener(_t: string, l: (event: { code: string; preventDefault(): void }) => void) {
        listeners.push(l)
      },
      removeEventListener() {},
    }
    const spySource = new KeyboardInputSource(spyTarget)
    for (const listener of listeners) {
      listener({ code: 'Space', preventDefault: () => prevented.push('Space') })
      listener({ code: 'KeyP', preventDefault: () => prevented.push('KeyP') })
    }

    expect(prevented).toEqual(['Space'])
    spySource.dispose()
    source.dispose()
  })

  it('persists through the storage backend and survives a broken one', () => {
    const memory = new Map<string, string>()
    const adapter = new LocalStorageAdapter({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
      clear: () => memory.clear(),
    })

    adapter.set('highScore', '12345')
    expect(adapter.get('highScore')).toBe('12345')
    expect(memory.get('highScore')).toBe('12345')

    adapter.remove('highScore')
    expect(adapter.get('highScore')).toBeNull()

    const broken = new LocalStorageAdapter({
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
      clear: () => {
        throw new Error('denied')
      },
    })
    broken.set('a', 'b')
    expect(broken.get('a')).toBe('b')
    broken.remove('a')
    expect(broken.get('a')).toBeNull()
  })

  it('applies the master multiplier to bgm volume', () => {
    const volumes: number[] = []
    const adapter = new WebAudioAdapter(() => ({
      set volume(value: number) {
        volumes.push(value)
      },
      get volume() {
        return 0
      },
      currentTime: 0,
      play: () => {},
      pause: () => {},
    }))

    adapter.setVolume('master', 0.5)
    adapter.setVolume('bgm', 0.5)
    adapter.playBgm('bgm-01')

    expect(volumes.at(-1)).toBeCloseTo(0.25, 10)
    adapter.stopBgm()
  })

  it('fires lifecycle callbacks on visibility change', () => {
    const listeners: (() => void)[] = []
    let state = 'visible'
    const target = {
      get visibilityState() {
        return state
      },
      addEventListener(_t: 'visibilitychange', l: () => void) {
        listeners.push(l)
      },
      removeEventListener() {},
    }
    const lifecycleAdapter = new DocumentLifecycle(target)
    const pause = vi.fn()
    const resume = vi.fn()
    lifecycleAdapter.onPause(pause)
    lifecycleAdapter.onResume(resume)

    state = 'hidden'
    for (const listener of listeners) listener()
    expect(pause).toHaveBeenCalledTimes(1)

    state = 'visible'
    for (const listener of listeners) listener()
    expect(resume).toHaveBeenCalledTimes(1)
    lifecycleAdapter.dispose()
  })

  it('routes haptic patterns to the vibration API', () => {
    const calls: number[] = []
    const adapter = new VibrationHaptics((ms) => {
      calls.push(ms)
      return true
    })

    adapter.pulse('light')
    adapter.pulse('medium')
    adapter.pulse('heavy')

    expect(calls).toEqual([10, 25, 60])
    expect(() => new VibrationHaptics(null).pulse('heavy')).not.toThrow()
  })
})
