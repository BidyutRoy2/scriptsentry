# Roadmap

Honest scope: **v0.1.0 ships Phase 0 + Phase 1 only.** Everything beyond
that is planned, not present, and the README says so.

## Phase 0 — Foundation ✅ (v0.1.0)
- WXT + TypeScript project, Chrome MV3 + Firefox builds
- `chrome.userScripts` registration with Allow-User-Scripts detection and
  guided onboarding; re-register on update/startup
- Dual GM API surface in the parser (`GM_*` and `GM.*`)

## Phase 1 — Trust Pack ✅ (v0.1.0)
- **Security Report** — pre-install static scan, 0–100 score + grade,
  plain-English capabilities, severity-ranked findings
- **Diff Guardian** — every update diffed (grants, matches, connect
  domains, requires, size, risk delta) with a safe / review / risky verdict
  *before* it is applied
- **Version history + rollback** — append-only, nothing overwritten
- **Migrator** — Tampermonkey/Violentmonkey JSON backups + raw `.user.js`,
  with a compatibility report (MV3-unsupported APIs flagged)
- Dashboard + popup, modern dark UI

## Phase 2 — Creation Pack (planned)
- **AI Repair** — on script breakage, capture the error + DOM change (with
  user consent) and propose a reviewable patch diff; rollback built in
- **Guarded AI generation** — describe → script, but always scan-checked,
  permission-minimised and explained before install; BYOK free, hosted
  credits optional
- **X-Ray panel** — per-script log of network requests, DOM mutations,
  storage writes and errors

## Phase 3 — Retention Pack (planned)
- Background + cron-scheduled scripts (ScriptCat parity, better UX)
- Git-backed library (scripts as files in your repo, real history)
- E2E-encrypted sync with timeline restore
- Unified scripts + user styles

## Phase 4 — Expansion (planned)
- **Visual Builder** that compiles point-and-click steps to a readable,
  portable `.user.js` you own
- Verified in-manager marketplace (scan badge, signed versions,
  permission labels)
- Team collections / private registry
- Mobile: Firefox Android first, Safari iOS as its own track

## Explicitly NOT promised
- Full request interception / API body mocking on Chromium — blocking
  `webRequest` is gone in MV3; we will only ship the honest DNR subset.
- "AI script generation" as a headline on its own — Tampermonkey (AI
  autocomplete + MCP), ScriptCat (CAT.agent) and Tweeks already do pieces
  of it. Our difference is the scan → diff → repair loop around it.
