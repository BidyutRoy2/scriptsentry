# ScriptSentry architecture

## The one legal corridor (Manifest V3)

Under MV3 there is exactly **one** supported way for an extension to run
user-supplied code: the `chrome.userScripts` API. Everything else — `eval()`
of fetched strings, remote `<script>` tags, interpreters in privileged
contexts — is the Chrome Web Store's *Blue Argon* remote-code rejection.
ScriptSentry is built around that corridor and nothing else:

- User code executes **only** via `chrome.userScripts.register()` in
  `USER_SCRIPT` worlds (`src/extension/register.ts`).
- The API is **undefined** until the user enables *Allow User Scripts*
  (Chrome 138+) or Developer Mode. `registerAll()` detects that state and
  returns `{ status: "unavailable", reason }`; the background worker sets a
  `!` badge and the popup/dashboard show guided onboarding. Silent failure
  here is the bug that made Tampermonkey look broken after MV3 (its issue
  #2607) — we treat the toggle flow as a first-class feature.
- Registrations are **cleared on every extension update**, so the
  background worker re-registers everything on `runtime.onInstalled` and
  `runtime.onStartup`, and whenever the dashboard/popup sends
  `scriptsentry:register`.

## Components

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard (entrypoints/dashboard)                            │
│  import (migrator) · Security Report · Diff Guardian ·       │
│  version history + rollback · enable/disable                 │
├──────────────────────────────────────────────────────────────┤
│ Popup (entrypoints/popup)                                    │
│  scripts matching the current tab + trust score + toggle     │
├──────────────────────────────────────────────────────────────┤
│ Background service worker (entrypoints/background)           │
│  registration sync only — stateless by design (MV3 SWs are   │
│  killed after ~30 s idle; no globals, no timers)             │
├──────────────────────────────────────────────────────────────┤
│ Core (src/core) — pure TypeScript, zero dependencies         │
│  metadata.ts  ==UserScript== parser (GM_* and GM.*)          │
│  scanner.ts   Security Report: AST-free static rules,        │
│               0–100 score + grade, plain-English capabilities│
│  diff.ts      Diff Guardian: grants/matches/connects/        │
│               requires, size + line deltas, risk verdict     │
│  history.ts   HistoryStore: append-only versions + rollback  │
│  migrator.ts  Tampermonkey/Violentmonkey backup import +     │
│               compatibility report                           │
│  match.ts     @match pattern matcher for the popup           │
└──────────────────────────────────────────────────────────────┘
```

## Storage design

State lives in one key, `scriptsentry.library.v1`, in
`chrome.storage.local`:

```jsonc
{
  "scripts": [ /* StoredScript: ScriptRecord + enabled */ ],
  "history": { /* HistoryStore.toJSON(): scriptId -> StoredVersion[] */ }
}
```

`HistoryStore` is storage-agnostic (in-memory + `toJSON`/`fromJSON`), so it
can move to IndexedDB later without API changes, and tests drive it
directly. **Invariant: a save never overwrites.** Installs, updates, edits
and rollbacks all append revisions; a rollback appends the restored source
as a new revision instead of rewriting history.

## Scheduling (future)

`alarms` is already in the manifest for Phase 3 background/cron work.
Service-worker timers are never used for anything that must survive.

## Cross-browser

WXT builds `chrome-mv3` and `firefox-mv2` targets from the same source
(both verified for v0.1.0). Firefox's `userScripts` API is an optional,
runtime-requested permission — the registration layer is isolated in
`src/extension/register.ts` so per-browser adapters land there. Safari is a
separate workstream (Xcode wrapper, App Store), deliberately not a build
flag; see the roadmap.
