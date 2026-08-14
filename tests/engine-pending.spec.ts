/** T2: pendingOf extraction from the session-list shape. */
import { describe, expect, it } from 'vitest'
import { pendingOf } from '../src/client/attention-engine.ts'
import type { PendingStatus } from '../src/client/attention-engine.ts'

function snapshot(byId: Record<string, { pendingInteraction?: PendingStatus } | undefined>) {
  return { byId }
}

describe('pendingOf', () => {
  it('returns an empty map when no session awaits the user', () => {
    expect(pendingOf(snapshot({ s1: {}, s2: { pendingInteraction: undefined } })).size).toBe(0)
  })

  it('extracts each session pending-interaction status verbatim', () => {
    const map = pendingOf(snapshot({
      s1: { pendingInteraction: 'question' },
      s2: { pendingInteraction: 'plan-review' },
      s3: { pendingInteraction: 'approval' },
      s4: {},
    }))
    expect([...map.entries()]).toEqual([
      ['s1', 'question'], ['s2', 'plan-review'], ['s3', 'approval'],
    ])
  })

  it('keeps the byId insertion order', () => {
    const map = pendingOf(snapshot({
      b: { pendingInteraction: 'approval' },
      a: { pendingInteraction: 'question' },
    }))
    expect([...map.keys()]).toEqual(['b', 'a'])
  })
})
