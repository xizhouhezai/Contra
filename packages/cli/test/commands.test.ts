import { EventBus } from '@contra/core'
import { describe, expect, it } from 'vitest'
import { type CliEvents, resolveCommand, runCommand } from '../src/commands.js'

describe('resolveCommand', () => {
  it('keeps known commands', () => {
    expect(resolveCommand('version')).toBe('version')
    expect(resolveCommand('doctor')).toBe('doctor')
  })

  it('falls back to help for unknown input', () => {
    expect(resolveCommand('nonsense')).toBe('help')
    expect(resolveCommand(undefined)).toBe('help')
  })
})

describe('runCommand', () => {
  it('prints the version', () => {
    const result = runCommand({ name: 'version', args: [] }, '9.9.9')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('contra 9.9.9')
  })

  it('lists commands in help output', () => {
    const result = runCommand({ name: 'help', args: [] }, '1.0.0')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('doctor')
  })

  it('emits progress events', () => {
    const bus = new EventBus<CliEvents>()
    const seen: string[] = []
    bus.on('command', (payload) => seen.push(payload.name))
    bus.on('message', (payload) => seen.push(payload.text))

    runCommand({ name: 'doctor', args: [] }, '1.0.0', bus)
    expect(seen).toContain('doctor')
    expect(seen).toContain('checks complete')
  })
})
