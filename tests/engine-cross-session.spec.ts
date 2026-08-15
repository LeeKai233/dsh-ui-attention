/** T18: per-session gating — non-current sessions alert even while the page is on top. */
import { describe, expect, it } from 'vitest'
import { initialState, step } from '../src/client/attention-engine.ts'
import type { PendingStatus, SessionListLike, SessionRowLike } from '../src/client/attention-engine.ts'

const SETTINGS = { enabled: true, titleFlash: true, onlyWhenHidden: true, notifyOnDone: true }

function rows(byId: Record<string, SessionRowLike | undefined>, current?: string): SessionListLike {
  return { byId, ...(current === undefined ? {} : { current }) }
}

function seeded(pending: ReadonlyArray<readonly [string, PendingStatus]> = [], current?: string) {
  const state = initialState()
  const snap = rows(
    Object.fromEntries(pending.map(([id, status]) => [id, { pendingInteraction: status }])),
    current,
  )
  return step(state, snap, SETTINGS, false).state
}

describe('cross-session gating', () => {
  it('alerts for a pending interaction in a NON-current session even while the page is on top', () => {
    const state = seeded([], 's-current')
    const snap = rows({ 's-current': {}, s1: { pendingInteraction: 'question' } }, 's-current')
    const { actions } = step(state, snap, SETTINGS, false)
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('keeps the CURRENT session quiet while the page is on top', () => {
    const state = seeded([], 's1')
    const snap = rows({ s1: { pendingInteraction: 'question' } }, 's1')
    const { actions } = step(state, snap, SETTINGS, false)
    expect(actions.filter(a => a.kind === 'alert')).toEqual([])
  })

  it('alerts for a non-current session finished turn even while on top', () => {
    const state = seeded([], 's-current')
    const first = step(state, rows({ 's-current': {}, s1: { running: true, updatedAt: 1 } }, 's-current'), SETTINGS, false)
    const second = step(first.state, rows({ 's-current': {}, s1: { running: false, updatedAt: 2 } }, 's-current'), SETTINGS, false)
    expect(second.actions).toContainEqual({ kind: 'done', sessionId: 's1' })
  })

  it('keeps the CURRENT session finished turn quiet while on top', () => {
    const state = seeded([], 's1')
    const first = step(state, rows({ s1: { running: true, updatedAt: 1 } }, 's1'), SETTINGS, false)
    const second = step(first.state, rows({ s1: { running: false, updatedAt: 2 } }, 's1'), SETTINGS, false)
    expect(second.actions.filter(a => a.kind === 'done')).toEqual([])
  })

  it('re-fires a pending suppressed in the current session once the user switches away', () => {
    const state = seeded([], 's1')
    // Pending appears while s1 is current and on top: suppressed.
    const suppressed = step(state, rows({ s1: { pendingInteraction: 'approval' } }, 's1'), SETTINGS, false)
    expect(suppressed.actions.filter(a => a.kind === 'alert')).toEqual([])
    // User switches to s2: s1 is now non-current, the suppressed alert fires.
    const switched = step(suppressed.state, rows({ s1: { pendingInteraction: 'approval' }, s2: {} }, 's2'), SETTINGS, false)
    expect(switched.actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'approval' })
  })

  it('still alerts on top for the current session when onlyWhenHidden is off', () => {
    const state = seeded([], 's1')
    const snap = rows({ s1: { pendingInteraction: 'question' } }, 's1')
    const { actions } = step(state, snap, { ...SETTINGS, onlyWhenHidden: false }, false)
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('does not re-alert seeded non-current pendings on load', () => {
    // Page loads with a non-current pending already present: seed, no spam.
    const snap = rows({ 's-current': {}, s1: { pendingInteraction: 'question' } }, 's-current')
    const { actions } = step(initialState(), snap, SETTINGS, false)
    expect(actions.filter(a => a.kind === 'alert' || a.kind === 'done')).toEqual([])
  })
})
