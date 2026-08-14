/**
 * Host node half of the dsh-ui-attention plugin: registers the durable
 * ui-attention settings namespace when the optional settings service is
 * composed (ui-theme's registration precedent); absent settings (TUI,
 * headless profiles) it stays quiet.
 */
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { ATTENTION_SETTINGS_NAMESPACE } from './attention-settings.ts'
import { AttentionSettingsSchema } from './attention-schema.ts'

export { ATTENTION_SETTINGS_NAMESPACE, DEFAULT_ATTENTION_SETTINGS } from './attention-settings.ts'
export type { AttentionSettings } from './attention-settings.ts'
export { AttentionSettingsSchema } from './attention-schema.ts'

/** Required services: none — the settings registration is conditional. */
export const inject: string[] = []

// TEMPORARY PROBE (uncommitted): diagnose which settings instance receives the registration.
import { appendFileSync } from 'node:fs'
function probe3(message: string): void {
  try { appendFileSync('/tmp/dsh-ui-attention-probe3.log', new Date().toISOString() + ' ' + message) } catch { /* probe only */ }
}
probe3('module-loaded')

/**
 * Register the attention-alert settings section.
 * @param ctx - host cordis context.
 */
export function apply(ctx: Context): void {
  probe3('apply-called')
  ctx.inject(['settings'], (settingsCtx) => {
    probe3('inject-cb-called')
    try {
      settingsCtx.settings.register(
        settingsNamespace(ATTENTION_SETTINGS_NAMESPACE),
        AttentionSettingsSchema,
      )
      const listed = (settingsCtx.settings.describe() ?? [])
        .map((d: { ns?: string }) => d.ns ?? '?').join(',')
      probe3('register-ok describe-ns=' + listed)
    } catch (error) {
      probe3('register-threw=' + String(error))
    }
  })
}
