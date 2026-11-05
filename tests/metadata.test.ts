import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMetadata, hasMetadataBlock, scriptId, matchDomains } from "../src/core/metadata.ts";

const SRC = `// ==UserScript==
// @name         My Script
// @namespace    https://example.com/ns
// @version      2.1.0
// @description  Does things
// @match        https://example.com/*
// @match        https://*.example.org/*
// @include      https://example.net/*
// @exclude      https://example.com/admin/*
// @grant        GM_setValue
// @grant        GM.xmlHttpRequest
// @connect      api.example.com
// @require      https://cdn.example.com/lib.js#sha256=abc
// @resource     logo https://example.com/logo.png
// @run-at       document-start
// @noframes
// ==/UserScript==
console.log("hi");
`;

test("parses single-value fields", () => {
  const m = parseMetadata(SRC)!;
  assert.equal(m.name, "My Script");
  assert.equal(m.namespace, "https://example.com/ns");
  assert.equal(m.version, "2.1.0");
  assert.equal(m.description, "Does things");
  assert.equal(m.runAt, "document-start");
  assert.equal(m.noframes, true);
});

test("parses multi-value fields in order", () => {
  const m = parseMetadata(SRC)!;
  assert.deepEqual(m.matches, ["https://example.com/*", "https://*.example.org/*"]);
  assert.deepEqual(m.includes, ["https://example.net/*"]);
  assert.deepEqual(m.excludes, ["https://example.com/admin/*"]);
  assert.deepEqual(m.connects, ["api.example.com"]);
  assert.deepEqual(m.requires, ["https://cdn.example.com/lib.js#sha256=abc"]);
  assert.deepEqual(m.resources, [{ name: "logo", url: "https://example.com/logo.png" }]);
});

test("keeps both GM_* and GM.* grant spellings", () => {
  const m = parseMetadata(SRC)!;
  assert.ok(m.grants.includes("GM_setValue"));
  assert.ok(m.grants.includes("GM.xmlHttpRequest"));
});

test("returns null without a metadata block", () => {
  assert.equal(parseMetadata("console.log(1)"), null);
  assert.equal(hasMetadataBlock("console.log(1)"), false);
  assert.equal(hasMetadataBlock(SRC), true);
});

test("scriptId is a stable slug; matchDomains extracts hosts", () => {
  const m = parseMetadata(SRC)!;
  assert.equal(scriptId(m), "https-example-com-ns-my-script");
  assert.deepEqual(matchDomains(m).sort(), ["*.example.org", "example.com", "example.net"]);
});
