# Security model

## What ScriptSentry is (and is not)

ScriptSentry runs **other people's code** in your browser — that is what a
userscript manager is. Our job is not to pretend that is safe; it is to make
the risk **visible, diffable and reversible**:

1. **Visible** — every script gets a Security Report before it runs:
   where it runs, what it can read, where it can send data, whether its
   code is obfuscated, scored 0–100 with severity-ranked findings.
2. **Diffable** — updates are the supply-chain attack. The Diff Guardian
   compares grants, matches, connect domains and external libraries
   between the installed and incoming version and gives a verdict before
   anything changes.
3. **Reversible** — every version is kept. Any update can be rolled back
   in one click, including updates that arrived before you noticed them.

## Scanner rules (v0.1.0)

Implemented in `src/core/scanner.ts` (pure static analysis, nothing
executes):

| Rule | Severity | What it catches |
|---|---|---|
| broad-match | high | `@match *://*/*` or `<all_urls>` |
| eval | critical | `eval()` / `new Function()` |
| crypto-mining | critical | CoinHive/CryptoNight/XMRig-style markers, mining pools |
| connect-star | high | `@connect *` |
| gm-xhr | medium | `GM_xmlhttpRequest` / `GM.xmlHttpRequest` usage |
| remote-fetch | medium | `fetch`/XHR to domains not declared in `@connect` |
| cookie-api | high | `GM_cookie` / `GM.cookie` |
| document-cookie | high | direct `document.cookie` reads |
| clipboard | medium | `GM_setClipboard` / clipboard writes |
| download | medium | `GM_download` |
| form-reading | high/medium | password-field access, form/input reading |
| web-storage | low | `localStorage` / `sessionStorage` access |
| require-no-sri | medium | `@require` without a `#sha256=` integrity pin |
| obfuscation | high | `_0x` identifiers, >1000-char lines, high-entropy strings, packed string arrays |
| no-metadata | medium | missing `==UserScript==` block |

Scoring: start at 100; critical −35, high −20, medium −10, low −4.
Grades: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F < 40.

## Honest limits

- Static analysis **cannot prove a script is safe**. A clean score means
  "none of the known bad patterns were found", not "trust this with your
  bank". Obfuscated code is scored down precisely because it defeats
  review.
- The scanner itself is open source (GPL-3.0) — if you disagree with a
  rule, read it, and please send a better one.
- ScriptSentry collects **no telemetry**. There is no analytics code in
  this repository; verify it by searching the source.

## Reporting vulnerabilities

See [SECURITY.md](../SECURITY.md). Never open a public issue for a
vulnerability in ScriptSentry itself.
