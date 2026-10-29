import type Phaser from 'phaser'
import { describe, expect, it } from 'vitest'
import { preloadStamp, STAMP_GRADES, stampFor, stampKey, stampUrl } from '../src/assets/stamps'

/** Clear stamps (T-M6-20). */

/** Records the keys a loader was asked for, without a real Phaser loader. */
function queueingLoader(): { load: Phaser.Loader.LoaderPlugin; queued: string[] } {
  const queued: string[] = []
  const load = {
    image: (key: string) => {
      queued.push(key)
    },
  } as unknown as Phaser.Loader.LoaderPlugin
  return { load, queued }
}

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

  /**
   * Stamps moved out of the boot load (0.94MB off the critical path of
   * REQ-NFR-002), so ResultScene now queues exactly the grade it earned.
   */
  it('queues the stamp for one grade and only that one', () => {
    const { load, queued } = queueingLoader()

    preloadStamp(load, 'A')

    expect(queued).toEqual([stampKey('A')])
  })

  it('never queues a key for a grade that has no file', () => {
    // Every grade ships art today, so this documents the guard: the loader must
    // not be handed `stamp-X` with an undefined url if a file is ever removed.
    for (const grade of STAMP_GRADES) {
      const { load, queued } = queueingLoader()
      preloadStamp(load, grade)

      const hasFile = stampUrl(grade) !== undefined
      expect(queued).toHaveLength(hasFile ? 1 : 0)
      if (hasFile) expect(queued[0]).toBe(stampKey(grade))
    }
  })
})
