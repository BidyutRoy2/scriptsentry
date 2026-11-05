# Security Policy

## Reporting a vulnerability in ScriptSentry

Please **do not** open a public issue. Instead:

1. Use GitHub's private vulnerability reporting on this repository
   (*Security → Report a vulnerability*), or
2. Contact the maintainer via the GitHub profile of the repository owner.

Include: affected version, browser, reproduction steps, and impact.
We aim to acknowledge within 72 hours and to ship a fix or a documented
mitigation before public disclosure (coordinated disclosure, 90 days max).

## Reporting a malicious userscript

ScriptSentry scans scripts; it is not a blocklist service yet (a verified
marketplace with reporting is Phase 4). If a script is actively malicious,
report it to the repository where you found it (e.g. Greasy Fork) as well —
takedown there protects every manager's users.

## Scope notes

- The scanner is static analysis with known limits — see
  `docs/security-model.md`. A bypass you can demonstrate (a script that
  scores A while doing something the report should catch) **is** a
  security issue for us; please report it as above.
- ScriptSentry collects no telemetry and makes no network calls itself.
