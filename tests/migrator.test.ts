import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importBackup } from "../src/core/migrator.ts";

const safe = readFileSync(new URL("../examples/safe.user.js", import.meta.url), "utf8");

test("imports a raw .user.js file", () => {
  const r = importBackup(safe);
  assert.equal(r.scripts.length, 1);
  assert.equal(r.scripts[0].name, "Example: Gentle Dark Mode");
  assert.equal(r.errors.length, 0);
  assert.equal(r.reports[0].ok, true);
});

test("imports a JSON backup {scripts:[{name, source}]}", () => {
  const backup = JSON.stringify({ scripts: [{ name: "x", source: safe }] });
  const r = importBackup(backup);
  assert.equal(r.scripts.length, 1);
  assert.equal(r.scripts[0].version, "1.0.0");
});

test("compat report flags GM_webRequest as unsupported under MV3", () => {
  const src = safe.replace("@grant        GM_addStyle", "@grant        GM_addStyle\n// @grant        GM_webRequest") + "\nGM_webRequest({});";
  const r = importBackup(src);
  assert.equal(r.reports[0].ok, false);
  assert.ok(r.reports[0].unsupported.some((u) => u.api === "GM_webRequest"));
  assert.ok(r.reports[0].gmApisUsed.includes("GM_addStyle"));
});

test("bad entries are skipped with errors, good ones still import", () => {
  const backup = JSON.stringify({ scripts: [{ name: "broken", source: "no block here" }, { name: "ok", source: safe }] });
  const r = importBackup(backup);
  assert.equal(r.scripts.length, 1);
  assert.equal(r.errors.length, 1);
});

test("garbage input produces an error, not a crash", () => {
  const r = importBackup("hello world");
  assert.equal(r.scripts.length, 0);
  assert.ok(r.errors.length >= 1);
});
