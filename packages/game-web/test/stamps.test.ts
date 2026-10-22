import { describe, expect, it } from 'vitest'
import { STAMP_GRADES, stampFor, stampKey } from '../src/assets/stamps'

/** Clear stamps (T-M6-20). */

describe('Grade to stamp mapping', () => {
  it('maps each letter grade to its own stamp', () => {
    expect(stampFor('S')).toBe('S')
    expect(stampFor('A')).toBe('A')
    expect(stampFor('B')).toBe('B')
  })

  it('gives C the plain clear stamp rather than inventing a fourth badge', () => {
    // A run that merely finished should not be dressed up as an achievement.
    expect(stampFor('C')).toBe('C')
  })

  it('is case insensitive and tolerates surrounding space', () => {
    expect(stampFor(' s ')).toBe('S')
    expect(stampFor('a')).toBe('A')
  })

  it('falls back to the clear stamp for anything unrecognised', () => {
    // gradeRun can grow new letters; an unknown one must still render.
    expect(stampFor('Z')).toBe('C')
    expect(stampFor('')).toBe('C')
  })
})

describe('Stamp keys', () => {
  it('prefixes every key so it cannot collide with other art', () => {
    expect(stampKey('S')).toBe('stamp-S')
  })

  it('list every grade so the loader can preload them all', () => {
    expect([...STAMP_GRADES]).toEqual(['S', 'A', 'B', 'C'])
  })

  it('gives each grade a distinct key', () => {
    const keys = STAMP_GRADES.map((g) => stampKey(g))
    expect(new Set(keys).size).toBe(4)
  })
})
