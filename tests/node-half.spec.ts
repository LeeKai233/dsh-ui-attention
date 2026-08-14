/** T10: node half — settings namespace registration with and without the service. */
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/index.ts'
import { ATTENTION_SETTINGS_NAMESPACE } from '../src/attention-settings.ts'
import { AttentionSettingsSchema } from '../src/attention-schema.ts'

interface FakeSettingsCtx {
  settings: { register: ReturnType<typeof vi.fn> }
}

function fakeContext(withSettings: boolean) {
  const register = vi.fn()
  const ctx = {
    inject: vi.fn((deps: string[], cb: (child: FakeSettingsCtx) => void) => {
      expect(deps).toEqual(['settings'])
      if (withSettings) cb({ settings: { register } })
    }),
  }
  return { ctx, register }
}

describe('node half', () => {
  it('declares no hard service dependencies', () => {
    expect(inject).toEqual([])
  })

  it('registers the ui-attention namespace schema when the settings service exists', () => {
    const { ctx, register } = fakeContext(true)
    apply(ctx as never)
    expect(register).toHaveBeenCalledTimes(1)
    const [ns, schema] = register.mock.calls[0] as [string, unknown]
    expect(ns).toBe(ATTENTION_SETTINGS_NAMESPACE)
    expect(schema).toBe(AttentionSettingsSchema)
  })

  it('stays quiet when the settings service is absent', () => {
    const { ctx, register } = fakeContext(false)
    expect(() => { apply(ctx as never) }).not.toThrow()
    expect(register).not.toHaveBeenCalled()
  })
})
