import { describe, expect, it } from 'vitest'
import { compareVersions, maxVersion, parseVersion, type SemVer } from '../src/version.js'

/** Parses a version that the test knows to be well-formed. */
function version(input: string): SemVer {
  const parsed = parseVersion(input)
  if (parsed === null) {
    throw new Error(`expected a well-formed version: ${input}`)
  }
  return parsed
}

describe('parseVersion', () => {
  it('parses a release version', () => {
    expect(parseVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    })
  })

  it('parses a prerelease version', () => {
    expect(parseVersion('1.2.3-beta.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.1',
    })
  })

  it('rejects malformed input', () => {
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('v1.2.3')).toBeNull()
    expect(parseVersion('')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('orders by major, minor, then patch', () => {
    expect(compareVersions(version('1.0.0'), version('2.0.0'))).toBeLessThan(0)
    expect(compareVersions(version('2.0.0'), version('1.0.0'))).toBeGreaterThan(0)
    expect(compareVersions(version('1.0.0'), version('1.0.0'))).toBe(0)
  })

  it('sorts a prerelease before its release', () => {
    expect(compareVersions(version('1.0.0-alpha'), version('1.0.0'))).toBeLessThan(0)
    expect(compareVersions(version('1.0.0'), version('1.0.0-alpha'))).toBeGreaterThan(0)
  })

  it('picks the greater version', () => {
    expect(maxVersion(version('1.9.0'), version('1.10.0')).minor).toBe(10)
  })
})
