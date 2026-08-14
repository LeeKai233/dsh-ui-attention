/**
 * The General-settings row for the attention feature: four toggle pills plus
 * a test-notification pill, drawn with the official Setting-Cell chrome
 * (title 14/400/22 label-primary, desc 12/400/18 label-tertiary, 36px r18
 * selector pills on bg-module-platform, 16/0 padding, hairline separator —
 * identical values to ui-agent-preset / ui-permission-presets /
 * ui-conversation / ui-locale rows).
 */
import type { CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_ATTENTION_SETTINGS } from '../attention-settings.ts'
import type { AttentionSettings } from '../attention-settings.ts'
import type { PermissionState } from './notifications.ts'

/** Row state mirrored from the settings store and the permission platform. */
export interface AttentionRowState {
  /** Resolved settings the pills reflect. */
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
 * settings store + permission state).
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

// Official Setting-Cell chrome (values mirrored from the product rows).
const CELL: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const GROUP: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0',
  borderBottom: '1px solid var(--dsw-alias-border-l2)',
}
const ROW_TEXT: CSSProperties = {
  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 48,
}
const TITLE: CSSProperties = {
  fontSize: 14, fontWeight: 400, lineHeight: '22px', color: 'var(--dsw-alias-label-primary)',
}
const DESC: CSSProperties = {
  fontSize: 12, fontWeight: 400, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)',
}
const PILL: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  height: 36, padding: '0 14px', border: 'none', borderRadius: 18,
  background: 'var(--dsw-alias-bg-module-platform)',
  font: 'inherit', fontSize: 14, lineHeight: '22px',
  color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
}
const PILL_OFF: CSSProperties = {
  ...PILL, background: 'transparent', border: '1px solid var(--dsw-alias-border-l2)',
  color: 'var(--dsw-alias-label-secondary)',
}

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onLabel: string
  offLabel: string
  onChange(checked: boolean): void
}

/** One toggle pill: the name rides the accessible label, the pill shows On/Off. */
function ToggleRow({ label, hint, checked, onLabel, offLabel, onChange }: ToggleRowProps) {
  return (
    <div style={CELL}>
      <div style={ROW_TEXT}>
        <div style={TITLE}>{label}</div>
        <div style={DESC}>{hint}</div>
      </div>
      <button
        type="button"
        style={checked ? PILL : PILL_OFF}
        aria-label={label}
        aria-pressed={checked}
        onClick={() => { onChange(!checked) }}
      >
        {checked ? onLabel : offLabel}
      </button>
    </div>
  )
}

/**
 * Render the Attention row with the official Setting-Cell chrome.
 * @param props - composed slot props (runtime + store + locale + injected verbs).
 * @returns the row element tree.
 */
export function AttentionRow(props: AttentionRowComponentProps) {
  const { t, useStore, setEnabled, setSound, setTitleFlash, setOnlyWhenHidden, test } = props
  const settings = useStore(s => s.settings)
  const permission = useStore(s => s.permission)
  const description = permission === 'default'
    ? t('row.permissionHint')
    : permission === 'denied' || permission === 'unavailable'
      ? t('row.permissionDenied')
      : t('row.summary')
  return (
    <div style={GROUP}>
      <div style={CELL}>
        <div style={ROW_TEXT}>
          <div style={TITLE}>{t('row.title')}</div>
          <div style={DESC}>{description}</div>
        </div>
        <button type="button" style={PILL} onClick={() => { void test() }}>{t('row.test')}</button>
      </div>
      <ToggleRow
        label={t('row.enabled')}
        hint={t('row.enabled.hint')}
        checked={settings.enabled}
        onLabel={t('row.on')}
        offLabel={t('row.off')}
        onChange={setEnabled}
      />
      <ToggleRow
        label={t('row.sound')}
        hint={t('row.sound.hint')}
        checked={settings.sound}
        onLabel={t('row.on')}
        offLabel={t('row.off')}
        onChange={setSound}
      />
      <ToggleRow
        label={t('row.titleFlash')}
        hint={t('row.titleFlash.hint')}
        checked={settings.titleFlash}
        onLabel={t('row.on')}
        offLabel={t('row.off')}
        onChange={setTitleFlash}
      />
      <ToggleRow
        label={t('row.onlyWhenHidden')}
        hint={t('row.onlyWhenHidden.hint')}
        checked={settings.onlyWhenHidden}
        onLabel={t('row.on')}
        offLabel={t('row.off')}
        onChange={setOnlyWhenHidden}
      />
    </div>
  )
}
