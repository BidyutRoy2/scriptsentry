import { parseMetadata } from "./metadata.ts";
import { scanScript } from "./scanner.ts";

/**
 * Diff Guardian — compares the installed version of a script with a new one
 * BEFORE the update is applied, and answers one question: "is this update
 * safe to accept?" Added permissions and new outbound domains are what turn
 * a benign script into a malicious one, so they drive the verdict.
 */

export interface ScriptDiff {
  addedGrants: string[];
  removedGrants: string[];
  addedMatches: string[];
  removedMatches: string[];
  addedConnectDomains: string[];
  removedConnectDomains: string[];
  addedRequires: string[];
  removedRequires: string[];
  oldSize: number;
  newSize: number;
  sizeDeltaBytes: number;
  sizeDeltaPercent: number;
  linesAdded: number;
  linesRemoved: number;
  sampleAddedLines: string[];
  oldRiskScore: number;
  newRiskScore: number;
  /** newRiskScore - oldRiskScore; negative means the update got RISKIER. */
  riskDelta: number;
  verdict: "safe" | "review" | "risky";
  reasons: string[];
}

const SENSITIVE_GRANTS = [
  "gm_cookie", "gm.cookie", "gm_xmlhttprequest", "gm.xmlhttprequest",
  "gm_download", "gm.download", "gm_setclipboard", "gm.setclipboard",
];

function setDiff(a: string[], b: string[]): { added: string[]; removed: string[] } {
  const A = new Set(a), B = new Set(b);
  return { added: [...B].filter((x) => !A.has(x)), removed: [...A].filter((x) => !B.has(x)) };
}

function lineCounts(oldSource: string, newSource: string) {
  const count = (src: string) => {
    const m = new Map<string, number>();
    for (const l of src.split(/\r?\n/)) { const t = l.trim(); if (t) m.set(t, (m.get(t) ?? 0) + 1); }
    return m;
  };
  const O = count(oldSource), N = count(newSource);
  let added = 0, removed = 0; const samples: string[] = [];
  for (const [line, n] of N) { const d = n - (O.get(line) ?? 0); if (d > 0) { added += d; if (samples.length < 10) samples.push(line.slice(0, 160)); } }
  for (const [line, n] of O) { const d = n - (N.get(line) ?? 0); if (d > 0) removed += d; }
  return { added, removed, samples };
}

export function diffScripts(oldSource: string, newSource: string): ScriptDiff {
  const oldMeta = parseMetadata(oldSource);
  const newMeta = parseMetadata(newSource);
  const g = setDiff(oldMeta?.grants ?? [], newMeta?.grants ?? []);
  const mt = setDiff(
    [...(oldMeta?.matches ?? []), ...(oldMeta?.includes ?? [])],
    [...(newMeta?.matches ?? []), ...(newMeta?.includes ?? [])]);
  const cn = setDiff(oldMeta?.connects ?? [], newMeta?.connects ?? []);
  const rq = setDiff(oldMeta?.requires ?? [], newMeta?.requires ?? []);
  const lc = lineCounts(oldSource, newSource);
  const oldScore = scanScript(oldSource).score;
  const newScore = scanScript(newSource).score;
  const riskDelta = newScore - oldScore;
  const sizeDeltaBytes = newSource.length - oldSource.length;
  const sizeDeltaPercent = oldSource.length ? Math.round((sizeDeltaBytes / oldSource.length) * 100) : 0;

  const reasons: string[] = [];
  let verdict: ScriptDiff["verdict"] = "safe";
  const review = (r: string) => { reasons.push(r); if (verdict === "safe") verdict = "review"; };
  const risky = (r: string) => { reasons.push(r); verdict = "risky"; };

  const sensitiveAdded = g.added.filter((x) => SENSITIVE_GRANTS.includes(x.toLowerCase()));
  if (sensitiveAdded.length) risky(`Update adds sensitive permission(s): ${sensitiveAdded.join(", ")}`);
  else if (g.added.length) review(`Update adds permission(s): ${g.added.join(", ")}`);
  if (cn.added.includes("*")) risky("Update adds @connect * (can contact any domain)");
  else if (cn.added.length) review(`Update can contact new domain(s): ${cn.added.join(", ")}`);
  if (mt.added.some((p) => p.includes("*://*") || p === "<all_urls>")) risky("Update broadens where it runs to every website");
  else if (mt.added.length) review(`Update runs on new site(s): ${mt.added.join(", ")}`);
  if (rq.added.length) review(`Update loads new external librar${rq.added.length > 1 ? "ies" : "y"}: ${rq.added.join(", ")}`);
  if (riskDelta <= -15) risky(`Scanner risk worsened sharply (${oldScore} -> ${newScore})`);
  else if (riskDelta < 0) review(`Scanner risk worsened (${oldScore} -> ${newScore})`);
  if (sizeDeltaPercent >= 100 && sizeDeltaBytes > 2000) review(`Code size grew ${sizeDeltaPercent}% — worth a look before accepting`);
  if (!reasons.length) reasons.push("No new permissions, domains or libraries; scanner risk did not worsen.");

  return {
    addedGrants: g.added, removedGrants: g.removed,
    addedMatches: mt.added, removedMatches: mt.removed,
    addedConnectDomains: cn.added, removedConnectDomains: cn.removed,
    addedRequires: rq.added, removedRequires: rq.removed,
    oldSize: oldSource.length, newSize: newSource.length,
    sizeDeltaBytes, sizeDeltaPercent,
    linesAdded: lc.added, linesRemoved: lc.removed, sampleAddedLines: lc.samples,
    oldRiskScore: oldScore, newRiskScore: newScore, riskDelta,
    verdict, reasons,
  };
}
