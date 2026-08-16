# dsh-ui-attention

Repository: https://github.com/LeeKai233/dsh-ui-attention · npm: https://www.npmjs.com/package/dsh-ui-attention

![npm version](https://img.shields.io/npm/v/dsh-ui-attention) ![license](https://img.shields.io/npm/l/dsh-ui-attention) [![鲸选模板](https://raw.githubusercontent.com/LeeKai233/dsh-whale-picks/main/assets/template-badge.svg)](https://github.com/LeeKai233/dsh-whale-picks/tree/main/templates/plugin)

Web attention alerts for DeepSeek Harness: when the page is not on top, bring what needs you to your eyes.

## What it does

- Questions, plan approvals, and tool approvals fire a browser notification, a beep, and a tab-title flash.
- Finished turns alert the same way, with the session title in the body.
- Clicking a notification opens that session.
- Alerts are composed locally in the browser. No network requests, no changes to session behavior.

## Screenshots

Settings:

![Settings](assets/%E8%AE%BE%E7%BD%AE%E7%95%8C%E9%9D%A2.png)

Notification:

![Notification](assets/%E9%80%9A%E7%9F%A5%E6%A0%B7%E5%BC%8F.png)

## Install

```sh
dsh plugin --profile web add dsh-ui-attention
dsh web
```

Uninstall:

```sh
dsh plugin --profile web remove dsh-ui-attention
```

Do not hand-insert an `ui-attention` row into the profile patch layer, or startup fails with duplicate loader entry id.

## When it alerts

| Page state | Behavior |
| --- | --- |
| Not on top: tab hidden, window minimized, covered by another app | Every event alerts |
| On top and focused | The current session stays quiet; other sessions still alert |

Refreshing never re-alerts. Each turn alerts once.

## Settings

Five switches, stored in the browser, all on by default.

| Switch | Meaning |
| --- | --- |
| Notifications | Master switch |
| Sound | Play the beep |
| Title flash | Flash the tab title while pending work awaits |
| Background only | Applies to the current session: quiet on top; other sessions always alert |
| Turn finished | Alert when a session turn finishes |

## FAQ

- No popup: allow notifications for the site in the browser, then click Send test notification once.
- No sound: the browser requires one user gesture first; the plugin unlocks on the first click or keypress.
- Multiple tabs: each tab alerts on its own; keep one.
- Which events: questions, plan approvals, tool approvals, finished turns.

## Whale picks

Built on the whale-picks plugin template and verified by the whale-picks store gates.

- Store: https://github.com/LeeKai233/dsh-whale-picks
- Template: https://github.com/LeeKai233/dsh-whale-picks/tree/main/templates/plugin
- Developer docs: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## License

MIT
