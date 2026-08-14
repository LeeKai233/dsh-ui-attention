/** T9: tab-title flash — prefix alternation, restore, idempotent start/stop. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTitleFlash } from '../src/client/title-flash.ts'

describe('createTitleFlash', () => {
  let title = ''
  const getTitle = (): string => title
  const setTitle = (next: string): void => { title = next }

  beforeEach(() => {
    vi.useFakeTimers()
    title = 'DSH'
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the prefixed title immediately on start', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    flash.start()
    expect(title).toBe('(!) DSH')
  })

  it('alternates between prefixed and plain every interval, re-reading the title', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    flash.start()
    vi.advanceTimersByTime(1000)
    expect(title).toBe('DSH')
    // A concurrent writer (DocumentTitle) changed the base between beats.
    title = 'Session A — DSH'
    vi.advanceTimersByTime(1000)
    expect(title).toBe('(!) Session A — DSH')
    vi.advanceTimersByTime(1000)
    expect(title).toBe('Session A — DSH')
  })

  it('start is idempotent', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    flash.start()
    flash.start()
    vi.advanceTimersByTime(1000)
    expect(title).toBe('DSH')
    vi.advanceTimersByTime(1000)
    expect(title).toBe('(!) DSH')
  })

  it('stop restores the plain title and halts alternation', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    flash.start()
    vi.advanceTimersByTime(1000)
    expect(title).toBe('DSH')
    flash.stop()
    vi.advanceTimersByTime(5000)
    expect(title).toBe('DSH')
    expect(flash.active).toBe(false)
  })

  it('stop also strips a currently-prefixed title', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    flash.start()
    expect(title).toBe('(!) DSH')
    flash.stop()
    expect(title).toBe('DSH')
  })

  it('stop without start is a no-op', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    expect(() => { flash.stop() }).not.toThrow()
    expect(title).toBe('DSH')
  })

  it('reports active only while flashing', () => {
    const flash = createTitleFlash({ getTitle, setTitle })
    expect(flash.active).toBe(false)
    flash.start()
    expect(flash.active).toBe(true)
    flash.stop()
    expect(flash.active).toBe(false)
  })
})
