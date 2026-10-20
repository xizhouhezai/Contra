/** A parsed semantic version. */
export interface SemVer {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: string | null
}

/**
 * Parses a "major.minor.patch[-prerelease]" string.
 * Returns null when the input is not a well-formed version.
 */
export function parseVersion(input: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(input.trim())
  if (!match) return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

/**
 * Compares two versions. A prerelease sorts before its own release
 * (semver.org rule 11): 1.0.0-alpha precedes 1.0.0.
 */
export function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  if (a.patch !== b.patch) return a.patch - b.patch
  if (a.prerelease === b.prerelease) return 0
  if (a.prerelease === null) return 1
  if (b.prerelease === null) return -1
  return a.prerelease < b.prerelease ? -1 : 1
}

/** Returns the greater of two versions. */
export function maxVersion(a: SemVer, b: SemVer): SemVer {
  return compareVersions(a, b) >= 0 ? a : b
}
