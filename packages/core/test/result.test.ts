import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, mapResult, ok, unwrapOr } from '../src/result.js'

describe('Result', () => {
  it('narrows the success branch', () => {
    const result = ok(42)
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
    if (isOk(result)) expect(result.value).toBe(42)
  })

  it('narrows the failure branch', () => {
    const result = err(new Error('boom'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.message).toBe('boom')
  })

  it('maps only the success branch', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 })
    const failure = err<string>('nope')
    expect(mapResult(failure, (n: number) => n * 3)).toEqual({ ok: false, error: 'nope' })
  })

  it('falls back on failure', () => {
    expect(unwrapOr(ok('a'), 'b')).toBe('a')
    expect(unwrapOr(err<string>('x'), 'b')).toBe('b')
  })
})
