# DEVELOPMENT.md — dsh-ui-attention developer docs

## Documented exemptions (paradigm trial subject)

This repo is the whale-picks paradigm's trial subject. When running
--structure / template-sync from dsh-whale-picks/scripts, the following
deliberate exemptions are the comparison baseline (everything else is
template-aligned):

1. **Settings persistence** uses the runtime snapshot-store engine
   (defineStore from @deepseek-ai/dsh-client-runtime/client) instead of the
   template's plain localStorage store — extension point 4, idiom 2.
2. **tsdown PLATFORM_MODULES** adds @deepseek-ai/dsh-client-ui-attachment and
   @deepseek-ai/dsh-client-schema-form beyond the template core — the template
   ships the full inventory and asks plugins to trim; this plugin's client
   imports exactly these.
3. **devDependencies** add @deepseek-ai/dsh-client-ui-primitives,
   @deepseek-ai/dsh-client-ui-settings and @testing-library/react (component
   tests) beyond the template baseline.
4. The **tests/shims** directory originated here and was merged back into the
   template — now aligned by construction.

## Build and test

```sh
pnpm install
pnpm test        # vitest: T1-T21 TDD suite + built-artifact smoke
pnpm bundle      # tsdown -> lib/index.js (host) + lib/client.js (browser)
```

## Architecture

- attention-engine.ts: a pure state machine over the session list. Pending
  interaction statuses plus running-edge turn-finished detection; baseline
  seeding; per-turn dedupe; per-session gating (not-on-top alerts everything;
  on top, the current session stays quiet while other sessions still alert).
- notifications.ts / beep.ts / title-flash.ts: injectable platform wires.
- client/index.ts: assembly over ctx.sessions.list and the settings.general.item slot.
- settings-store.ts: switches persisted to localStorage via the runtime snapshot-store engine.
- The host node half registers the ui-attention settings namespace for future compatibility.

## Why browser-local settings

The switches live in browser localStorage instead of the Host settings
document: the rc.6 web API gateway exposes only a hardcoded settings namespace
allowlist to the browser (WEB_SETTINGS_NAMESPACES in
packages/host/apiproxy/src/api-proxy.ts) and answers settings-not-exposed for
anything else; moving the exposure declaration into settings.register() is
documented deferred work. The host node half still registers the namespace so
the section lights up once the upstream limitation is lifted.

## Publishing

Published on npm as dsh-ui-attention (MIT). Future versions:

```sh
npm version patch          # or minor / major
pnpm bundle && pnpm test
npm publish                # add --otp=<code> when the account enforces 2FA
```

The tarball ships the prebuilt lib/ plus the bundle patch, so consumers never
need a build step.

## Standalone install without dsh plugin

As an ALTERNATIVE to the bundle route (never both): copy the package into
~/.dsh/profiles/web/node_modules/ and insert this row into the profile patch
layer ~/.dsh/profiles/web/cordis.patch.yml:

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

insert rows are not deduplicated by id across layers: the bundle patch and the
profile patch providing the same id make the loader refuse to boot with
duplicate loader entry id. Pick exactly one route.

## Requirements

- DeepSeek Harness 0.1.0-rc.6 or newer (reads the session list's
  pendingInteraction statuses and the settings.general.item slot)
- the web profile (dsh --profile web)
- a browser with notifications allowed for the DSH origin
