/**
 * Browser half of the dsh-ui-attention plugin: binds the Host-persisted
 * settings scope, runs the attention machine over the session-list snapshot,
 * and wires its actions to platform side effects (Notification popup,
 * WebAudio beep, tab-title flash). Also registers the feature-owned
 * General-settings row.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.settingsScope Context merge (cross-plugin collaboration
// goes through the service, never a value import — client bundle purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { ATTENTION_SETTINGS_NAMESPACE, DEFAULT_ATTENTION_SETTINGS } from '../attention-settings.ts'
import type { AttentionSettings } from '../attention-settings.ts'
import { initialState, step } from './attention-engine.ts'
import type { AttentionMachineState, PendingStatus, SessionListLike } from './attention-engine.ts'
import { AttentionNotifier, browserNotificationEnv } from './notifications.ts'
import type { NotificationCopy, NotificationEnv } from './notifications.ts'
import { Beeper, browserAudioContextFactory } from './beep.ts'
import { createTitleFlash } from './title-flash.ts'
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

/** Required services: slot registry, locale, the settings scope, sessions. */
export const inject = ['slots', 'locale', 'settingsScope', 'sessions']

/**
 * Assemble the browser plugin.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-attention: dictionaries')

  const scope = ctx.settingsScope.bind<AttentionSettings>({ namespace: ATTENTION_SETTINGS_NAMESPACE })
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

  const settingsOrDefault = (): AttentionSettings =>
    scope.getSnapshot().value ?? DEFAULT_ATTENTION_SETTINGS

  const store = createAttentionRowStore()
  let bound: BoundActions<typeof store> | undefined
  const syncRow = (): void => {
    bound?.sync(settingsOrDefault(), notifier.permission)
  }

  let machine: AttentionMachineState = initialState()
  const runStep = (): void => {
    const snapshot = ctx.sessions.list.getSnapshot() as unknown as SessionListLike
    const settings = settingsOrDefault()
    const { state, actions } = step(machine, snapshot, settings, document.visibilityState)
    machine = state
    for (const action of actions) {
      switch (action.kind) {
        case 'alert':
          notifier.show(action.sessionId, action.status)
          if (settings.sound) beeper.beep()
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
          throw new Error(`ui-attention: unknown action ${String(exhaustive)}`)
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
  ctx.effect(() => scope.subscribe(() => {
    runStep()
    syncRow()
  }), 'ui-attention: settings scope subscription')

  const testNotification = async (): Promise<void> => {
    beeper.unlock()
    const permission = await notifier.requestPermission()
    syncRow()
    if (permission !== 'granted') return
    const shown = notifier.showCustom({ title: t('test.title'), body: t('test.body') }, 'dsh-attention:test')
    if (shown && settingsOrDefault().sound) beeper.beep()
  }

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'attention',
    order: 20,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): AttentionRowInjected => {
      bound = actions
      syncRow()
      return {
        setEnabled: (value) => { void scope.set('enabled', value) },
        setSound: (value) => { void scope.set('sound', value) },
        setTitleFlash: (value) => { void scope.set('titleFlash', value) },
        setOnlyWhenHidden: (value) => { void scope.set('onlyWhenHidden', value) },
        test: () => testNotification(),
      }
    },
  }, AttentionRow))
}
