/**
 * Notification wire layer: owns the browser Notification construction and the
 * per-session registry lifecycle. The attention engine emits alert/dismiss
 * actions; this module translates them into platform calls and degrades
 * quietly whenever permission is missing, denied, or the API is absent.
 */
import type { PendingStatus } from './attention-engine.ts'

/** Platform permission states plus the no-API sentinel. */
export type NotificationPermission = 'granted' | 'denied' | 'default'
export type PermissionState = NotificationPermission | 'unavailable'

/** The Notification surface this module touches (injectable for tests). */
export interface NotificationLike {
  title: string
  body: string
  tag: string
  onclick: ((this: Notification, ev: Event) => unknown) | null
  onclose: ((this: Notification, ev: Event) => unknown) | null
  close(): void
}

/** Platform face: permission, request, create, and window focus. */
export interface NotificationEnv {
  permission: PermissionState
  requestPermission(): Promise<NotificationPermission>
  create(title: string, options: { body?: string; tag?: string }): NotificationLike
  focusWindow(): void
}

/** One alert's localized copy. */
export interface NotificationCopy {
  title: string
  body: string
}

/** Resolve the localized copy for a pending status. */
export type CopyForStatus = (status: PendingStatus) => NotificationCopy

/**
 * Registry-backed notifier: at most one live browser notification per
 * session (same tag replaces the previous one), closed when the machine
 * reports the interaction resolved, and clicked notifications focus the
 * window and open the owning session.
 */
export class AttentionNotifier {
  private readonly shown = new Map<string, NotificationLike>()

  /**
   * @param env - platform Notification face.
   * @param copy - status -> localized copy.
   * @param onOpen - session opener invoked when a notification is clicked.
   */
  constructor(
    private readonly env: NotificationEnv,
    private readonly copy: CopyForStatus,
    private readonly onOpen: (sessionId: string) => void,
  ) {}

  /** Current platform permission (or 'unavailable' without the API). */
  get permission(): PermissionState {
    return this.env.permission
  }

  /**
   * Show one alert; returns false (degraded: caller falls back to sound+title)
   * whenever the platform cannot pop a notification.
   * @param sessionId - owning session.
   * @param status - pending status choosing the copy.
   */
  show(sessionId: string, status: PendingStatus): boolean {
    return this.showWith(sessionId, this.copy(status))
  }

  /**
   * Show an alert with an explicit copy (the wire layer composes the session
   * title into the body), still registered per session.
   * @param sessionId - owning session.
   * @param _status - pending status (kept for symmetry; the copy already encodes it).
   * @param copy - localized title/body.
   * @returns whether the platform accepted it.
   */
  showWithCopy(sessionId: string, _status: PendingStatus, copy: NotificationCopy): boolean {
    return this.showWith(sessionId, copy)
  }

  /**
   * Show a done alert for one session with the provided copy; registered,
   * dismissed, and click-opened exactly like a pending alert.
   * @param sessionId - owning session.
   * @param copy - localized title/body.
   * @returns whether the platform accepted it.
   */
  showDone(sessionId: string, copy: NotificationCopy): boolean {
    return this.showWith(sessionId, copy)
  }

  /**
   * Shared show path: replace any live notification for the session with a
   * new one carrying the given copy; construction failures degrade to false.
   * @param sessionId - owning session.
   * @param copy - title/body to show.
   * @returns whether the platform accepted it.
   */
  private showWith(sessionId: string, copy: NotificationCopy): boolean {
    if (this.env.permission !== 'granted') return false
    const previous = this.shown.get(sessionId)
    if (previous !== undefined) {
      this.shown.delete(sessionId)
      try {
        previous.close()
      } catch {
        // A stale handle failing to close is not an alert failure.
      }
    }
    let notification: NotificationLike
    try {
      notification = this.env.create(copy.title, { body: copy.body, tag: 'dsh-attention:' + sessionId })
    } catch {
      return false
    }
    notification.onclick = () => {
      this.shown.delete(sessionId)
      try {
        notification.close()
      } catch {
        // Already closed by the platform.
      }
      this.env.focusWindow()
      this.onOpen(sessionId)
    }
    this.shown.set(sessionId, notification)
    return true
  }

  /** Close (if shown) the notification for one session; safe for unknown ids. */
  dismiss(sessionId: string): void {
    const notification = this.shown.get(sessionId)
    if (notification === undefined) return
    this.shown.delete(sessionId)
    try {
      notification.close()
    } catch {
      // Already closed by the platform.
    }
  }

  /** Close every live notification. */
  dismissAll(): void {
    for (const sessionId of [...this.shown.keys()]) this.dismiss(sessionId)
  }

  /** Ask the browser for permission (call from a user gesture). */
  async requestPermission(): Promise<NotificationPermission> {
    return this.env.requestPermission()
  }

  /**
   * Show an unregistered one-shot notification (the settings-row test button).
   * @param copy - title/body to show.
   * @param tag - notification tag.
   * @returns whether the platform accepted it.
   */
  showCustom(copy: NotificationCopy, tag: string): boolean {
    if (this.env.permission !== 'granted') return false
    let notification: NotificationLike
    try {
      notification = this.env.create(copy.title, { body: copy.body, tag })
    } catch {
      return false
    }
    notification.onclick = () => {
      try {
        notification.close()
      } catch {
        // Already closed by the platform.
      }
      this.env.focusWindow()
    }
    return true
  }
}

/**
 * Live platform face bound to window.Notification when it exists.
 * @returns an env, or undefined when the API is absent.
 */
export function browserNotificationEnv(): NotificationEnv | undefined {
  if (typeof Notification === 'undefined') return undefined
  return {
    get permission(): PermissionState {
      return Notification.permission
    },
    requestPermission: () => Notification.requestPermission(),
    create: (title, options) => new Notification(title, options),
    focusWindow: () => {
      window.focus()
    },
  }
}
