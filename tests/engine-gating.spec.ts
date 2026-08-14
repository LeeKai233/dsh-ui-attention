/** T5: alert gating — enabled master switch, onlyWhenHidden, visibility. */
import { describe, expect, it } from 'vitest'
import { initialState, step } from '../src/client/attention-engine.ts'
import type { PendingStatus, SessionListLike } from '../src/client/attention-engine.ts'

function snapshot(byId: Record<string, { pendingInteraction?: PendingStatus } | undefined>): SessionListLike {
  return { byId }
}

function seeded(pending: ReadonlyArray<readonly [string, PendingStatus]> = []) {
  const state = initialState()
  const seededSnap = snapshot(Object.fromEntries(pending.map(([id, status]) => [id, { pendingInteraction: status }])))
  return step(state, seededSnap, { enabled: true, titleFlash: true, onlyWhenHidden: true }, 'visible').state
}

describe('step gating', () => {
  it('emits nothing when the master switch is off, not even the flash', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { actions } = step(state, snap, { enabled: false, titleFlash: true, onlyWhenHidden: true }, 'hidden')
    expect(actions).toEqual([])
  })

  it('suppresses alerts while visible with onlyWhenHidden, and alerts once hidden', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const visible = step(state, snap, { enabled: true, titleFlash: true, onlyWhenHidden: true }, 'visible')
    expect(visible.actions).toEqual([])
    const hidden = step(visible.state, snap, { enabled: true, titleFlash: true, onlyWhenHidden: true }, 'hidden')
    expect(hidden.actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('alerts immediately while hidden with onlyWhenHidden', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'approval' } })
    const { actions } = step(state, snap, { enabled: true, titleFlash: true, onlyWhenHidden: true }, 'hidden')
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'approval' })
  })

  it('alerts in the foreground when onlyWhenHidden is off', () => {
    const state = seeded()
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { actions } = step(state, snap, { enabled: true, titleFlash: true, onlyWhenHidden: false }, 'visible')
    expect(actions).toContainEqual({ kind: 'alert', sessionId: 's1', status: 'question' })
  })

  it('never re-alerts the same session at the same status', () => {
    const state = seeded([['s1', 'question']])
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const hidden = step(state, snap, { enabled: true, titleFlash: true, onlyWhenHidden: true }, 'hidden')
    expect(hidden.actions.filter(a => a.kind === 'alert')).toEqual([])
  })
})
