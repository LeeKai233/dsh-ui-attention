/**
 * Tab-title flash: alternates a marker prefix over the live document title
 * while pending work is hidden. Every beat re-reads the current title so
 * concurrent writers (the shell's DocumentTitle) flow through untouched;
 * stop() restores the plain title and clears the timer.
 */

/** Marker prepended while flashing. */
export const DEFAULT_FLASH_PREFIX = '(!) '

/** Alternation interval in milliseconds. */
export const DEFAULT_FLASH_INTERVAL_MS = 1000

export interface TitleFlashOptions {
  /** Marker prepended while flashing. */
  prefix?: string
  /** Alternation interval in ms. */
  intervalMs?: number
  /** Read the current document title. */
  getTitle(): string
  /** Write the document title. */
  setTitle(title: string): void
}

export interface TitleFlashHandle {
  /** Whether the flash is currently running. */
  readonly active: boolean
  /** Start flashing (idempotent); writes the prefixed title immediately. */
  start(): void
  /** Stop flashing and restore the plain title (idempotent). */
  stop(): void
}

/**
 * Create a title-flash handle over injectable title accessors.
 * @param options - prefix, interval, and title accessors.
 * @returns the flash handle.
 */
export function createTitleFlash(options: TitleFlashOptions): TitleFlashHandle {
  const prefix = options.prefix ?? DEFAULT_FLASH_PREFIX
  const intervalMs = options.intervalMs ?? DEFAULT_FLASH_INTERVAL_MS
  const { getTitle, setTitle } = options
  let timer: ReturnType<typeof setInterval> | undefined
  const toggle = (): void => {
    const current = getTitle()
    if (current.startsWith(prefix)) setTitle(current.slice(prefix.length))
    else setTitle(prefix + current)
  }
  return {
    get active() {
      return timer !== undefined
    },
    start() {
      if (timer !== undefined) return
      toggle()
      timer = setInterval(toggle, intervalMs)
    },
    stop() {
      if (timer === undefined) return
      clearInterval(timer)
      timer = undefined
      const current = getTitle()
      if (current.startsWith(prefix)) setTitle(current.slice(prefix.length))
    },
  }
}
