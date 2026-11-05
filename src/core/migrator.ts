import { parseMetadata, hasMetadataBlock, scriptId } from "./metadata.ts";
import type { CompatReport, ScriptRecord } from "./types.ts";

/**
 * Migrator — import a Tampermonkey / Violentmonkey backup, or raw .user.js
 * files, into normalised ScriptSentry records plus a compatibility report.
 * This is the onboarding wedge: "switch in two minutes, keep everything".
 */

export const SUPPORTED_GM_APIS = new Set([
  "GM_setValue", "GM_getValue", "GM_deleteValue", "GM_listValues",
  "GM.setValue", "GM.getValue", "GM.deleteValue", "GM.listValues",
  "GM_addStyle", "GM.addStyle", "GM_addElement", "GM.addElement",
  "GM_xmlhttpRequest", "GM.xmlHttpRequest",
  "GM_registerMenuCommand", "GM.unregisterMenuCommand",
  "GM_notification", "GM_download", "GM.download",
  "GM_openInTab", "GM_setClipboard", "GM.setClipboard",
  "GM_getResourceText", "GM_getResourceURL", "GM_cookie", "GM.cookie",
  "GM_info", "GM.log", "unsafeWindow",
]);

/** APIs that cannot work under Manifest V3 / our runtime, with the reason. */
export const UNSUPPORTED_GM_APIS: Record<string, string> = {
  "GM_webRequest": "Blocking webRequest was removed in Manifest V3; use declarativeNetRequest rules instead.",
  "GM.webRequest": "Blocking webRequest was removed in Manifest V3; use declarativeNetRequest rules instead.",
};

export function findGmApis(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/\b(GM_[A-Za-z]+|GM\.[A-Za-z]+|unsafeWindow)\b/g)) found.add(m[1]);
  return [...found].sort();
}

export function compatReport(record: ScriptRecord): CompatReport {
  const apis = findGmApis(record.source);
  const unsupported = apis
    .filter((a) => a in UNSUPPORTED_GM_APIS || !SUPPORTED_GM_APIS.has(a))
    .map((a) => ({ api: a, reason: UNSUPPORTED_GM_APIS[a] ?? "Not in ScriptSentry's supported GM API set yet (Phase 1)." }));
  return { scriptId: record.id, gmApisUsed: apis, unsupported, ok: unsupported.length === 0 };
}

function toRecord(source: string): ScriptRecord | null {
  const meta = parseMetadata(source);
  if (!meta) return null;
  return { id: scriptId(meta), name: meta.name, namespace: meta.namespace, version: meta.version, source, metadata: meta };
}

export interface ImportResult {
  scripts: ScriptRecord[];
  reports: CompatReport[];
  errors: string[];
}

/**
 * Import from a backup string. Accepts:
 *  (a) JSON: { "scripts": [ { "name": ..., "source"|"text"|"code": ... } ] }
 *      (Tampermonkey/Violentmonkey-style export) — the embedded source is
 *      authoritative; name fields are only used when the source has no block.
 *  (b) Raw .user.js text (single script).
 *  (c) Several .user.js files concatenated with a line of 3+ dashes between
 *      them is NOT guessed at — pass files separately instead.
 */
export function importBackup(input: string): ImportResult {
  const scripts: ScriptRecord[] = [];
  const errors: string[] = [];
  const trimmed = input.trim();

  if (trimmed.startsWith("{")) {
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch { return { scripts: [], reports: [], errors: ["Input looked like JSON but did not parse."] }; }
    const list = (parsed as { scripts?: unknown[] }).scripts;
    if (!Array.isArray(list)) return { scripts: [], reports: [], errors: ["JSON backup has no \"scripts\" array."] };
    list.forEach((item, i) => {
      const obj = item as Record<string, unknown>;
      const source = (obj.source ?? obj.text ?? obj.code) as string | undefined;
      if (typeof source !== "string" || !hasMetadataBlock(source)) {
        errors.push(`Backup entry ${i + 1} (${String(obj.name ?? "unnamed")}) has no usable userscript source — skipped.`);
        return;
      }
      const rec = toRecord(source);
      if (rec) scripts.push(rec);
    });
  } else if (hasMetadataBlock(trimmed)) {
    const rec = toRecord(trimmed);
    if (rec) scripts.push(rec);
  } else {
    errors.push("Input is neither a JSON backup nor a .user.js file (no ==UserScript== block found).");
  }

  return { scripts, reports: scripts.map(compatReport), errors };
}
