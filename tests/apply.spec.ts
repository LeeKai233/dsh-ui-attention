/** T11+T16: browser assembly — subscriptions, wiring, done alerts, focus/blur. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'
import type { PendingStatus, SessionListLike, SessionRowLike } from '../src/client/attention-engine.ts'
import type { NotificationLike, NotificationPermission } from '../src/client/notifications.ts'

interface FakeNotification extends NotificationLike {
  closed: boolean
}

const created: FakeNotification[] = []

class FakeNotificationCtor implements FakeNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted')
  title: string
  body: string
  tag: string
  onclick: ((this: Notification, ev: Event) => unknown) | null = null
  onclose: ((this: Notification, ev: Event) => unknown) | null = null
  closed = false
  constructor(title: string, options?: { body?: string; tag?: string }) {
    this.title = title
    this.body = options?.body ?? ''
    this.tag = options?.tag ?? ''
    created.push(this)
  }
  close(): void {
    this.closed = true
  }
}

function snapshotOf(pending: Record<string, PendingStatus>): SessionListLike {
  return {
    byId: Object.fromEntries(Object.entries(pending).map(([id, status]) => [id, { pendingInteraction: status, displayTitle: 'Title-' + id }])),
  }
}

interface RegistrationRecord {
  options: {
    name: string
    id: string
    order: number
    locale: string
    store: unknown
    inject: (actions: unknown) => Record<string, (...args: never[]) => unknown>
  }
  component: unknown
}

function buildContext(listSnapshot: SessionListLike) {
  let snap = listSnapshot
  let listSubscriber: (() => void) | undefined
  const open = vi.fn()
  const registerLocale = vi.fn()
  const t = vi.fn((key: string) => key)
  let registration: RegistrationRecord | undefined
  const slots = {
    inject: vi.fn((_key: string, reg: () => RegistrationRecord) => { registration = reg() }),
    register: vi.fn((options: RegistrationRecord['options'], component: unknown) => ({ options, component })),
  }
  const locale = {
    register: registerLocale,
    bind: vi.fn(() => t),
  }
  const ctx = {
    effect: vi.fn((fn: () => unknown) => { fn() }),
    slots,
    locale,
    sessions: {
      list: {
        getSnapshot: () => snap,
        subscribe: vi.fn((cb: () => void) => { listSubscriber = cb; return () => {} }),
      },
      open,
    },
  }
  return {
    ctx, slots, locale, open, t,
    listSnapshot: { set: (next: SessionListLike) => { snap = next } },
    notify: () => { listSubscriber?.() },
  }
}

function rows(byId: Record<string, SessionRowLike | undefined>): SessionListLike {
  return { byId }
}

describe('client apply assembly', () => {
  afterEach(() => {
    created.length = 0
    vi.unstubAllGlobals()
  })

  it('registers dictionaries and subscribes the session list', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    expect(built.locale.register).toHaveBeenCalledWith('attention', expect.objectContaining({ zh: expect.any(Object), en: expect.any(Object) }))
    expect(built.ctx.sessions.list.subscribe).toHaveBeenCalledTimes(1)
  })

  it('registers the General-settings row with id attention at order 20', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    expect(built.slots.inject).toHaveBeenCalledWith('settings.general.item', expect.any(Function))
    expect(built.slots.register).toHaveBeenCalledTimes(1)
    const options = built.slots.register.mock.calls[0]?.[0] as RegistrationRecord['options']
    expect(options.name).toBe('settings.general.item')
    expect(options.id).toBe('attention')
    expect(options.order).toBe(20)
    expect(options.locale).toBe('attention')
    expect(options.store).toBeDefined()
  })

  it('alerts (page not on top) when a pending interaction appears, and closes on resolve', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    built.listSnapshot.set(snapshotOf({ s1: 'question' }))
    built.notify()
    expect(created).toHaveLength(1)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
    expect(created[0]?.title).toBe('notify.title.question')
    // The pending copy carries the session title as a parameter.
    expect(built.t).toHaveBeenCalledWith('notify.body.question', { title: 'Title-s1' })
    built.listSnapshot.set({ byId: {} })
    built.notify()
    expect(created[0]?.closed).toBe(true)
  })

  it('alerts for a NON-current session pending even while the page is focused on top', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    // jsdom: document.hasFocus() = true, visibilityState = visible -> on top, focused.
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    built.listSnapshot.set({
      ...snapshotOf({ s1: 'approval' }),
      current: 's-current',
      byId: { ...snapshotOf({ s1: 'approval' }).byId, 's-current': { displayTitle: 'Current' } },
    })
    built.notify()
    expect(created).toHaveLength(1)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
  })
  it('listens to window blur/focus for the not-on-top signal', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    const blurSpy = vi.spyOn(window, 'addEventListener')
    apply(buildContext({ byId: {} }).ctx as never)
    expect(blurSpy).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(blurSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    blurSpy.mockRestore()
  })

  it('emits a done notification when a session turn finishes while not on top', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    built.listSnapshot.set(rows({ s1: { running: true, updatedAt: 1, displayTitle: 'My Session' } }))
    built.notify()
    expect(created).toHaveLength(0)
    built.listSnapshot.set(rows({ s1: { running: false, updatedAt: 2, displayTitle: 'My Session' } }))
    built.notify()
    expect(created).toHaveLength(1)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
    expect(created[0]?.title).toBe('notify.done.title')
    expect(built.t).toHaveBeenCalledWith('notify.done.body', { title: 'My Session' })
    // Clicking opens the session.
    created[0]?.onclick?.call(undefined, new Event('click'))
    expect(built.open).toHaveBeenCalledWith('s1')
  })

  it('row verbs write the persisted settings store and gate the engine', async () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    const options = built.slots.register.mock.calls[0]?.[0] as RegistrationRecord['options']
    const verbs = options.inject({ sync: vi.fn(), syncPermission: vi.fn() })
    expect(verbs.setEnabled).toBeTypeOf('function')
    verbs.setEnabled(false)
    built.listSnapshot.set(snapshotOf({ s1: 'question' }))
    built.notify()
    expect(created).toHaveLength(0)
    verbs.setEnabled(true)
    built.notify()
    expect(created).toHaveLength(1)
    await verbs.test()
    expect(created.some(n => n.tag === 'dsh-attention:test')).toBe(true)
  })
})
