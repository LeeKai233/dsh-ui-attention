/**
 * Durable attention-alert settings contract shared by the Host node half and
 * the browser half. Deliberately schema-free: the schemastery schema lives in
 * attention-schema.ts so the browser bundle never drags the schema library in.
 */

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
  /** Alert only while the page is not on top (hidden or unfocused); false alerts even on top. */
  onlyWhenHidden: boolean
  /** Alert when a session's turn finishes while the page is not on top. */
  notifyOnDone: boolean
}

/** In-memory defaults used while the Host settings scope is still loading. */
export const DEFAULT_ATTENTION_SETTINGS: AttentionSettings = {
  enabled: true,
  sound: true,
  titleFlash: true,
  onlyWhenHidden: true,
  notifyOnDone: true,
}
