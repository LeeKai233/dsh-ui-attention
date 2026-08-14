/** T6: notification permission branches and degradation. */
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

function env(permission: NotificationPermission | 'unavailable', created: NotificationLike[] = []) {
  return {
    permission,
    requestPermission: vi.fn(async () => permission === 'unavailable' ? 'denied' : permission as NotificationPermission),
    create: vi.fn((title: string, options: { body?: string; tag?: string }) => {
      const n = fakeNotification({ title, body: options.body ?? '', tag: options.tag ?? '' })
      created.push(n)
      return n
    }),
  }
}

describe('AttentionNotifier permission branches', () => {
  it('shows a tagged notification with localized copy when granted', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env('granted', created), s => COPY[s], () => {})
    expect(notifier.show('s1', 'question')).toBe(true)
    expect(created).toHaveLength(1)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
    expect(created[0]?.title).toBe('q-title')
    expect(created[0]?.body).toBe('q-body')
  })

  it('degrades to false without creating anything when permission is default', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env('default', created), s => COPY[s], () => {})
    expect(notifier.show('s1', 'question')).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('degrades to false without creating anything when permission is denied', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env('denied', created), s => COPY[s], () => {})
    expect(notifier.show('s1', 'approval')).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('degrades to false when the Notification API is unavailable', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env('unavailable', created), s => COPY[s], () => {})
    expect(notifier.show('s1', 'plan-review')).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('replaces an existing notification for the same session (one per tag)', () => {
    const created: NotificationLike[] = []
    const notifier = new AttentionNotifier(env('granted', created), s => COPY[s], () => {})
    notifier.show('s1', 'question')
    notifier.show('s1', 'approval')
    expect(created).toHaveLength(2)
    expect(created[0]?.close).toHaveBeenCalledTimes(1)
    expect(created[1]?.tag).toBe('dsh-attention:s1')
  })

  it('forwards permission requests to the platform', async () => {
    const e = env('default')
    const notifier = new AttentionNotifier(e, s => COPY[s], () => {})
    const result = await notifier.requestPermission()
    expect(e.requestPermission).toHaveBeenCalledTimes(1)
    expect(result).toBe('default')
  })
})
