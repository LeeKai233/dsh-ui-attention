/**
 * Attention engine: pure transition logic over the session list's pending
 * interactions. No DOM, no Notification, no Audio — the plugin wires this
 * machine's actions to platform side effects (T5-T9), keeping every rule
 * unit-testable in isolation.
 */

/** Kind-discriminated pending status as the session list reports it. */
export type PendingStatus = 'approval' | 'plan-review' | 'question'

/** One session-list row as the engine reads it (ctx.sessions.list byId shape). */
export interface SessionRowLike {
  id?: string
  pendingInteraction?: PendingStatus
  running?: boolean
  updatedAt?: number
  origin?: string
}

/** Minimal session-list surface the engine reads (ctx.sessions.list snapshot shape). */
export interface SessionListLike {
  byId: Record<string, SessionRowLike | undefined>
}

/**
 * Extract the sessions currently awaiting the user, in byId order.
 * @param state - session-list snapshot.
 * @returns Map<sessionId, status> containing only rows with a pending interaction.
 */
export function pendingOf(state: SessionListLike): Map<string, PendingStatus> {
  const map = new Map<string, PendingStatus>()
  for (const [id, summary] of Object.entries(state.byId)) {
    if (summary === undefined || summary.pendingInteraction === undefined) continue
    map.set(id, summary.pendingInteraction)
  }
  return map
}

/** One transition set between two pending maps. */
export interface PendingDiff {
  /** Sessions that gained a pending interaction (none -> status). */
  added: Map<string, PendingStatus>
  /** Sessions whose pending status changed (status -> other status). */
  changed: Map<string, PendingStatus>
  /** Sessions whose pending interaction resolved or vanished (status -> none). */
  cleared: Set<string>
}

/**
 * Diff two pending maps into added/changed/cleared transition sets.
 * @param prev - previous pending map.
 * @param next - current pending map.
 * @returns the transition sets (all empty when nothing changed).
 */
export function diffPending(
  prev: Map<string, PendingStatus>, next: Map<string, PendingStatus>,
): PendingDiff {
  const added = new Map<string, PendingStatus>()
  const changed = new Map<string, PendingStatus>()
  const cleared = new Set<string>()
  for (const [id, status] of next) {
    const before = prev.get(id)
    if (before === undefined) added.set(id, status)
    else if (before !== status) changed.set(id, status)
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) cleared.add(id)
  }
  return { added, changed, cleared }
}

/** Side effects the plugin layer executes for one machine step. */
export type AttentionAction =
  | { kind: 'alert'; sessionId: string; status: PendingStatus }
  | { kind: 'dismiss'; sessionId: string }
  | { kind: 'done'; sessionId: string }
  | { kind: 'flash-start' }
  | { kind: 'flash-stop' }

/** Alert-policy settings slice the machine reads. */
export interface AttentionSettingsLike {
  /** Master switch; every alert stays quiet when false. */
  enabled: boolean
  /** Whether the tab-title flash is allowed at all. */
  titleFlash: boolean
  /** Alert only while the page is not on top (hidden or unfocused). */
  onlyWhenHidden: boolean
  /** Alert when a session's turn finishes. */
  notifyOnDone: boolean
}

/** Machine memory carried between steps. */
export interface AttentionMachineState {
  /** Whether the first (baseline) snapshot has been consumed. */
  seeded: boolean
  /** The pending map the machine last saw. */
  pending: Map<string, PendingStatus>
  /** Last status already alerted per session (seed fills it; gated steps leave it stale). */
  alerted: Map<string, PendingStatus>
  /** Running flag the machine last saw, per session (done-edge detection). */
  prevRunning: Map<string, boolean>
  /** updatedAt already alerted as done, per session (one done per turn). */
  doneAlerted: Map<string, number>
  /** Whether the title flash is currently armed. */
  flashing: boolean
}

/** A fresh machine with no baseline. */
export function initialState(): AttentionMachineState {
  return {
    seeded: false, pending: new Map(), alerted: new Map(),
    prevRunning: new Map(), doneAlerted: new Map(), flashing: false,
  }
}

/**
 * Advance the machine one snapshot: seed the baseline on the first call
 * (replay/refresh must not re-alert), then emit one alert per session whose
 * pending status was never alerted at its current value, dismiss alerts for
 * sessions whose pending resolved, emit a done alert for each session whose
 * running flag flipped true -> false (non-subagent, one per turn), and
 * arm/disarm the title flash.
 *
 * Alerting scans the whole pending set rather than the diff, so a transition
 * suppressed while the page was on top alerts once the page leaves the top.
 *
 * @param state - previous machine state.
 * @param snapshot - current session-list snapshot.
 * @param settings - alert-policy settings.
 * @param needsAttention - whether the page is not on top (hidden or unfocused).
 * @returns the next state plus the side-effect actions to execute in order.
 */
export function step(
  state: AttentionMachineState,
  snapshot: SessionListLike,
  settings: AttentionSettingsLike,
  needsAttention: boolean,
): { state: AttentionMachineState; actions: AttentionAction[] } {
  const next = pendingOf(snapshot)
  const actions: AttentionAction[] = []
  const alerted = new Map(state.alerted)
  const prevRunning = new Map(state.prevRunning)
  const doneAlerted = new Map(state.doneAlerted)
  const gated = !settings.enabled || (settings.onlyWhenHidden && !needsAttention)
  const doneAllowed = settings.enabled && settings.notifyOnDone
    && (!settings.onlyWhenHidden || needsAttention)
  for (const [id, row] of Object.entries(snapshot.byId)) {
    if (row === undefined) continue
    const wasRunning = prevRunning.get(id) === true
    const isRunning = row.running === true
    const updatedAt = row.updatedAt ?? 0
    if (state.seeded && wasRunning && !isRunning && row.origin !== 'subagent'
      && doneAllowed && doneAlerted.get(id) !== updatedAt) {
      doneAlerted.set(id, updatedAt)
      actions.push({ kind: 'done', sessionId: id })
    }
    prevRunning.set(id, isRunning)
  }
  if (state.seeded) {
    const diff = diffPending(state.pending, next)
    for (const id of diff.cleared) {
      if (alerted.delete(id)) actions.push({ kind: 'dismiss', sessionId: id })
    }
    for (const [id, status] of next) {
      if (alerted.get(id) !== status && !gated) {
        alerted.set(id, status)
        actions.push({ kind: 'alert', sessionId: id, status })
      }
    }
  } else {
    // Baseline seed: mark everything as already alerted, alert nothing.
    for (const [id, status] of next) alerted.set(id, status)
  }
  const flashing = next.size > 0 && settings.enabled && settings.titleFlash && needsAttention
  if (flashing && !state.flashing) actions.push({ kind: 'flash-start' })
  else if (!flashing && state.flashing) actions.push({ kind: 'flash-stop' })
  return {
    state: { seeded: true, pending: next, alerted, prevRunning, doneAlerted, flashing },
    actions,
  }
}
