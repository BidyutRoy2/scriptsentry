/**
 * CLI smoke tool: scan a .user.js file and print its Security Report.
 * Usage: node scripts/scan.ts <file.user.js> [--json]
 * (Node >= 22 runs this TypeScript directly; no build step needed.)
 */
import { readFileSync } from "node:fs";
import { scanScript } from "../src/core/scanner.ts";
import { diffScripts } from "../src/core/diff.ts";

const args = process.argv.slice(2);
if (args.length < 1) { console.error("usage: node scripts/scan.ts <file.user.js> [other.user.js]"); process.exit(2); }
const [a, b] = args;
const sourceA = readFileSync(a, "utf8");
if (b) {
  const d = diffScripts(sourceA, readFileSync(b, "utf8"));
  console.log(JSON.stringify(d, null, 2));
} else {
  const r = scanScript(sourceA);
  console.log(`Score: ${r.score}/100  Grade: ${r.grade}`);
  console.log("Capabilities:");
  for (const c of r.capabilities) console.log(`  - ${c}`);
  console.log("Findings:");
  for (const f of r.findings) console.log(`  [${f.severity.toUpperCase()}] ${f.title} — ${f.detail}`);
  if (!r.findings.length) console.log("  (none)");
}
