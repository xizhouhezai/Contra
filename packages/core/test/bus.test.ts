import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/bus.js'

interface Events {
  ping: { at: number }
  pong: string
}

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus<Events>()
    const seen: number[] = []
    bus.on('ping', (p) => seen.push(p.at))

    expect(bus.emit('ping', { at: 7 })).toBe(1)
    expect(seen).toEqual([7])
  })

  it('unsubscribes', () => {
    const bus = new EventBus<Events>()
    const spy = vi.fn()
    const off = bus.on('pong', spy)
    off()
    bus.emit('pong', 'x')
    expect(spy).not.toHaveBeenCalled()
  })

  it('isolates a throwing subscriber from the publisher', () => {
    const bus = new EventBus<Events>()
    const good = vi.fn()
    bus.on('pong', () => {
      throw new Error('subscriber exploded')
    })
    bus.on('pong', good)

    expect(bus.emit('pong', 'x')).toBe(1)
    expect(good).toHaveBeenCalledWith('x')
  })
})
