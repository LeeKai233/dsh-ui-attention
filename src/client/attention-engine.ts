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
