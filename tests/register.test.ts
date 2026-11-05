import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRegistrations, registerAll } from "../src/extension/register.ts";
import { parseMetadata } from "../src/core/metadata.ts";

const SRC = `// ==UserScript==
// @name T
// @namespace ns
// @version 1.0.0
// @match https://example.com/*
// @run-at document-start
// ==/UserScript==
console.log(1);`;
const meta = parseMetadata(SRC)!;
const rec = { id: "ns-t", name: "T", namespace: "ns", version: "1.0.0", source: SRC, metadata: meta, enabled: true };

test("buildRegistrations skips disabled scripts and maps fields", () => {
  const regs = buildRegistrations([rec, { ...rec, id: "off", enabled: false }]);
  assert.equal(regs.length, 1);
  const r0 = regs[0] as { matches: string[]; world: string; runAt: string };
  assert.deepEqual(r0.matches, ["https://example.com/*"]);
  assert.equal(r0.world, "USER_SCRIPT");
  assert.equal(r0.runAt, "document_start");
});

test("registerAll reports unavailable when userScripts API is missing (toggle off)", async () => {
  const res = await registerAll(undefined, [rec]);
  assert.equal(res.status, "unavailable");
  if (res.status === "unavailable") assert.ok(res.reason.includes("Allow User Scripts"));
});

test("registerAll replaces existing registrations", async () => {
  const calls: string[] = [];
  const fake = {
    getScripts: async () => { calls.push("get"); return [{ id: "old" }]; },
    unregister: async () => { calls.push("unregister"); },
    register: async () => { calls.push("register"); },
  };
  const res = await registerAll(fake, [rec]);
  assert.equal(res.status, "registered");
  assert.deepEqual(calls, ["get", "unregister", "register"]);
});
