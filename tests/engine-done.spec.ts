/** T15: turn-finished detection — running edges, dedupe, gating, seeding, subagent filter. */
import { describe, expect, it } from 'vitest'
import { initialState, step } from '../src/client/attention-engine.ts'
import type { PendingStatus, SessionListLike } from '../src/client/attention-engine.ts'

const SETTINGS = { enabled: true, titleFlash: true, onlyWhenHidden: true, notifyOnDone: true }

interface Row {
  pendingInteraction?: PendingStatus
  running?: boolean
  updatedAt?: number
  origin?: string
}

function snapshot(byId: Record<string, Row | undefined>): SessionListLike {
  return { byId }
}

describe('turn-finished detection', () => {
  it('emits done when a session goes running true -> false while not on top', () => {
    const first = step(initialState(), snapshot({ s1: { running: true, updatedAt: 1 } }), SETTINGS, true)
    expect(first.actions).toEqual([])
    const second = step(first.state, snapshot({ s1: { running: false, updatedAt: 2 } }), SETTINGS, true)
    expect(second.actions).toContainEqual({ kind: 'done', sessionId: 's1' })
  })

  it('stays quiet for the CURRENT session while the page is on top (onlyWhenHidden)', () => {
    const first = step(initialState(), { ...snapshot({ s1: { running: true, updatedAt: 1 } }), current: 's1' }, SETTINGS, false)
    const second = step(first.state, { ...snapshot({ s1: { running: false, updatedAt: 2 } }), current: 's1' }, SETTINGS, false)
    expect(second.actions).toEqual([])
    // The edge was consumed; hiding later must not fire a stale done.
    const third = step(second.state, { ...snapshot({ s1: { running: false, updatedAt: 2 } }), current: 's1' }, SETTINGS, true)
    expect(third.actions.filter(a => a.kind === 'done')).toEqual([])
  })

  it('emits done on top when onlyWhenHidden is off', () => {
    const first = step(initialState(), snapshot({ s1: { running: true, updatedAt: 1 } }), SETTINGS, false)
    const second = step(first.state, snapshot({ s1: { running: false, updatedAt: 2 } }), { ...SETTINGS, onlyWhenHidden: false }, false)
    expect(second.actions).toContainEqual({ kind: 'done', sessionId: 's1' })
  })

  it('respects the notifyOnDone switch', () => {
    const first = step(initialState(), snapshot({ s1: { running: true, updatedAt: 1 } }), SETTINGS, true)
    const second = step(first.state, snapshot({ s1: { running: false, updatedAt: 2 } }), { ...SETTINGS, notifyOnDone: false }, true)
    expect(second.actions.filter(a => a.kind === 'done')).toEqual([])
  })

  it('fires once per turn (deduped by updatedAt) and again for the next turn', () => {
    let state = initialState()
    state = step(state, snapshot({ s1: { running: true, updatedAt: 1 } }), SETTINGS, true).state
    let out = step(state, snapshot({ s1: { running: false, updatedAt: 2 } }), SETTINGS, true)
    expect(out.actions.filter(a => a.kind === 'done')).toHaveLength(1)
    // Same snapshot again: no repeat.
    out = step(out.state, snapshot({ s1: { running: false, updatedAt: 2 } }), SETTINGS, true)
    expect(out.actions.filter(a => a.kind === 'done')).toHaveLength(0)
    // Next turn: running again, then done again at a new updatedAt.
    state = step(out.state, snapshot({ s1: { running: true, updatedAt: 3 } }), SETTINGS, true).state
    out = step(state, snapshot({ s1: { running: false, updatedAt: 4 } }), SETTINGS, true)
    expect(out.actions.filter(a => a.kind === 'done')).toHaveLength(1)
  })

  it('does not fire for an already-idle session present at seed', () => {
    const out = step(initialState(), snapshot({ s1: { running: false, updatedAt: 5 } }), SETTINGS, true)
    expect(out.actions.filter(a => a.kind === 'done')).toEqual([])
  })

  it('ignores subagent rows', () => {
    const first = step(initialState(), snapshot({ s1: { running: true, updatedAt: 1, origin: 'subagent' } }), SETTINGS, true)
    const second = step(first.state, snapshot({ s1: { running: false, updatedAt: 2, origin: 'subagent' } }), SETTINGS, true)
    expect(second.actions.filter(a => a.kind === 'done')).toEqual([])
  })

  it('alerts for each of several finishing sessions', () => {
    let state = step(initialState(), snapshot({ a: { running: true, updatedAt: 1 }, b: { running: true, updatedAt: 1 } }), SETTINGS, true).state
    const out = step(state, snapshot({ a: { running: false, updatedAt: 2 }, b: { running: false, updatedAt: 3 } }), SETTINGS, true)
    expect(out.actions.filter(a => a.kind === 'done').map(a => a.sessionId).sort()).toEqual(['a', 'b'])
  })
})
