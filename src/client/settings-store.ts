/**
 * The attention-alert switches, persisted in the browser (localStorage) via
 * the runtime's snapshot-store engine.
 *
 * Why not the Host settings document: the rc.6 web API gateway exposes only
 * a hardcoded allowlist of settings namespaces to the browser
 * (WEB_SETTINGS_NAMESPACES in packages/host/apiproxy/src/api-proxy.ts) and
 * answers settings-not-exposed for every other registered namespace -
 * 'moving that declaration to settings.register() is deferred work'.
 * The node half still registers the ui-attention namespace Host-side for
 * future compatibility; the browser reads/writes this store instead.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_ATTENTION_SETTINGS } from '../attention-settings.ts'
import type { AttentionSettings } from '../attention-settings.ts'

/** localStorage key holding the four switches (root scope). */
export const ATTENTION_SETTINGS_STORE_KEY = 'dsh-ui-attention.settings'

export type AttentionSettingsActions = {
  setEnabled(draft: AttentionSettings, value: boolean): void
  setSound(draft: AttentionSettings, value: boolean): void
  setTitleFlash(draft: AttentionSettings, value: boolean): void
  setOnlyWhenHidden(draft: AttentionSettings, value: boolean): void
  setNotifyOnDone(draft: AttentionSettings, value: boolean): void
}

/**
 * Declare the persisted settings store: defaults on first run, then the
 * browser copy survives refreshes and restarts.
 * @returns the store handle (create one root-scope instance in apply).
 */
export function createSettingsStore(): EngineStoreHandle<AttentionSettings, AttentionSettingsActions> {
  return defineStore({
    init: (): AttentionSettings => ({ ...DEFAULT_ATTENTION_SETTINGS }),
    persist: ATTENTION_SETTINGS_STORE_KEY,
    actions: {
      setEnabled: (d, value) => { d.enabled = value },
      setSound: (d, value) => { d.sound = value },
      setTitleFlash: (d, value) => { d.titleFlash = value },
      setOnlyWhenHidden: (d, value) => { d.onlyWhenHidden = value },
      setNotifyOnDone: (d, value) => { d.notifyOnDone = value },
    },
  })
}
