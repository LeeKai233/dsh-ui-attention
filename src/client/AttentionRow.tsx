/**
 * The General-settings row for the attention feature: five iOS-style switch
 * controls (track + sliding knob, official DSH tokens) plus a
 * test-notification pill, drawn with the official Setting-Cell chrome
 * (title 14/400/22 label-primary, desc 12/400/18 label-tertiary, 16/0
 * padding, hairline separator — identical values to ui-agent-preset /
 * ui-permission-presets / ui-conversation / ui-locale rows).
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
  setNotifyOnDone(value: boolean): void
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
// iOS-style switch (track + sliding knob), DSH official tokens and anatomy
// (mirrors ui-trajectory's controlTrack/controlThumb, scaled for the row).
const SWITCH_BUTTON: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', border: 'none',
  background: 'transparent', padding: 0, cursor: 'pointer', flex: 'none',
}
const SWITCH_TRACK: CSSProperties = {
  position: 'relative', display: 'inline-block', width: 32, height: 18, borderRadius: 9,
  background: 'var(--dsw-alias-border-l2)',
  transition: 'background-color 120ms var(--ds-ease-in-out)',
}
const SWITCH_TRACK_ON: CSSProperties = {
  background: 'var(--dsw-alias-state-business-primary)',
}
const SWITCH_THUMB: CSSProperties = {
  position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%',
  background: 'var(--dsw-alias-bg-layer-1)',
  transition: 'transform 120ms var(--ds-ease-in-out)',
}
const SWITCH_THUMB_ON: CSSProperties = {
  transform: 'translateX(14px)',
}

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onChange(checked: boolean): void
}

/** One switch row: Setting-Cell text column plus an iOS-style switch control. */
function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <div style={CELL}>
      <div style={ROW_TEXT}>
        <div style={TITLE}>{label}</div>
        <div style={DESC}>{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        style={SWITCH_BUTTON}
        onClick={() => { onChange(!checked) }}
      >
        <span style={checked ? { ...SWITCH_TRACK, ...SWITCH_TRACK_ON } : SWITCH_TRACK} aria-hidden="true">
          <span style={checked ? { ...SWITCH_THUMB, ...SWITCH_THUMB_ON } : SWITCH_THUMB} />
        </span>
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
  const { t, useStore, setEnabled, setSound, setTitleFlash, setOnlyWhenHidden, setNotifyOnDone, test } = props
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
        onChange={setEnabled}
      />
      <ToggleRow
        label={t('row.sound')}
        hint={t('row.sound.hint')}
        checked={settings.sound}
        onChange={setSound}
      />
      <ToggleRow
        label={t('row.titleFlash')}
        hint={t('row.titleFlash.hint')}
        checked={settings.titleFlash}
        onChange={setTitleFlash}
      />
      <ToggleRow
        label={t('row.onlyWhenHidden')}
        hint={t('row.onlyWhenHidden.hint')}
        checked={settings.onlyWhenHidden}
        onChange={setOnlyWhenHidden}
      />
      <ToggleRow
        label={t('row.notifyOnDone')}
        hint={t('row.notifyOnDone.hint')}
        checked={settings.notifyOnDone}
        onChange={setNotifyOnDone}
      />
    </div>
  )
}
