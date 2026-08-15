# dsh-ui-attention

Repository: https://github.com/LeeKai233/dsh-ui-attention — npm: https://www.npmjs.com/package/dsh-ui-attention

![npm version](https://img.shields.io/npm/v/dsh-ui-attention) ![license](https://img.shields.io/npm/l/dsh-ui-attention)

Browser attention alerts for the DeepSeek Harness (DSH) web UI. Whenever the
DSH page is **not on top** — the tab is hidden, the window is minimized, or
another application covers it (document.hidden or !document.hasFocus()) — and
something happens, this plugin fires:

1. a **browser notification** (click it to focus the window and open the session),
2. a short **WebAudio beep** (no audio asset needed),
3. a **tab-title flash** (`(!) ` prefix alternating) while pending work awaits.

It alerts on two event kinds: pending interactions (an `ask_user_question`
question, a plan waiting for approval, or a tool approval) and **finished
turns** (any session's turn ending), each once per turn with the session title
in the body. While the page is on top and focused, everything stays quiet.

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

Then restart `dsh web` once: the bundle layer (and the plugin's Host half,
which registers the `ui-attention` settings namespace) applies at boot.

### Standalone install without `dsh plugin`

As an ALTERNATIVE (not in addition!) to the bundle route, you can copy the
package into `~/.dsh/profiles/web/node_modules/` and insert the row into the
profile patch layer (`~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

> **Do not do both.** `insert` rows are not deduplicated by id across layers:
> the same `id: ui-attention` coming from the bundle patch AND the profile
> patch makes the loader refuse to boot with
> `duplicate loader entry id: ui-attention`. Pick exactly one composition
> route.

## Usage

- Open **General settings** in the web UI: the **Notifications** row holds five
  iOS-style switches (Notifications / Sound / Title flash / Background only /
  Turn finished) and a **Send test notification** button.
- **When do alerts fire?** Two rules:
  1. While the DSH page is not on top — tab hidden, window minimized, or
     another application covers it — every event alerts (pending interactions
     and finished turns alike).
  2. While the page is on top and focused, the CURRENT session stays quiet
     (its question/approval card is right in front of you) — but events from
     ANY OTHER session still alert, so a background task that needs you is
     never missed while you chat elsewhere.
- Two event kinds alert: pending interactions (a question, a plan approval, or
  a tool approval) and **finished turns** (any session's running flip), each
  once per turn, with the session title in the body; clicking a notification
  focuses the window and opens the session.
- Browser notification permission is requested when you click the test button
  (browsers only ask from a user gesture). While permission is `default`, the
  row shows an enable hint and the plugin falls back to sound + title flash.
- Refreshing or reconnecting does not re-alert; resolving the interaction
  closes its notification and stops the title flash.

## Settings

The five switches (all default true) persist in the browser under the
localStorage key dsh-ui-attention.settings:

| Field | Meaning |
| --- | --- |
| enabled | Master switch: popup, sound, and title flash all stay quiet when false |
| sound | Play the WebAudio beep |
| titleFlash | Flash the tab title while pending work is hidden |
| onlyWhenHidden | Applies to the CURRENT session: stay quiet while on top; other sessions always alert (false alerts even the current session on top) |
| notifyOnDone | Pop up and beep when a session's turn finishes |

Why browser-local instead of the Host settings document: the rc.6 web API
gateway only exposes a hardcoded allowlist of settings namespaces to the
browser (WEB_SETTINGS_NAMESPACES in packages/host/apiproxy/src/api-proxy.ts)
and answers settings-not-exposed for anything else — exposing third-party
namespaces via settings.register() is documented as deferred work. The Host
node half still registers the ui-attention namespace server-side so the
section lights up automatically once that upstream limitation is lifted.

## FAQ

- **No popup?** Allow notifications for the site in your browser, then click
  the test button once. Denied permission degrades to sound + title.
- **Working in session B while session A needs me — why no popup before?**
  Fixed: events from NON-current sessions always alert, even while the page is
  on top. Only the session you are currently viewing stays quiet on top.
- **Page covered by another app but no alert?** The plugin treats "on top
  and focused" as "you are looking at it" for the current session. Turn off
  **Background only** to alert even the current session while on top.
- **No sound?** Audio playback needs one prior user gesture (autoplay policy);
  the plugin unlocks on the first click/keypress and retries on later gestures.
- **Several tabs open?** Each tab alerts on its own (cross-tab dedupe is not
  possible); keep one DSH tab pinned.
- **Which events alert?** Questions (`ask_user_question`), plan approvals
  (`plan-review` intent), tool/command approvals (`approval/requested`), and
  finished turns (any session's running flip).

## Requirements

- DeepSeek Harness 0.1.0-rc.6 or newer (the plugin reads the session list's
  pendingInteraction statuses and the settings.general.item slot)
- the web profile (`dsh --profile web`)
- a browser with notifications allowed for the DSH origin (click the test
  button once to grant permission)

## Publishing

Published on npm as `dsh-ui-attention` (MIT). Future versions:

```sh
npm version patch          # or minor / major
pnpm bundle && pnpm test
npm publish                # --otp=<code> when the account enforces 2FA
```

The tarball ships the prebuilt lib/ plus the bundle patch, so consumers never
need a build step.

## Development

```sh
pnpm install
pnpm test        # vitest, TDD suite (T1-T17) + built-artifact smoke
pnpm bundle      # tsdown -> lib/index.js (host) + lib/client.js (browser)
```

Architecture: `attention-engine.ts` is a pure state machine over the session
list (pending-interaction statuses plus running-edge turn-finished detection,
baseline seeding, per-turn dedupe, page-not-on-top gating); `notifications.ts`,
`beep.ts`, and `title-flash.ts` are the injectable platform wires;
`client/index.ts` assembles them over `ctx.sessions.list` and the
`settings.general.item` slot, persisting the switches in localStorage via the
runtime snapshot-store engine. The Host node half registers the
`ui-attention` settings namespace for future compatibility.

## Uninstall

```sh
dsh plugin --profile web remove dsh-ui-attention
# plus: remove any manual `ui-attention` insert row from ~/.dsh/profiles/web/cordis.patch.yml
# then restart dsh web
```

## License

MIT
