/**
 * A discriminated union describing an operation that either succeeded or failed.
 * Used instead of throwing so that callers must handle the failure branch.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** Wraps a value in a successful Result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Wraps an error in a failed Result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** Maps the success branch of a Result, leaving the failure branch untouched. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

/** Narrows a Result to its success branch. */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

/** Narrows a Result to its failure branch. */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}

/** Returns the success value, or the provided fallback when the result failed. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}
