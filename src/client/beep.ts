/**
 * WebAudio beep: two short sine tones with no audio asset. The AudioContext
 * is created lazily and unlocked from a user gesture (autoplay policy); a
 * failed resume stays silent and retries on the next gesture.
 */

export interface OscillatorLike {
  type: OscillatorType
  frequency: { setValueAtTime(value: number, time: number): void }
  connect(node: unknown): unknown
  start(time?: number): void
  stop(time?: number): void
}

export interface GainLike {
  gain: {
    setValueAtTime(value: number, time: number): void
    linearRampToValueAtTime(value: number, time: number): void
  }
  connect(node: unknown): unknown
}

export interface AudioContextLike {
  state: string
  currentTime: number
  destination: unknown
  resume(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
}

/** One scheduled tone. */
export interface BeepTone {
  /** Oscillator frequency in Hz. */
  frequency: number
  /** Tone length in milliseconds. */
  durationMs: number
}

/** Default three-tone attention beep (880Hz/120ms + 660Hz/180ms x2 — longer tail cuts through music). */
export const DEFAULT_TONES: readonly BeepTone[] = [
  { frequency: 880, durationMs: 120 },
  { frequency: 660, durationMs: 180 },
  { frequency: 660, durationMs: 180 },
]

/** Silence between the two tones. */
export const DEFAULT_GAP_MS = 80

/**
 * Gesture-unlocked beeper: unlock() from a user gesture arms the context,
 * beep() schedules the tones and stays silent (no throw) whenever the
 * platform still refuses playback.
 */
export class Beeper {
  private context: AudioContextLike | undefined
  private broken = false

  /**
   * @param makeContext - AudioContext factory (window.AudioContext in production).
   * @param tones - tone schedule to play per beep.
   * @param gapMs - silence between consecutive tones.
   */
  constructor(
    private readonly makeContext: () => AudioContextLike,
    private readonly tones: readonly BeepTone[] = DEFAULT_TONES,
    private readonly gapMs: number = DEFAULT_GAP_MS,
  ) {}

  /**
   * Create or resume the context from a user gesture. Failures mark the
   * beeper broken; the next unlock retries.
   */
  unlock(): void {
    if (this.context === undefined) {
      try {
        this.context = this.makeContext()
      } catch {
        this.broken = true
        return
      }
    }
    this.broken = false
    if (this.context.state === 'running') return
    this.context.resume().then(
      () => { this.broken = false },
      () => { this.broken = true },
    )
  }

  /** Play the tone schedule; a no-op (never a throw) while playback is blocked. */
  beep(): void {
    const context = this.ensureRunnable()
    if (context === undefined) return
    const offset = 0.01
    let cursor = context.currentTime + offset
    for (const tone of this.tones) {
      const duration = tone.durationMs / 1000
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(tone.frequency, cursor)
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, cursor)
      gain.gain.linearRampToValueAtTime(0.35, cursor + 0.01)
      gain.gain.linearRampToValueAtTime(0.0001, cursor + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(cursor)
      oscillator.stop(cursor + duration)
      cursor += duration + this.gapMs / 1000
    }
  }

  /** Reuse a running context; create/resume otherwise, retrying after a failure. */
  private ensureRunnable(): AudioContextLike | undefined {
    if (this.context === undefined) {
      this.unlock()
    }
    const context = this.context
    if (context === undefined || this.broken) return undefined
    if (context.state !== 'running') {
      context.resume().catch(() => { this.broken = true })
      return undefined
    }
    return context
  }
}

/** Live AudioContext factory (window.AudioContext / webkit prefix). */
export function browserAudioContextFactory(): () => AudioContextLike {
  return () => {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor === undefined) throw new Error('WebAudio unavailable')
    return new Ctor()
  }
}
