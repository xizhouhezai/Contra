/** A single parsed command line argument. */
export interface ParsedArg {
  /** The flag name without leading dashes, e.g. "version". */
  readonly name: string
  /** The inline value when written as --name=value, otherwise null. */
  readonly value: string | null
  /** True for the "-v" / "--version" style short flags. */
  readonly isShort: boolean
}

/**
 * Parses an argv slice (without node and script) into flags and positional
 * arguments. Supports "--name", "--name=value", and "-n" forms.
 */
export function parseArgs(argv: readonly string[]): {
  flags: ParsedArg[]
  positionals: string[]
} {
  const flags: ParsedArg[] = []
  const positionals: string[] = []

  for (const token of argv) {
    if (token.startsWith('--')) {
      const body = token.slice(2)
      const eq = body.indexOf('=')
      if (eq === -1) {
        flags.push({ name: body, value: null, isShort: false })
      } else {
        flags.push({ name: body.slice(0, eq), value: body.slice(eq + 1), isShort: false })
      }
      continue
    }

    if (token.startsWith('-') && token.length > 1) {
      flags.push({ name: token.slice(1), value: null, isShort: true })
      continue
    }

    positionals.push(token)
  }

  return { flags, positionals }
}

/** Reads a long flag value, falling back to a default. */
export function readFlag(
  flags: readonly ParsedArg[],
  name: string,
  fallback: string | null = null,
): string | null {
  const found = flags.find((flag) => !flag.isShort && flag.name === name)
  return found ? (found.value ?? '') : fallback
}

/** True when the named long flag is present. */
export function hasFlag(flags: readonly ParsedArg[], name: string): boolean {
  return flags.some((flag) => !flag.isShort && flag.name === name)
}
