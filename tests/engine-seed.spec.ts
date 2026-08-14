/** T4: the machine seeds its first snapshot without alerting (refresh/reconnect replay). */
import { describe, expect, it } from 'vitest'
import { initialState, step } from '../src/client/attention-engine.ts'
import type { PendingStatus, SessionListLike } from '../src/client/attention-engine.ts'

const SETTINGS = { enabled: true, titleFlash: true, onlyWhenHidden: true, notifyOnDone: true }

function snapshot(byId: Record<string, { pendingInteraction?: PendingStatus } | undefined>): SessionListLike {
  return { byId }
}

describe('step seeding', () => {
  it('seeds the first snapshot without any alert or dismiss', () => {
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { state, actions } = step(initialState(), snap, SETTINGS, false)
    expect(actions.filter(a => a.kind === 'alert' || a.kind === 'dismiss' || a.kind === 'done')).toEqual([])
    expect(state.seeded).toBe(true)
    expect([...state.alerted]).toEqual([['s1', 'question']])
    expect([...state.pending]).toEqual([['s1', 'question']])
  })

  it('arms the title flash when a not-on-top page seeds with pendings', () => {
    const snap = snapshot({ s1: { pendingInteraction: 'plan-review' } })
    const { state, actions } = step(initialState(), snap, SETTINGS, true)
    expect(actions).toContainEqual({ kind: 'flash-start' })
    expect(state.flashing).toBe(true)
  })

  it('emits nothing when the identical snapshot steps again', () => {
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const first = step(initialState(), snap, SETTINGS, true)
    const second = step(first.state, snap, SETTINGS, true)
    expect(second.actions).toEqual([])
    expect(second.state.flashing).toBe(true)
  })

  it('does not arm the flash when the seeded page is on top', () => {
    const snap = snapshot({ s1: { pendingInteraction: 'question' } })
    const { state, actions } = step(initialState(), snap, SETTINGS, false)
    expect(actions).not.toContainEqual({ kind: 'flash-start' })
    expect(state.flashing).toBe(false)
  })
})
