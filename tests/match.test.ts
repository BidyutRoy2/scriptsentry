import { test } from "node:test";
import assert from "node:assert/strict";
import { urlMatchesPattern, scriptMatchesUrl } from "../src/core/match.ts";

test("@match basics: exact host, wildcard path, scheme mismatch", () => {
  assert.ok(urlMatchesPattern("https://example.com/page", "https://example.com/*"));
  assert.ok(!urlMatchesPattern("http://example.com/page", "https://example.com/*"));
  assert.ok(!urlMatchesPattern("https://other.com/page", "https://example.com/*"));
});

test("wildcard host and subdomain patterns", () => {
  assert.ok(urlMatchesPattern("https://a.b.co/x", "*://*/*"));
  assert.ok(urlMatchesPattern("https://sub.example.com/x", "*://*.example.com/*"));
  assert.ok(urlMatchesPattern("https://example.com/x", "*://*.example.com/*"));
  assert.ok(urlMatchesPattern("https://anything.example/x", "<all_urls>"));
});

test("excludes win over matches", () => {
  assert.ok(!scriptMatchesUrl(["https://example.com/*"], [], ["https://example.com/admin/*"], "https://example.com/admin/panel"));
  assert.ok(scriptMatchesUrl(["https://example.com/*"], [], ["https://example.com/admin/*"], "https://example.com/home"));
});
