/** T3: diffPending — added / changed / cleared transitions between pending maps. */
import { describe, expect, it } from 'vitest'
import { diffPending } from '../src/client/attention-engine.ts'
import type { PendingStatus } from '../src/client/attention-engine.ts'

function map(entries: ReadonlyArray<readonly [string, PendingStatus]>): Map<string, PendingStatus> {
  return new Map(entries)
}

describe('diffPending', () => {
  it('reports none -> status as added', () => {
    const diff = diffPending(map([]), map([['s1', 'question']]))
    expect([...diff.added]).toEqual([['s1', 'question']])
    expect(diff.changed.size).toBe(0)
    expect(diff.cleared.size).toBe(0)
  })

  it('reports a new session arriving with a pending status as added', () => {
    const diff = diffPending(map([['s1', 'approval']]), map([['s1', 'approval'], ['s2', 'question']]))
    expect([...diff.added]).toEqual([['s2', 'question']])
    expect(diff.changed.size).toBe(0)
    expect(diff.cleared.size).toBe(0)
  })

  it('reports status -> different status as changed', () => {
    const diff = diffPending(map([['s1', 'question']]), map([['s1', 'approval']]))
    expect(diff.added.size).toBe(0)
    expect([...diff.changed]).toEqual([['s1', 'approval']])
    expect(diff.cleared.size).toBe(0)
  })

  it('reports status -> none as cleared', () => {
    const diff = diffPending(map([['s1', 'plan-review']]), map([]))
    expect(diff.added.size).toBe(0)
    expect(diff.changed.size).toBe(0)
    expect([...diff.cleared]).toEqual(['s1'])
  })

  it('reports a vanishing session as cleared', () => {
    const diff = diffPending(map([['s1', 'question'], ['s2', 'question']]), map([['s1', 'question']]))
    expect(diff.added.size).toBe(0)
    expect(diff.changed.size).toBe(0)
    expect([...diff.cleared]).toEqual(['s2'])
  })

  it('reports nothing when the pending set is unchanged', () => {
    const diff = diffPending(map([['s1', 'question']]), map([['s1', 'question']]))
    expect(diff.added.size).toBe(0)
    expect(diff.changed.size).toBe(0)
    expect(diff.cleared.size).toBe(0)
  })

  it('reports mixed added/changed/cleared in one diff', () => {
    const diff = diffPending(
      map([['a', 'question'], ['b', 'approval'], ['c', 'plan-review']]),
      map([['a', 'question'], ['b', 'plan-review'], ['d', 'question']]),
    )
    expect([...diff.added]).toEqual([['d', 'question']])
    expect([...diff.changed]).toEqual([['b', 'plan-review']])
    expect([...diff.cleared]).toEqual(['c'])
  })
})
