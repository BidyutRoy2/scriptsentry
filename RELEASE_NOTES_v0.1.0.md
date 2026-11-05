# ScriptSentry v0.1.0 — Trust Pack

**See what a script does, before it does it.**

First public release of the fully open-source (GPL-3.0), trust-first
userscript manager.

## What's in

- **Security Report for every script** — 0–100 trust score, plain-English
  capabilities, severity-ranked findings (broad match, eval, cookie access,
  password-form reading, mining markers, obfuscation, unpinned @require…).
- **Diff Guardian** — updates are diffed (permissions, domains, libraries,
  risk) and verdicted *safe / review / risky* before you accept them.
- **Version history + one-click rollback** — nothing is ever overwritten.
- **Migrator** — bring your Tampermonkey / Violentmonkey backup with you;
  MV3-incompatible APIs are flagged in a compatibility report.
- **Chrome MV3 + Firefox builds** (WXT + TypeScript), honest
  Allow-User-Scripts onboarding, modern dark dashboard + popup.
- 32 passing unit tests; the bundled safe example scans **100/100 A**, the
  labelled risky fixture scans **0/100 F**.

## Try it in 10 seconds (no install)

```bash
npm test
node scripts/scan.ts examples/risky.user.js
```

## Not in this release (roadmap, honestly)

AI Repair (Phase 2), Git/E2E sync + background scripts (Phase 3), Visual
Builder + verified marketplace (Phase 4). See docs/roadmap.md.

## Install

Build from source (above) and load `.output/chrome-mv3` unpacked, then
enable **Allow User Scripts** for ScriptSentry in chrome://extensions.
Store submission notes live in docs/store-submission.md.
