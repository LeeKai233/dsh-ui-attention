/**
 * Browser half of the dsh-ui-attention plugin: runs the attention machine
 * over the session-list snapshot and wires its actions to platform side
 * effects (Notification popup, WebAudio beep, tab-title flash). The four
 * switches persist in the browser via the settings store (see
 * settings-store.ts for why the Host settings scope is not used). Also
 * registers the feature-owned General-settings row.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { initialState, step } from './attention-engine.ts'
import type { AttentionMachineState, PendingStatus, SessionListLike } from './attention-engine.ts'
import { AttentionNotifier, browserNotificationEnv } from './notifications.ts'
import type { NotificationCopy, NotificationEnv } from './notifications.ts'
import { Beeper, browserAudioContextFactory } from './beep.ts'
import { createTitleFlash } from './title-flash.ts'
import { createSettingsStore } from './settings-store.ts'
import { AttentionRow, createAttentionRowStore } from './AttentionRow.tsx'
import type { AttentionRowInjected } from './AttentionRow.tsx'
import { en, zh } from './locales.ts'
import type { AttentionKey } from './locales.ts'

export { AttentionRow } from './AttentionRow.tsx'
export type { AttentionRowComponentProps, AttentionRowInjected, AttentionRowState } from './AttentionRow.tsx'
export type { AttentionKey } from './locales.ts'

/** Locale namespace owned by this plugin (row + notification copy). */
const NS = 'attention'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The attention row's copy. */
    attention: AttentionKey
  }
}

/** Required services: slot registry, locale, sessions. */
export const inject = ['slots', 'locale', 'sessions']

/**
 * Assemble the browser plugin.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-attention: dictionaries')

  const settings = createSettingsStore().create()
  const t = ctx.locale.bind(NS)

  const copyFor = (status: PendingStatus): NotificationCopy => {
    switch (status) {
      case 'question':
        return { title: t('notify.title.question'), body: t('notify.body.question') }
      case 'plan-review':
        return { title: t('notify.title.planReview'), body: t('notify.body.planReview') }
      default:
        return { title: t('notify.title.approval'), body: t('notify.body.approval') }
    }
  }

  const unavailableEnv: NotificationEnv = {
    permission: 'unavailable',
    requestPermission: async () => 'denied',
    create: () => { throw new Error('Notification API unavailable') },
    focusWindow: () => {},
  }
  const notifier = new AttentionNotifier(
    browserNotificationEnv() ?? unavailableEnv,
    copyFor,
    (sessionId) => { ctx.sessions.open(sessionId) },
  )
  const beeper = new Beeper(browserAudioContextFactory())
  const flash = createTitleFlash({
    getTitle: () => document.title,
    setTitle: (title) => { document.title = title },
  })

  const rowStore = createAttentionRowStore()
  let bound: BoundActions<typeof rowStore> | undefined
  const syncRow = (): void => {
    bound?.sync(settings.getSnapshot(), notifier.permission)
  }

  let machine: AttentionMachineState = initialState()
  const runStep = (): void => {
    const snapshot = ctx.sessions.list.getSnapshot() as unknown as SessionListLike
    const current = settings.getSnapshot()
    const { state, actions } = step(machine, snapshot, current, document.visibilityState)
    machine = state
    for (const action of actions) {
      switch (action.kind) {
        case 'alert':
          notifier.show(action.sessionId, action.status)
          if (current.sound) beeper.beep()
          break
        case 'dismiss':
          notifier.dismiss(action.sessionId)
          break
        case 'flash-start':
          flash.start()
          break
        case 'flash-stop':
          flash.stop()
          break
        /* v8 ignore next 2 -- the union is closed by construction. */
        default: {
          const exhaustive: never = action
          throw new Error('ui-attention: unknown action ' + String(exhaustive))
        }
      }
    }
    syncRow()
  }

  // Baseline seed, then follow every list snapshot.
  runStep()
  const unsubscribe = ctx.sessions.list.subscribe(runStep)
  ctx.effect(() => unsubscribe, 'ui-attention: sessions subscription')

  // Visibility flips re-run the machine (suppressed alerts fire on hide).
  document.addEventListener('visibilitychange', runStep)

  // Unlock WebAudio from any user gesture (autoplay policy retry).
  document.addEventListener('pointerdown', () => { beeper.unlock() }, { capture: true })
  document.addEventListener('keydown', () => { beeper.unlock() }, { capture: true })

  // Settings changes re-run the machine and refresh the row mirror.
  ctx.effect(() => settings.subscribe(() => {
    runStep()
    syncRow()
  }), 'ui-attention: settings store subscription')

  const testNotification = async (): Promise<void> => {
    beeper.unlock()
    const permission = await notifier.requestPermission()
    syncRow()
    if (permission !== 'granted') return
    const shown = notifier.showCustom({ title: t('test.title'), body: t('test.body') }, 'dsh-attention:test')
    if (shown && settings.getSnapshot().sound) beeper.beep()
  }

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'attention',
    order: 20,
    store: rowStore,
    locale: NS,
    inject: (actions: BoundActions<typeof rowStore>): AttentionRowInjected => {
      bound = actions
      syncRow()
      return {
        setEnabled: (value) => { settings.actions.setEnabled(value) },
        setSound: (value) => { settings.actions.setSound(value) },
        setTitleFlash: (value) => { settings.actions.setTitleFlash(value) },
        setOnlyWhenHidden: (value) => { settings.actions.setOnlyWhenHidden(value) },
        test: () => testNotification(),
      }
    },
  }, AttentionRow))
}
