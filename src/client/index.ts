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
import type { AttentionMachineState, PendingStatus, SessionListLike, SessionRowLike } from './attention-engine.ts'
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

/** Whether the DSH page is not on top: hidden tab or an unfocused window. */
export function needsAttention(): boolean {
  return typeof document !== 'undefined'
    && (document.hidden || document.visibilityState !== 'visible' || !document.hasFocus())
}

/**
 * Assemble the browser plugin.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-attention: dictionaries')

  const settings = createSettingsStore().create()
  const t = ctx.locale.bind(NS)

  const titleOf = (row: SessionRowLike | undefined, sessionId: string): string =>
    typeof row?.displayTitle === 'string' && row.displayTitle !== '' ? row.displayTitle : sessionId

  const copyFor = (status: PendingStatus, title: string): NotificationCopy => {
    switch (status) {
      case 'question':
        return { title: t('notify.title.question'), body: t('notify.body.question', { title }) }
      case 'plan-review':
        return { title: t('notify.title.planReview'), body: t('notify.body.planReview', { title }) }
      default:
        return { title: t('notify.title.approval'), body: t('notify.body.approval', { title }) }
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
    const { state, actions } = step(machine, snapshot, current, needsAttention())
    machine = state
    for (const action of actions) {
      switch (action.kind) {
        case 'alert': {
          const title = titleOf(snapshot.byId[action.sessionId], action.sessionId)
          notifier.showWithCopy(action.sessionId, action.status, copyFor(action.status, title))
          if (current.sound) beeper.beep()
          break
        }
        case 'done': {
          const title = titleOf(snapshot.byId[action.sessionId], action.sessionId)
          notifier.showDone(action.sessionId, {
            title: t('notify.done.title'),
            body: t('notify.done.body', { title }),
          })
          if (current.sound) beeper.beep()
          break
        }
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

  // Not-on-top signal: hidden tab, lost window focus, or re-focus all re-run
  // the machine (suppressed alerts fire once the page leaves the top).
  document.addEventListener('visibilitychange', runStep)
  window.addEventListener('blur', runStep)
  window.addEventListener('focus', runStep)

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
        setNotifyOnDone: (value) => { settings.actions.setNotifyOnDone(value) },
        test: () => testNotification(),
      }
    },
  }, AttentionRow))
}
