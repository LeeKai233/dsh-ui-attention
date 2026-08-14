/** T7: notification lifecycle — dismiss close, click open, per-session isolation. */
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
    // A later re-show of s1 works again (registry cleaned).
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

  it('a close() throwing on a stale handle does not break dismiss', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env(created), s => COPY[s], () => {})
    notifier.show('s1', 'question')
    const broken = created[0] as NotificationLike
    broken.close = vi.fn(() => { throw new Error('already closed') })
    expect(() => { notifier.dismiss('s1') }).not.toThrow()
  })
})
