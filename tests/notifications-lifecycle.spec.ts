/** T7+T16: notification lifecycle — dismiss close, click open, done copies, create-throw degradation. */
import { describe, expect, it, vi } from 'vitest'
import { AttentionNotifier } from '../src/client/notifications.ts'
import type { NotificationLike, NotificationPermission } from '../src/client/notifications.ts'
import type { PendingStatus } from '../src/client/attention-engine.ts'

const COPY: Record<PendingStatus, { title: string; body: string }> = {
  question: { title: 'q-title', body: 'q-body' },
  'plan-review': { title: 'p-title', body: 'p-body' },
  approval: { title: 'a-title', body: 'a-body' },
}

function fakeNotification(overrides: Partial<NotificationLike> = {}): NotificationLike {
  return { title: '', body: '', tag: '', onclick: null, onclose: null, close: vi.fn(), ...overrides }
}

function env(created: NotificationLike[]) {
  return {
    permission: 'granted' as NotificationPermission,
    requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
    create: vi.fn((title: string, options: { body?: string; tag?: string }) => {
      const n = fakeNotification({ title, body: options.body ?? '', tag: options.tag ?? '' })
      created.push(n)
      return n
    }),
    focusWindow: vi.fn(),
  }
}

describe('AttentionNotifier lifecycle', () => {
  it('dismiss closes and unregisters only that session notification', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env(created), s => COPY[s], () => {})
    notifier.show('s1', 'question')
    notifier.show('s2', 'approval')
    notifier.dismiss('s1')
    expect(created[0]?.close).toHaveBeenCalledTimes(1)
    expect(created[1]?.close).not.toHaveBeenCalled()
    notifier.show('s1', 'question')
    expect(created).toHaveLength(3)
  })

  it('dismiss of an unknown session is a no-op', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env(created), s => COPY[s], () => {})
    expect(() => { notifier.dismiss('ghost') }).not.toThrow()
    expect(created).toHaveLength(0)
  })

  it('dismissAll closes every live notification', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env(created), s => COPY[s], () => {})
    notifier.show('s1', 'question')
    notifier.show('s2', 'approval')
    notifier.dismissAll()
    expect(created[0]?.close).toHaveBeenCalledTimes(1)
    expect(created[1]?.close).toHaveBeenCalledTimes(1)
  })

  it('clicking a notification focuses the window and opens the owning session', () => {
    const created: NotificationLike[] = []
    const e = env(created)
    const onOpen = vi.fn()
    const notifier = new AttentionNotifier(e, s => COPY[s], onOpen)
    notifier.show('s1', 'plan-review')
    expect(created[0]?.onclick).not.toBeNull()
    created[0]?.onclick?.call(undefined, new Event('click'))
    expect(e.focusWindow).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith('s1')
    expect(created[0]?.close).toHaveBeenCalledTimes(1)
  })

  it('showDone registers like a regular alert (tag, dismiss, click open)', () => {
    const created: NotificationLike[] = []
    const e = env(created)
    const onOpen = vi.fn()
    const notifier = new AttentionNotifier(e, s => COPY[s], onOpen)
    expect(notifier.showDone('s1', { title: 'done-title', body: 'done-body' })).toBe(true)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
    expect(created[0]?.title).toBe('done-title')
    notifier.dismiss('s1')
    expect(created[0]?.close).toHaveBeenCalledTimes(1)
    notifier.showDone('s2', { title: 'd2', body: 'b2' })
    created[1]?.onclick?.call(undefined, new Event('click'))
    expect(onOpen).toHaveBeenCalledWith('s2')
  })

  it('degrades to false when notification construction throws', () => {
    const throwing = {
      permission: 'granted' as NotificationPermission,
      requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
      create: vi.fn(() => { throw new Error('constructor blocked') }),
      focusWindow: vi.fn(),
    }
    const notifier = new AttentionNotifier(throwing, s => COPY[s], () => {})
    expect(() => notifier.show('s1', 'question')).not.toThrow()
    expect(notifier.show('s1', 'question')).toBe(false)
    expect(() => notifier.showDone('s1', { title: 't', body: 'b' })).not.toThrow()
    expect(notifier.showDone('s1', { title: 't', body: 'b' })).toBe(false)
  })

  it('a close() throwing on a stale handle does not break dismiss', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env(created), s => COPY[s], () => {})
    notifier.show('s1', 'question')
    const broken = created[0] as NotificationLike
    broken.close = vi.fn(() => { throw new Error('already closed') })
    expect(() => { notifier.dismiss('s1') }).not.toThrow()
  })
})
