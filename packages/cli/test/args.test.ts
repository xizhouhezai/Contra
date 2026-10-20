import { describe, expect, it } from 'vitest'
import { hasFlag, parseArgs, readFlag } from '../src/args.js'

describe('parseArgs', () => {
  it('separates flags from positionals', () => {
    const { flags, positionals } = parseArgs(['doctor', '--verbose', 'extra'])
    expect(positionals).toEqual(['doctor', 'extra'])
    expect(flags).toHaveLength(1)
  })

  it('reads inline flag values', () => {
    const { flags } = parseArgs(['--name=contra'])
    expect(readFlag(flags, 'name')).toBe('contra')
  })

  it('treats a valueless long flag as an empty string', () => {
    const { flags } = parseArgs(['--name'])
    expect(readFlag(flags, 'name')).toBe('')
  })

  it('detects short flags separately', () => {
    const { flags } = parseArgs(['-v'])
    expect(flags[0]?.isShort).toBe(true)
    expect(hasFlag(flags, 'v')).toBe(false)
  })

  it('falls back to a default when the flag is absent', () => {
    const { flags } = parseArgs([])
    expect(readFlag(flags, 'name', 'fallback')).toBe('fallback')
  })
})
