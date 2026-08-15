/**
 * In-page test popup: a fixed notification-style card rendered on document.body
 * so the plugin's behavior stays screenshotable even when the OS-level system
 * notification is hidden or skipped. Purely presentational; only the test
 * button opens it.
 */
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface TestToastProps {
  title: string
  body: string
  closeLabel: string
  onClose(): void
}

const TOAST: CSSProperties = {
  position: 'fixed', right: 20, bottom: 20, zIndex: 1000,
  display: 'flex', flexDirection: 'column', gap: 4, width: 320, padding: '12px 14px',
  background: 'var(--dsw-alias-bg-layer-1)',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderLeft: '3px solid var(--dsw-alias-state-business-primary)',
  borderRadius: 10, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  font: 'inherit',
}
const TOAST_TITLE: CSSProperties = {
  fontSize: 14, fontWeight: 600, lineHeight: '22px', color: 'var(--dsw-alias-label-primary)',
}
const TOAST_BODY: CSSProperties = {
  fontSize: 12, fontWeight: 400, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)',
}
const TOAST_CLOSE: CSSProperties = {
  alignSelf: 'flex-end', marginTop: 6, padding: '2px 8px',
  border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer',
  font: 'inherit', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)',
}

/**
 * Render the test notification card at the page level.
 * @param props - localized copy and close callback.
 * @returns the portal element.
 */
export function TestToast({ title, body, closeLabel, onClose }: TestToastProps) {
  return createPortal(
    <div style={TOAST} role="dialog" aria-label={title}>
      <div style={TOAST_TITLE}>{title}</div>
      <div style={TOAST_BODY}>{body}</div>
      <button type="button" style={TOAST_CLOSE} aria-label={closeLabel} onClick={onClose}>{closeLabel}</button>
    </div>,
    document.body,
  )
}
