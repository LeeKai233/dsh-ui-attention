/**
 * Host node half of the dsh-ui-attention plugin: registers the durable
 * ui-attention settings namespace when the optional settings service is
 * composed (ui-theme's registration precedent); absent settings (TUI,
 * headless profiles) it stays quiet.
 */
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { ATTENTION_SETTINGS_NAMESPACE, AttentionSettingsSchema } from './attention-settings.ts'

export { ATTENTION_SETTINGS_NAMESPACE, AttentionSettingsSchema } from './attention-settings.ts'
export type { AttentionSettings } from './attention-settings.ts'

/** Required services: none — the settings registration is conditional. */
export const inject: string[] = []

/**
 * Register the attention-alert settings section.
 * @param ctx - host cordis context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(ATTENTION_SETTINGS_NAMESPACE),
      AttentionSettingsSchema,
    )
  })
}
