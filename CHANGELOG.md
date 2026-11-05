# Changelog

All notable changes to ScriptSentry are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/), versions use SemVer.

## [Unreleased]

## [0.1.0] — 2026-11-06

First public release: Phase 0 (foundation) + Phase 1 (Trust Pack).

### Added
- WXT + TypeScript extension: Chrome MV3 and Firefox builds from one codebase.
- `chrome.userScripts` registration layer with Allow-User-Scripts detection,
  guided onboarding, and re-registration on install/startup/update.
- Metadata parser for the `==UserScript==` block — `@name`, `@namespace`,
  `@version`, `@match/@include/@exclude`, `@grant` in both `GM_*` and `GM.*`
  spellings, `@connect`, `@require/@resource`, `@run-at`, `@noframes`.
- **Security Report**: static scanner with 15 rules (broad match, eval,
  crypto-mining markers, `@connect *`, GM_xmlhttpRequest, undeclared fetch
  targets, cookie access, clipboard, downloads, form/password reading,
  web storage, unpinned `@require`, obfuscation heuristics, missing
  metadata) producing a 0–100 score, grade, plain-English capabilities and
  severity-ranked findings.
- **Diff Guardian**: pre-update diff of grants, matches, connect domains,
  requires, code size, line changes and scanner risk, with a
  safe / review / risky verdict.
- **Version history + rollback**: append-only `HistoryStore`; rollbacks are
  themselves recorded as new revisions.
- **Migrator**: Tampermonkey/Violentmonkey JSON backups and raw `.user.js`
  import, with a compatibility report flagging MV3-unsupported APIs.
- Dashboard (import, reports, diff preview, history, source view) and popup
  (scripts on the current tab with trust scores and toggles).
- CLI smoke tool: `node scripts/scan.ts <file>` (and two files for a diff).
- Examples: a benign dark-mode script (scanner: **100/100 A**) and a clearly
  labelled risky test fixture (scanner: **0/100 F**) — do not install the latter.
- 32 unit tests (parser, scanner, diff, history, migrator, matcher,
  registration), zero-dependency runner (`node --test`).

### Known limitations
- Firefox registers scripts through its own `userScripts` permission flow;
  see docs/architecture.md.
- No background/cron scripts, sync, AI features or marketplace yet — those
  are Phases 2–4 in docs/roadmap.md, not hidden stubs.
