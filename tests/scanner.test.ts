import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scanScript } from "../src/core/scanner.ts";

const safe = readFileSync(new URL("../examples/safe.user.js", import.meta.url), "utf8");
const risky = readFileSync(new URL("../examples/risky.user.js", import.meta.url), "utf8");
const rules = (src: string) => scanScript(src).findings.map((f) => f.rule);

test("safe example scores high (A/B, >= 90)", () => {
  const r = scanScript(safe);
  assert.ok(r.score >= 90, `safe score was ${r.score}`);
  assert.ok(["A", "B"].includes(r.grade));
  assert.equal(r.findings.filter((f) => f.severity === "critical" || f.severity === "high").length, 0);
});

test("risky example scores low (< 40)", () => {
  const r = scanScript(risky);
  assert.ok(r.score < 40, `risky score was ${r.score}`);
});

test("risky example triggers the headline rules", () => {
  const fired = rules(risky);
  for (const rule of ["broad-match", "eval", "connect-star", "document-cookie", "clipboard", "download", "require-no-sri", "remote-fetch", "form-reading", "web-storage", "crypto-mining"]) {
    assert.ok(fired.includes(rule), `expected rule ${rule} to fire, got: ${fired.join(",")}`);
  }
});

test("capabilities are plain English and mention everywhere + cookies", () => {
  const r = scanScript(risky);
  assert.ok(r.capabilities.some((c) => c.includes("EVERY website")));
  assert.ok(r.capabilities.some((c) => /cookie/i.test(c)));
});

test("narrow @match + pinned @require produces no broad/require findings", () => {
  const src = `// ==UserScript==
// @name T
// @namespace ns
// @version 1.0.0
// @match https://example.com/*
// @require https://cdn.example.com/lib.js#sha256=deadbeef
// @grant none
// ==/UserScript==
document.title = "x";`;
  const fired = rules(src);
  assert.ok(!fired.includes("broad-match"));
  assert.ok(!fired.includes("require-no-sri"));
});

test("obfuscation heuristics fire on packed code", () => {
  const src = `// ==UserScript==
// @name T
// @namespace ns
// @version 1.0.0
// @match https://example.com/*
// ==/UserScript==
var _0xaaaa11=1,_0xbbbb22=2,_0xcccc33=3,_0xdddd44=_0xaaaa11+_0xbbbb22;`;
  assert.ok(rules(src).includes("obfuscation"));
});

test("missing metadata block is reported, not crashed on", () => {
  const r = scanScript("alert(1)");
  assert.ok(r.findings.some((f) => f.rule === "no-metadata"));
});
