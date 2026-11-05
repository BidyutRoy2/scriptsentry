import { defineBackground } from "wxt/sandbox";
import { registerAll, type StoredScript } from "../src/extension/register.ts";

/**
 * ScriptSentry background service worker.
 *
 * Responsibilities (and only these — MV3 service workers are killed after
 * ~30s idle, so nothing stateful may live here):
 *  1. (Re-)register all enabled scripts with chrome.userScripts.
 *     Registrations are wiped on every extension update, hence onInstalled.
 *  2. React to dashboard/popup messages asking for a re-register.
 * Library + history state lives in chrome.storage.local (see dashboard).
 */

declare const chrome: any;

async function loadLibrary(): Promise<StoredScript[]> {
  try {
    const data = await chrome.storage.local.get("scriptsentry.library.v1");
    const lib = data["scriptsentry.library.v1"];
    return Array.isArray(lib?.scripts) ? lib.scripts : [];
  } catch {
    return [];
  }
}

async function syncRegistrations(): Promise<void> {
  const scripts = await loadLibrary();
  const api = typeof chrome !== "undefined" ? chrome.userScripts : undefined;
  const result = await registerAll(api, scripts);
  if (result.status === "unavailable") {
    console.warn("[ScriptSentry]", result.reason);
    try { await chrome.action.setBadgeText({ text: "!" }); } catch { /* older browsers */ }
  } else {
    try { await chrome.action.setBadgeText({ text: "" }); } catch { /* noop */ }
    console.info(`[ScriptSentry] registered ${result.count} script(s)`);
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => { void syncRegistrations(); });
  chrome.runtime.onStartup.addListener(() => { void syncRegistrations(); });
  chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
    if (msg?.type === "scriptsentry:register") void syncRegistrations();
  });
});
