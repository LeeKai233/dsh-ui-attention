# dsh-ui-attention

Browser attention alerts for the DeepSeek Harness (DSH) web UI: when an agent
needs you — an `ask_user_question` question, a plan waiting for approval, or a
tool approval — and the page is hidden or in the background, this plugin fires:

1. a **browser notification** (click it to focus the window and open the session),
2. a short **WebAudio beep** (no audio asset needed),
3. a **tab-title flash** (`(!) ` prefix alternating) while the page stays hidden.

It is a dual-face DSH plugin (`dsh.client`, platform `web`) shipped as a tiny
bundle: installing it composes it automatically.

## Install

```sh
dsh plugin --profile web add dsh-ui-attention
# restart dsh web once so the new bundle layer applies
dsh web
```

Or from a local checkout:

```sh
dsh plugin --profile web add file:/path/to/dsh-ui-attention
```

Adding the row to the profile patch layer instead
(`~/.dsh/profiles/web/cordis.patch.yml`) hot-loads the browser plugin into a
running server without a restart:

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

Note: the Host half of the plugin (the `ui-attention` settings namespace
registration) activates on the next server start, so restart `dsh web` once
for the settings switches to persist.

## Usage

- Open **General settings** in the web UI: the **Notifications** row holds four
  switches (Notifications / Sound / Title flash / Background only) and a
  **Send test notification** button.
- Browser notification permission is requested when you click the test button
  (browsers only ask from a user gesture). While permission is `default`, the
  row shows an enable hint and the plugin falls back to sound + title flash.
- Alerts fire per session: the first time a pending interaction appears (or
  its kind changes) at a page-hidden moment. Refreshing or reconnecting does
  not re-alert; resolving the interaction closes its notification and stops
  the title flash.

## Settings

Stored in the Host user-settings document under the `ui-attention` namespace
(all default `true`):

| Field | Meaning |
| --- | --- |
| `enabled` | Master switch: popup, sound, and title flash all stay quiet when false |
| `sound` | Play the WebAudio beep |
| `titleFlash` | Flash the tab title while the page is hidden |
| `onlyWhenHidden` | Alert only when the page is not visible; false alerts in the foreground too |

## FAQ

- **No popup?** Allow notifications for the site in your browser, then click
  the test button once. Denied permission degrades to sound + title.
- **No sound?** Audio playback needs one prior user gesture (autoplay policy);
  the plugin unlocks on the first click/keypress and retries on later gestures.
- **Several tabs open?** Each tab alerts on its own (cross-tab dedupe is not
  possible); keep one DSH tab pinned.
- **Which events alert?** Questions (`ask_user_question`), plan approvals
  (`plan-review` intent), and tool/command approvals (`approval/requested`).

## Development

```sh
pnpm install
pnpm test        # vitest, TDD suite (T1-T13) + artifact smoke
pnpm bundle      # tsdown -> lib/index.js (host) + lib/client.js (browser)
```

Architecture: `attention-engine.ts` is a pure state machine over the session
list's `pendingInteraction` statuses (baseline seeding, once-per-session-status
alerting, hidden-only gating); `notifications.ts`, `beep.ts`, and
`title-flash.ts` are the injectable platform wires; `client/index.ts` assembles
them over `ctx.sessions.list`, `ctx.settingsScope`, and the
`settings.general.item` slot. The Host node half registers the `ui-attention`
settings namespace.

## Uninstall

```sh
dsh plugin --profile web remove dsh-ui-attention
# plus: remove any manual `ui-attention` insert row from ~/.dsh/profiles/web/cordis.patch.yml
# then restart dsh web
```

## License

MIT
