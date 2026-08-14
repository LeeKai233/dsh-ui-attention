/**
 * The General-settings row for the attention feature: four switches plus a
 * test-notification button. Registered by client/index.ts into the
 * settings.general.item slot (feature-owned settings surface, ui-theme's
 * AppearanceRow precedent).
 */
import type { CSSProperties } from 'react'
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

const TITLE_STYLE: CSSProperties = { fontWeight: 600 }
const GROUP_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const SWITCH_ROW_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const SWITCH_LABEL_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const HINT_STYLE: CSSProperties = {
  color: 'var(--dsw-alias-label-secondary, #8a8f98)', fontSize: 12,
}
const BUTTON_STYLE: CSSProperties = { marginTop: 8, alignSelf: 'flex-start' }

interface SwitchRowProps {
  label: string
  hint: string
  checked: boolean
  onChange(checked: boolean): void
}

/** One checkbox switch: the label text names the input, the hint rides beside it. */
function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <div style={SWITCH_ROW_STYLE}>
      <label style={SWITCH_LABEL_STYLE}>
        <input
          type="checkbox"
          checked={checked}
          onChange={event => { onChange(event.target.checked) }}
        />
        <span>{label}</span>
      </label>
      <span style={HINT_STYLE}>{hint}</span>
    </div>
  )
}

/**
 * Render the Attention row: title, four switches, the test button, and the
 * permission hint state.
 * @param props - composed slot props (runtime + store + locale + injected verbs).
 * @returns the row element tree.
 */
export function AttentionRow(props: AttentionRowComponentProps) {
  const { t, useStore, setEnabled, setSound, setTitleFlash, setOnlyWhenHidden, test } = props
  const settings = useStore(s => s.settings)
  const permission = useStore(s => s.permission)
  return (
    <div style={GROUP_STYLE}>
      <div style={TITLE_STYLE}>{t('row.title')}</div>
      <SwitchRow label={t('row.enabled')} hint={t('row.enabled.hint')} checked={settings.enabled} onChange={setEnabled} />
      <SwitchRow label={t('row.sound')} hint={t('row.sound.hint')} checked={settings.sound} onChange={setSound} />
      <SwitchRow label={t('row.titleFlash')} hint={t('row.titleFlash.hint')} checked={settings.titleFlash} onChange={setTitleFlash} />
      <SwitchRow
        label={t('row.onlyWhenHidden')}
        hint={t('row.onlyWhenHidden.hint')}
        checked={settings.onlyWhenHidden}
        onChange={setOnlyWhenHidden}
      />
      <button type="button" style={BUTTON_STYLE} onClick={() => { void test() }}>{t('row.test')}</button>
      {permission === 'default' && <div role="status">{t('row.permissionHint')}</div>}
      {(permission === 'denied' || permission === 'unavailable')
        && <div role="status">{t('row.permissionDenied')}</div>}
    </div>
  )
}
