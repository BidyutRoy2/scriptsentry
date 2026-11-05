# Web Store submission checklist (MV3)

Read this before submitting anywhere. Each item exists because a real
userscript manager (or a comparable extension) was rejected or broken over
it.

## Chrome Web Store

- [ ] **Remote code: declare "Yes".** In the dashboard, answer *Yes, I am
      using remote code* and justify it precisely: user-supplied userscripts
      are executed **only** through the documented `chrome.userScripts`
      API, are shown in the built-in viewer/editor before install, and run
      only after the user enables them. Never answer "No" while running
      user code — and never load remote JS into extension pages or the
      service worker, or `eval()` fetched strings (Blue Argon).
- [ ] **Allow User Scripts onboarding.** With the per-extension toggle off
      (Chrome 138+; Developer Mode before that), `chrome.userScripts` is
      `undefined`. First run must detect this and walk the user to the
      toggle with screenshots. (Tampermonkey's misleading "Developer mode
      required" banner — issue #2607 — is the cautionary tale.)
- [ ] **Minimal permissions, each justified (≤ dashboard limits):**
      `storage` (script library + history), `userScripts` (the product),
      `alarms` (update checks / future scheduling). `downloads` stays
      *optional*, requested just-in-time. Host access stays in
      `optional_host_permissions` — scripts declare their own sites.
      An unjustified permission (the classic case: `tabs`) is a rejection.
- [ ] **Single purpose.** Listing copy frames one purpose — "run and
      manage user scripts safely" — with the scanner, diffs and rollback
      as facets of it, not separate products.
- [ ] **Privacy disclosure matches reality.** ScriptSentry sends nothing
      anywhere: no analytics, no remote calls from the manager itself.
      When Phase 2 AI features ship, page content flows must be disclosed
      in the listing, the privacy policy AND a first-run in-product notice
      (Limited Use) before that release is submitted — not after.
- [ ] **Registrations on update.** Verify a fresh install AND an upgrade:
      MV3 wipes `userScripts` registrations on extension update; the
      background worker must re-register (it does, on `onInstalled`).
- [ ] **No incentivised reviews, no keyword stuffing, no lookalike
      branding.** Compatibility language ("imports Tampermonkey backups")
      is nominative use; the name, icon and copy must not imply
      affiliation with Tampermonkey, Greasemonkey or Violentmonkey.

## Firefox (AMO)

- [ ] `userScripts` is an **optional runtime permission** on Firefox, with
      Mozilla's "allow unverified third-party scripts" warning surface —
      request it in context, from the onboarding flow, not at install.
- [ ] Submit the WXT-generated source zip; AMO reviews source.

## Safari

Not a build target yet: Safari needs the Xcode wrapper, a paid Apple
Developer account, App Store review, and cannot bypass page CSP. Treat it
as its own track (see docs/roadmap.md, Phase 4).
