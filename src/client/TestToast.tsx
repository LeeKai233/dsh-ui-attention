/**
 * In-page test popup styled after the Windows toast notification: 360px card,
 * 24px app icon (DSH FishLogo), 15px semibold title, 12px body, top-right close,
 * hairline border and soft shadow. Purely presentational; only the test button
 * opens it — the goal is a screenshotable stand-in for the real system toast.
 */
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'

export interface TestToastProps {
  title: string
  body: string
  closeLabel: string
  onClose(): void
}

const TOAST: CSSProperties = {
  position: 'fixed', right: 20, bottom: 20, zIndex: 1000,
  display: 'flex', alignItems: 'flex-start', gap: 12, width: 360, padding: 16,
  background: 'var(--dsw-alias-bg-layer-1)',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.14)',
  font: 'inherit',
}
const TOAST_ICON: CSSProperties = { flex: 'none', marginTop: 1 }
const TOAST_TEXT: CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }
const TOAST_TITLE: CSSProperties = {
  fontSize: 15, fontWeight: 600, lineHeight: '20px', color: 'var(--dsw-alias-label-primary)',
}
const TOAST_BODY: CSSProperties = {
  fontSize: 12, fontWeight: 400, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)',
}
const TOAST_CLOSE: CSSProperties = {
  flex: 'none', width: 20, height: 20, padding: 0, margin: '-2px -6px 0 0',
  border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  font: 'inherit', fontSize: 14, lineHeight: 1, color: 'var(--dsw-alias-label-secondary)',
}

/**
 * Render the Windows-toast-style test card at the page level.
 * @param props - localized copy and close callback.
 * @returns the portal element.
 */
export function TestToast({ title, body, closeLabel, onClose }: TestToastProps) {
  return createPortal(
    <div style={TOAST} role="dialog" aria-label={title} data-dsh-attention-toast="">
      <span style={TOAST_ICON} aria-hidden="true"><FishLogo size={24} /></span>
      <div style={TOAST_TEXT}>
        <div style={TOAST_TITLE}>{title}</div>
        <div style={TOAST_BODY}>{body}</div>
      </div>
      <button type="button" style={TOAST_CLOSE} aria-label={closeLabel} onClick={onClose}>×</button>
    </div>,
    document.body,
  )
}
