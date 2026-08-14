/**
 * Attention engine: pure transition logic over the session list's pending
 * interactions. No DOM, no Notification, no Audio — the plugin wires this
 * machine's actions to platform side effects (T5-T9), keeping every rule
 * unit-testable in isolation.
 */

/** Kind-discriminated pending status as the session list reports it. */
export type PendingStatus = 'approval' | 'plan-review' | 'question'

/** Minimal session-list surface the engine reads (ctx.sessions.list snapshot shape). */
export interface SessionListLike {
  byId: Record<string, { id?: string; pendingInteraction?: PendingStatus } | undefined>
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
