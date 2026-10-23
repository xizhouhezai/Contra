import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The stage definition has to reach the World.
 *
 * The mechanics arrived as a rule-layer module with its own unit tests, and
 * every one of those tests passed while the mechanics did nothing in the game:
 * StageScene built the World without the stage attached, so
 * `options.stage?.bounceWalls` was always undefined. A bounce wall that never
 * reflected a round, a moving platform that stood still, a vertical stage that
 * scrolled sideways.
 *
 * The unit tests could not catch it because they construct a World directly with
 * the stage in place. They bypass the one call site that decides what the game
 * actually gives the rule layer.
 *
 * So this reads the source. It is a blunt instrument - a grep would be - but the
 * failure it guards against is a silent one: the build stays green and the player
 * plays a stage that behaves like every other stage.
 */
const source = readFileSync(
  fileURLToPath(new URL('../src/scenes/StageScene.ts', import.meta.url)),
  'utf8',
)

describe('stage wiring (T-M2-01)', () => {
  it('hands the stage definition to the World', () => {
    // The check searches for the property itself rather than for a span of the
    // options object: a fixed character count misses the property whenever the
    // option list grows, and a brace match lands on the wrong closing brace.
    expect(source).toContain('stage: this.stage')
  })

  it('does not build the World without the stage', () => {
    // A second World construction would be a second place to forget.
    const calls = source.split('new World(').length - 1
    expect(calls).toBe(1)
  })
})
