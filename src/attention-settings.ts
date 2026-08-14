/**
 * Durable attention-alert settings shared by the Host schema registration
 * and the browser settings scope (ui-theme's theme-settings.ts precedent).
 */
import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the dsh-ui-attention plugin. */
export const ATTENTION_SETTINGS_NAMESPACE = 'ui-attention'

/** Attention-alert switches persisted in the Host user-settings document. */
export interface AttentionSettings {
  /** Master switch: popup, sound, and title flash all stay quiet when false. */
  enabled: boolean
  /** Play the WebAudio beep. */
  sound: boolean
  /** Flash the tab title while a pending interaction is hidden. */
  titleFlash: boolean
  /** Alert only when the page is not visible; false alerts even in the foreground. */
  onlyWhenHidden: boolean
}

/** Durable settings schema; also the wire envelope the browser scope validates against. */
export const AttentionSettingsSchema: z<AttentionSettings> = z.object({
  enabled: z.boolean().default(true),
  sound: z.boolean().default(true),
  titleFlash: z.boolean().default(true),
  onlyWhenHidden: z.boolean().default(true),
})

/** In-memory defaults used while the Host settings scope is still loading. */
export const DEFAULT_ATTENTION_SETTINGS: AttentionSettings = {
  enabled: true,
  sound: true,
  titleFlash: true,
  onlyWhenHidden: true,
}
