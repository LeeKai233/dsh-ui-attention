/** T11: browser assembly — subscriptions, slot registration, dictionaries, engine wiring. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'
import type { PendingStatus, SessionListLike } from '../src/client/attention-engine.ts'
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
  return { byId: Object.fromEntries(Object.entries(pending).map(([id, status]) => [id, { pendingInteraction: status }])) }
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
  let registration: RegistrationRecord | undefined
  const slots = {
    inject: vi.fn((_key: string, reg: () => RegistrationRecord) => { registration = reg() }),
    register: vi.fn((options: RegistrationRecord['options'], component: unknown) => ({ options, component })),
  }
  const locale = {
    register: registerLocale,
    bind: vi.fn(() => (key: string) => key),
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
    ctx, slots, locale, open,
    listSnapshot: { set: (next: SessionListLike) => { snap = next } },
    notify: () => { listSubscriber?.() },
  }
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

  it('alerts (hidden page) when a pending interaction appears, and closes on resolve', () => {
    vi.stubGlobal('Notification', FakeNotificationCtor)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const built = buildContext({ byId: {} })
    apply(built.ctx as never)
    built.listSnapshot.set(snapshotOf({ s1: 'question' }))
    built.notify()
    expect(created).toHaveLength(1)
    expect(created[0]?.tag).toBe('dsh-attention:s1')
    expect(created[0]?.title).toBe('notify.title.question')
    built.listSnapshot.set({ byId: {} })
    built.notify()
    expect(created[0]?.closed).toBe(true)
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
    // Master switch off: a pending appearing now stays silent.
    built.listSnapshot.set(snapshotOf({ s1: 'question' }))
    built.notify()
    expect(created).toHaveLength(0)
    // Master switch on again: the pending alerts on the next step.
    verbs.setEnabled(true)
    built.notify()
    expect(created).toHaveLength(1)
    // The test button fires a one-shot notification.
    await verbs.test()
    expect(created.some(n => n.tag === 'dsh-attention:test')).toBe(true)
  })
})
