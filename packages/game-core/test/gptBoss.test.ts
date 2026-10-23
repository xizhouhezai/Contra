import { describe, expect, it } from 'vitest'
import { GPT_PETER_PAN, GPT_PHASE_LABELS, gptPhaseFor } from '../src/data/gptBoss.js'
import {
  allEchoesCleared,
  bodyUntargetable,
  createEchoState,
  damageEcho,
  ECHO_COUNT,
  echoesRemaining,
  maybeSplit,
  SPLIT_THRESHOLD,
} from '../src/systems/Echoes.js'
import {
  createMirrorState,
  MIRROR_BASE_WEAPON,
  MIRROR_COPY_SECONDS,
  mirrorWeapon,
  observePlayerWeapon,
  updateMirror,
} from '../src/systems/Mirror.js'

describe('镜像使徒 (T-M3-04)', () => {
  it('starts on its base weapon', () => {
    const state = createMirrorState()
    expect(mirrorWeapon(state)).toBe(MIRROR_BASE_WEAPON)
    expect(state.copying).toBe(false)
  })

  it('copies whatever the player is firing', () => {
    const state = createMirrorState()
    observePlayerWeapon(state, 'scatter')
    expect(mirrorWeapon(state)).toBe('scatter')

    // Switching weapon switches the copy - that is the gimmick.
    observePlayerWeapon(state, 'pierce')
    expect(mirrorWeapon(state)).toBe('pierce')
  })

  it('expires the copy after its window', () => {
    const state = createMirrorState()
    observePlayerWeapon(state, 'laser')
    updateMirror(state, MIRROR_COPY_SECONDS - 0.1)
    expect(mirrorWeapon(state)).toBe('laser')

    updateMirror(state, 0.2)
    expect(mirrorWeapon(state)).toBe(MIRROR_BASE_WEAPON)
    expect(state.copying).toBe(false)
  })

  it('refreshes the window when the player switches again', () => {
    const state = createMirrorState()
    observePlayerWeapon(state, 'scatter')
    updateMirror(state, 5)
    observePlayerWeapon(state, 'prism')
    updateMirror(state, 5)
    expect(mirrorWeapon(state)).toBe('prism')
  })
})

describe('Echo split (T-M3-06)', () => {
  it('splits into three echoes at the threshold', () => {
    const state = createEchoState()
    expect(maybeSplit(state, 1200 * 0.5, 1200, 50)).toBe(false)
    expect(state.split).toBe(false)

    expect(maybeSplit(state, 1200 * SPLIT_THRESHOLD, 1200, 50)).toBe(true)
    expect(state.echoes).toHaveLength(ECHO_COUNT)
    expect(ECHO_COUNT).toBe(3)
    expect(bodyUntargetable(state)).toBe(true)
  })

  it('splits only once', () => {
    const state = createEchoState()
    maybeSplit(state, 100, 1200, 50)
    expect(maybeSplit(state, 50, 1200, 50)).toBe(false)
    expect(state.echoes).toHaveLength(ECHO_COUNT)
  })

  it('hides the body while any echo lives', () => {
    const state = createEchoState()
    maybeSplit(state, 100, 1200, 40)

    damageEcho(state, 'echo-1', 40)
    expect(bodyUntargetable(state)).toBe(true)
    expect(echoesRemaining(state)).toBe(2)
  })

  it('exposes the body once all echoes fall', () => {
    const state = createEchoState()
    maybeSplit(state, 100, 1200, 40)
    for (const id of ['echo-1', 'echo-2', 'echo-3']) damageEcho(state, id, 40)

    expect(allEchoesCleared(state)).toBe(true)
    expect(bodyUntargetable(state)).toBe(false)
    expect(echoesRemaining(state)).toBe(0)
  })

  it('ignores damage to an already dead echo', () => {
    const state = createEchoState()
    maybeSplit(state, 100, 1200, 10)
    expect(damageEcho(state, 'echo-1', 10)).toBe(true)
    expect(damageEcho(state, 'echo-1', 10)).toBe(false)
  })
})

describe('GPT four-phase order (T-M3-06)', () => {
  it('walks 1 -> 2 -> 3 -> 4 in order', () => {
    // 100%-70% is form I's opening, 70%-40% its second half.
    expect(gptPhaseFor(1200, 1200, false)).toBe(1)
    expect(gptPhaseFor(1000, 1200, false)).toBe(1)
    expect(gptPhaseFor(800, 1200, false)).toBe(2)
    // At or below 40% the body splits; only the echo clear opens phase 4.
    expect(gptPhaseFor(400, 1200, false)).toBe(3)
    expect(gptPhaseFor(400, 1200, true)).toBe(4)
  })

  it('defines four phases', () => {
    expect(GPT_PETER_PAN.phases).toHaveLength(4)
    expect(GPT_PHASE_LABELS).toHaveLength(4)
  })

  it('leaves the interlude without moves', () => {
    const interlude = GPT_PETER_PAN.phases.find((phase) => phase.phase === 3)
    expect(interlude?.moves).toHaveLength(0)
  })

  /** Non-optional phase access: a form missing from the data should fail loudly. */
  function phaseOf(index: number) {
    const phase = GPT_PETER_PAN.phases[index]
    if (phase === undefined) throw new Error(`no phase ${index} on ${GPT_PETER_PAN.id}`)
    return phase
  }

  it('names every move of the two forms', () => {
    const formOne = phaseOf(0).moves.map((m) => m.id)
    const formTwo = phaseOf(3).moves.map((m) => m.id)
    expect(formOne).toEqual(['data-flood', 'compress-wave', 'sample-draw'])
    expect(formTwo).toEqual(['emergent-proliferation', 'overfit', 'collapse'])
  })

  it('gets faster in the final phase', () => {
    expect(phaseOf(3).speedMultiplier).toBeGreaterThan(phaseOf(0).speedMultiplier)
  })
})
