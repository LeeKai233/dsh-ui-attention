/** T14: persisted settings store — defaults, field setters, persistence key. */
import { describe, expect, it, vi } from 'vitest'
import { ATTENTION_SETTINGS_STORE_KEY, createSettingsStore } from '../src/client/settings-store.ts'
import { DEFAULT_ATTENTION_SETTINGS } from '../src/attention-settings.ts'

describe('settings store', () => {
  it('persists under the attention store key', () => {
    const store = createSettingsStore()
    expect(store.spec.persist).toBe(ATTENTION_SETTINGS_STORE_KEY)
  })

  it('seeds every switch from the defaults', () => {
    const instance = createSettingsStore().create()
    expect(instance.getSnapshot()).toEqual(DEFAULT_ATTENTION_SETTINGS)
  })

  it('writes each field through its own action', () => {
    const instance = createSettingsStore().create()
    instance.actions.setEnabled(false)
    instance.actions.setSound(false)
    instance.actions.setTitleFlash(false)
    instance.actions.setOnlyWhenHidden(false)
    expect(instance.getSnapshot()).toEqual({
      enabled: false, sound: false, titleFlash: false, onlyWhenHidden: false,
    })
    instance.actions.setEnabled(true)
    expect(instance.getSnapshot().enabled).toBe(true)
    expect(instance.getSnapshot().sound).toBe(false)
  })

  it('notifies subscribers after each write', () => {
    const instance = createSettingsStore().create()
    const listener = vi.fn()
    instance.subscribe(listener)
    instance.actions.setEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
