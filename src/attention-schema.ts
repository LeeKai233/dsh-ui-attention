/**
 * Host-side settings schema for the ui-attention namespace. Kept apart from
 * attention-settings.ts: the browser bundle must not import schemastery (the
 * client bundle purity rules inline or forbid non-platform packages), while
 * the Host node half resolves it through the profile flat fallback.
 */
import z from '@deepseek-ai/schemastery'
import type { AttentionSettings } from './attention-settings.ts'

/** Durable settings schema; also the wire envelope the browser scope validates against. */
export const AttentionSettingsSchema: z<AttentionSettings> = z.object({
  enabled: z.boolean().default(true),
  sound: z.boolean().default(true),
  titleFlash: z.boolean().default(true),
  onlyWhenHidden: z.boolean().default(true),
})
