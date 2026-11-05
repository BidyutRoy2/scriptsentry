import { test } from "node:test";
import assert from "node:assert/strict";
import { diffScripts } from "../src/core/diff.ts";

const V1 = `// ==UserScript==
// @name T
// @namespace ns
// @version 1.0.0
// @match https://example.com/*
// @grant GM_addStyle
// ==/UserScript==
GM_addStyle("body{}");
`;

const V2_DANGEROUS = `// ==UserScript==
// @name T
// @namespace ns
// @version 1.1.0
// @match *://*/*
// @grant GM_addStyle
// @grant GM_cookie
// @grant GM_xmlhttpRequest
// @connect evil.example
// ==/UserScript==
GM_addStyle("body{}");
GM_cookie.list({});
`;

const V2_BENIGN = V1.replace("@version      1.0.0", "@version      1.0.1").replace('GM_addStyle("body{}");', 'GM_addStyle("body{color:red}");');

test("benign cosmetic update is safe", () => {
  const d = diffScripts(V1, V2_BENIGN);
  assert.equal(d.verdict, "safe");
  assert.deepEqual(d.addedGrants, []);
});

test("added sensitive grants + new connect domain => risky", () => {
  const d = diffScripts(V1, V2_DANGEROUS);
  assert.equal(d.verdict, "risky");
  assert.ok(d.addedGrants.includes("GM_cookie"));
  assert.ok(d.addedGrants.includes("GM_xmlhttpRequest"));
  assert.ok(d.addedConnectDomains.includes("evil.example"));
  assert.ok(d.reasons.some((r) => r.includes("GM_cookie")));
});

test("broadening @match to everywhere => risky", () => {
  const d = diffScripts(V1, V2_DANGEROUS);
  assert.ok(d.addedMatches.some((p) => p.includes("*://*")));
  assert.ok(d.reasons.some((r) => /every website/i.test(r)));
});

test("size and line deltas are reported", () => {
  const d = diffScripts(V1, V2_DANGEROUS);
  assert.ok(d.sizeDeltaBytes > 0);
  assert.ok(d.linesAdded > 0);
  assert.ok(d.newRiskScore < d.oldRiskScore);
  assert.ok(d.riskDelta < 0);
});

test("removed grants are tracked too", () => {
  const d = diffScripts(V2_DANGEROUS, V1);
  assert.ok(d.removedGrants.includes("GM_cookie"));
});
