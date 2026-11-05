# Contributing to ScriptSentry

Thanks for helping build the trust-first userscript manager. 🎉

## Ground rules

1. **The core stays pure.** `src/core/` has zero dependencies and no DOM /
   `chrome.*` / Node APIs. If a feature needs the browser, it belongs in
   `src/extension/` or an entrypoint, behind an injectable interface.
2. **No silent overwrites — anywhere.** Data-loss bugs are the reason this
   project exists. New storage code must append or version, never clobber.
3. **No new manifest permission without a written justification** in
   `docs/store-submission.md` and a line in the PR template checklist.
4. **Honest scope.** If it isn't shipped, the README/roadmap must not imply
   it is. No placeholder stubs presented as features.

## Development

```bash
npm install
npm test            # 32 tests, node --test (Node >= 22)
npx wxt prepare     # generate .wxt types (once, and after adding entrypoints)
npm run compile     # tsc --noEmit
npm run build       # WXT build → .output/chrome-mv3
npm run dev         # WXT dev mode with HMR
```

## Scanner rules

Adding a rule? It needs: a finding with a plain-English explanation a
non-coder can act on, a unit test where the rule fires, and a test proving
the safe example still scores ≥ 90. Update the table in
`docs/security-model.md`.

## Pull requests

- One topic per PR; describe the user-visible change first.
- Update `CHANGELOG.md` under *Unreleased*.
- By contributing you agree your work is licensed GPL-3.0.
