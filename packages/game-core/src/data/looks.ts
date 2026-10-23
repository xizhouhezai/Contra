/**
 * Persisted character looks (REQ-VAR-002).
 *
 * Kept under its own key rather than folded into the campaign progress blob:
 * the stage screen's reset clears progress, and losing the look a player picked
 * because they restarted the campaign is not what "reset progress" means. A
 * separate record also keeps the character and the look independent, which the
 * requirement asks for in so many words.
 *
 * The rule layer owns the shape and the fallback rule; it does not know which
 * looks exist, because the art catalogue is a presentation concern.
 */
import type { ProgressStorage } from '../stages/Progress.js'

const KEY = 'contra.looks.v1'

/** Character id to the look id last chosen for it. */
export type LookChoices = Readonly<Record<string, string>>

/**
 * Reads the saved looks, falling back to none when absent or unreadable.
 *
 * A save written before looks existed simply has no entry here, which has to
 * read as "nothing chosen yet" rather than as an error - the same tolerance
 * loadProgress gives a save with no stage records.
 */
export function loadLookChoices(storage: ProgressStorage): LookChoices {
  const raw = storage.get(KEY)
  if (raw === null) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    // An array is an object too, and its indices would come back as character
    // ids. Anything that is not a plain map is not a look record.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

    const choices: Record<string, string> = {}
    for (const [characterId, lookId] of Object.entries(parsed)) {
      if (typeof lookId !== 'string' || lookId === '') continue
      choices[characterId] = lookId
    }
    return choices
  } catch {
    // A corrupted look blob must not stop the select screen opening.
    return {}
  }
}

/**
 * Records one character's look and leaves the others alone.
 *
 * Read-modify-write rather than writing the caller's whole map: the other
 * characters' entries are re-read from storage, and any entry the loader
 * rejected is dropped by the same pass, so a half-corrupted blob heals the
 * first time the player switches a look.
 */
export function saveLookChoice(
  storage: ProgressStorage,
  characterId: string,
  lookId: string,
): void {
  const choices = loadLookChoices(storage)
  storage.set(KEY, JSON.stringify({ ...choices, [characterId]: lookId }))
}

/**
 * The look to show for a character, given what the catalogue still offers.
 *
 * A save outlives the art it names: a chibi file gets renamed, or a whole set
 * is dropped from a release. The fallback is the first available look - the
 * catalogue order is stable and its head is the one look every character has,
 * so the fallback cannot itself be missing.
 */
export function resolveLookId(
  saved: string | undefined,
  available: readonly string[],
): string | undefined {
  const first = available[0]
  if (first === undefined) return undefined
  if (saved === undefined) return first
  return available.includes(saved) ? saved : first
}
