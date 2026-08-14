/** T1: the ui-attention settings contract — namespace, schema defaults, narrowing. */
import { describe, expect, it } from 'vitest'
import {
  ATTENTION_SETTINGS_NAMESPACE, AttentionSettingsSchema,
} from '../src/attention-settings.ts'
import type { AttentionSettings } from '../src/attention-settings.ts'

describe('attention-settings contract', () => {
  it('owns the ui-attention settings namespace', () => {
    expect(ATTENTION_SETTINGS_NAMESPACE).toBe('ui-attention')
  })

  it('defaults every switch to true when the section is empty', () => {
    const resolved = AttentionSettingsSchema({}) as AttentionSettings
    expect(resolved).toEqual({ enabled: true, sound: true, titleFlash: true, onlyWhenHidden: true })
  })

  it('keeps a user override and fills the rest with defaults', () => {
    const resolved = AttentionSettingsSchema({ enabled: false }) as AttentionSettings
    expect(resolved).toEqual({ enabled: false, sound: true, titleFlash: true, onlyWhenHidden: true })
  })

  it('rejects non-boolean values', () => {
    expect(() => AttentionSettingsSchema({ enabled: 'yes' })).toThrow()
    expect(() => AttentionSettingsSchema({ sound: 1 })).toThrow()
  })

  it('still coerces the known fields when unknown fields ride along', () => {
    const resolved = AttentionSettingsSchema({ enabled: true, bogus: 1 }) as AttentionSettings & { bogus?: unknown }
    expect(resolved.enabled).toBe(true)
    expect(resolved.sound).toBe(true)
    expect(resolved.titleFlash).toBe(true)
    expect(resolved.onlyWhenHidden).toBe(true)
  })
})
