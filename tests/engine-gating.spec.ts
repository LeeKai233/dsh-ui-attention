/** T5: alert gating — enabled master switch, onlyWhenHidden, page-not-on-top. */
import { describe, expect, it } from 'vitest'
import { initialState, step } from '../src/client/attention-engine.ts'
import type { PendingStatus, SessionListLike } from '../src/client/attention-engine.ts'

const SETTINGS = { enabled: true, titleFlash: true, onlyWhenHidden: true, notifyOnDone: true }

function snapshot(byId: Record<string, { pendingInteraction?: PendingStatus } | undefined>): SessionListLike {
  return { byId }
}

function seeded(pending: ReadonlyArray<readonly [string, PendingStatus]> = []) {
  const state = initialState()
  const seededSnap = snapshot(Object.fromEntries(pending.map(([id, status]) => [id, { pendingInteraction: status }])))
  return step(state, seededSnap, SETTINGS, false).state
}

describe('step gating', () => {
  it('emits nothing when the master switch is off, not even the flash', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { actions } = step(state, snap, { enabled: false, titleFlash: true, onlyWhenHidden: true, notifyOnDone: true }, true)
    expect(actions).toEqual([])
  })

  it('suppresses alerts while on top with onlyWhenHidden, and alerts once not on top', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const onTop = step(state, snap, SETTINGS, false)
    expect(onTop.actions).toEqual([])
    const notOnTop = step(onTop.state, snap, SETTINGS, true)
    expect(notOnTop.actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('alerts immediately while not on top with onlyWhenHidden', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'approval' } })
    const { actions } = step(state, snap, SETTINGS, true)
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'approval' })
  })

  it('alerts even on top when onlyWhenHidden is off', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { actions } = step(state, snap, { ...SETTINGS, onlyWhenHidden: false }, false)
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('never re-alerts the same session at the same status', () => {
    const state = seeded([['s1', 'question']])
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const notOnTop = step(state, snap, SETTINGS, true)
    expect(notOnTop.actions.filter(a => a.kind === 'alert')).toEqual([])
  })
})
