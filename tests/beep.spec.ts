/** T8: WebAudio beep — tones, lazy AudioContext, gesture unlock with retry. */
import { describe, expect, it, vi } from 'vitest'
import { Beeper } from '../src/client/beep.ts'
import type { AudioContextLike, GainLike, OscillatorLike } from '../src/client/beep.ts'

interface Scheduled { freq: number; start: number; stop: number }

function fakeOscillator(): OscillatorLike & Scheduled {
  const osc: Scheduled & { frequency: OscillatorLike['frequency']; connect: unknown; start: unknown; stop: unknown } = {
    freq: 0, start: 0, stop: 0,
    type: 'sine',
    frequency: { setValueAtTime: (v: number) => { osc.freq = v } },
    connect: vi.fn(),
    start: (t: number) => { osc.start = t },
    stop: (t: number) => { osc.stop = t },
  }
  return osc
}

function fakeGain(): GainLike {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }
}

function makeContext(overrides: Partial<AudioContextLike> = {}): AudioContextLike & { oscillators: OscillatorLike[] } {
  const oscillators: OscillatorLike[] = []
  const context = {
    state: 'running' as string,
    currentTime: 10,
    resume: vi.fn(async () => { context.state = 'running' }),
    close: vi.fn(async () => {}),
    createOscillator: vi.fn(() => {
      const osc = fakeOscillator()
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => fakeGain()),
    destination: {},
    ...overrides,
  }
  return { ...context, oscillators }
}

describe('Beeper', () => {
  it('schedules the three default tones back to back', () => {
    const context = makeContext()
    const beeper = new Beeper(() => context)
    beeper.unlock()
    beeper.beep()
    const oscs = context.oscillators as (OscillatorLike & Scheduled)[]
    expect(oscs).toHaveLength(3)
    expect(oscs[0]?.freq).toBe(880)
    expect(oscs[0]?.start).toBeCloseTo(10.01)
    expect(oscs[0]?.stop).toBeCloseTo(10.01 + 0.12)
    expect(oscs[1]?.freq).toBe(660)
    expect(oscs[1]?.start).toBeCloseTo(10.01 + 0.12 + 0.08)
    expect(oscs[2]?.freq).toBe(660)
    expect(oscs[2]?.start).toBeCloseTo(10.01 + 0.12 + 0.08 + 0.18 + 0.08)
  })

  it('creates the AudioContext lazily on the first unlock', () => {
    const make = vi.fn(() => makeContext())
    const beeper = new Beeper(make)
    expect(make).not.toHaveBeenCalled()
    beeper.unlock()
    expect(make).toHaveBeenCalledTimes(1)
    beeper.unlock()
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('resumes a suspended context on unlock', () => {
    const context = makeContext({ state: 'suspended' })
    const beeper = new Beeper(() => context)
    beeper.unlock()
    expect(context.resume).toHaveBeenCalled()
  })

  it('does not resume an already-running context', () => {
    const context = makeContext({ state: 'running' })
    const beeper = new Beeper(() => context)
    beeper.unlock()
    expect(context.resume).not.toHaveBeenCalled()
    beeper.beep()
    expect(context.resume).not.toHaveBeenCalled()
  })

  it('stays silent without throwing when the context cannot be created', () => {
    const beeper = new Beeper(() => { throw new Error('AudioContext blocked') })
    expect(() => { beeper.unlock() }).not.toThrow()
    expect(() => { beeper.beep() }).not.toThrow()
  })

  it('skips tones when resume fails and retries on the next unlock', async () => {
    const context = makeContext({ state: 'suspended' })
    context.resume = vi.fn(async () => { throw new Error('autoplay blocked') })
    const beeper = new Beeper(() => context)
    beeper.unlock()
    beeper.beep()
    expect(context.createOscillator).not.toHaveBeenCalled()
    // Next gesture retries resume (and now succeeds).
    context.resume = vi.fn(async () => { context.state = 'running' })
    beeper.unlock()
    beeper.beep()
    expect(context.createOscillator).toHaveBeenCalled()
  })
})
