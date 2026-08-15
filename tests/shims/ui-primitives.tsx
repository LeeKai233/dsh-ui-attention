/**
 * Test shim for '@deepseek-ai/dsh-client-ui-primitives': the real package's
 * root index pulls the markdown/katex chain (CSS imports) into vitest; the
 * plugin only uses FishLogo, which is replaced by a tiny inline SVG.
 */

/** Brand-logo stand-in rendering a simple fish glyph. */
export function FishLogo(_props: { size?: number; className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={_props.size ?? 24} height={_props.size ?? 24} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
