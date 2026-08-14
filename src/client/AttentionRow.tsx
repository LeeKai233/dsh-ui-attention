/**
 * The General-settings row for the attention feature: four switches plus a
 * test-notification button. Registered by client/index.ts into the
 * settings.general.item slot (feature-owned settings surface, ui-theme's
 * AppearanceRow precedent).
 */
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_ATTENTION_SETTINGS } from '../attention-settings.ts'
import type { AttentionSettings } from '../attention-settings.ts'
import type { PermissionState } from './notifications.ts'

/** Row state mirrored from the settings scope and the permission platform. */
export interface AttentionRowState {
  /** Resolved settings the switches reflect. */
  settings: AttentionSettings
  /** Current Notification permission (or unavailable without the API). */
  permission: PermissionState
}

type AttentionRowActions = {
  sync: (draft: AttentionRowState, settings: AttentionSettings) => void
  syncPermission: (draft: AttentionRowState, permission: PermissionState) => void
}

/**
 * Declare the row store (fresh instance per registration, mirror of the
 * scope snapshot + permission state).
 * @returns the store handle.
 */
export function createAttentionRowStore(): EngineStoreHandle<AttentionRowState, AttentionRowActions> {
  return defineStore({
    init: (): AttentionRowState => ({
      settings: { ...DEFAULT_ATTENTION_SETTINGS },
      permission: 'default',
    }),
    actions: {
      sync: (d, settings) => { d.settings = { ...settings } },
      syncPermission: (d, permission) => { d.permission = permission },
    },
  })
}

/** Business verbs the plugin injects into the row. */
export interface AttentionRowInjected {
  setEnabled(value: boolean): void
  setSound(value: boolean): void
  setTitleFlash(value: boolean): void
  setOnlyWhenHidden(value: boolean): void
  /** Show a sample notification (and request permission on the user gesture). */
  test(): Promise<void>
}

/** Full component props: runtime share + store share + locale seat + injected verbs. */
export type AttentionRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createAttentionRowStore>>
  & PropsLocale<'attention'> & AttentionRowInjected

/**
 * Render the Attention row (T11 registration face; T12 fills the UI).
 * @param _props - composed slot props.
 * @returns the row element tree (null until T12).
 */
export function AttentionRow(_props: AttentionRowComponentProps): null {
  return null
}
