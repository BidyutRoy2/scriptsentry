import { test } from "node:test";
import assert from "node:assert/strict";
import { HistoryStore } from "../src/core/history.ts";

const v = (ver: string, body: string) => `// ==UserScript==
// @name T
// @namespace ns
// @version ${ver}
// ==/UserScript==
${body}`;

test("save appends revisions and never overwrites", () => {
  const h = new HistoryStore(() => "2026-11-06T00:00:00.000Z");
  h.save("s", v("1.0.0", "a"), "install");
  h.save("s", v("1.1.0", "b"), "update");
  assert.equal(h.count("s"), 2);
  assert.equal(h.list("s")[0].version, "1.0.0");
  assert.equal(h.latest("s")!.version, "1.1.0");
  assert.notEqual(h.list("s")[0].hash, h.list("s")[1].hash);
});

test("rollback returns previous source and appends it as a new revision", () => {
  const h = new HistoryStore();
  h.save("s", v("1.0.0", "original"), "install");
  h.save("s", v("2.0.0", "broken"), "update");
  const restored = h.rollback("s");
  assert.ok(restored!.includes("original"));
  assert.equal(h.count("s"), 3);
  assert.equal(h.latest("s")!.origin, "rollback");
  assert.ok(h.latest("s")!.source.includes("original"));
});

test("rollback with a single version returns null", () => {
  const h = new HistoryStore();
  h.save("s", v("1.0.0", "only"), "install");
  assert.equal(h.rollback("s"), null);
});

test("rollbackTo restores a specific revision; JSON round-trip preserves history", () => {
  const h = new HistoryStore();
  h.save("s", v("1.0.0", "one"), "install");
  h.save("s", v("1.1.0", "two"), "update");
  h.save("s", v("1.2.0", "three"), "update");
  const restored = h.rollbackTo("s", 1);
  assert.ok(restored!.includes("one"));
  const copy = HistoryStore.fromJSON(JSON.parse(JSON.stringify(h.toJSON())));
  assert.equal(copy.count("s"), h.count("s"));
  assert.equal(copy.latest("s")!.hash, h.latest("s")!.hash);
});
